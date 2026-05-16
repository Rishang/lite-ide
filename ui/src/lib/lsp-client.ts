// Minimal LSP client that connects Monaco to language servers via WebSocket JSON-RPC

const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST || (typeof window !== 'undefined' ? `ws://${window.location.host}` : 'ws://localhost:3000')

// Languages that have LSP support on the backend
const LSP_LANGUAGES = ['python', 'go', 'rust', 'bash', 'java', 'c', 'cpp', 'typescript', 'javascript'] as const
type LspLanguage = typeof LSP_LANGUAGES[number]

function isLspLanguage(lang: string): lang is LspLanguage {
  return (LSP_LANGUAGES as readonly string[]).includes(lang)
}

interface JsonRpcMessage {
  jsonrpc: '2.0'
  id?: number
  method?: string
  params?: any
  result?: any
  error?: any
}

class LspClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()
  private initialized = false
  private uri: string = ''
  private lang: string
  private disposables: { dispose: () => void }[] = []
  private monaco: any
  private buffer = ''

  constructor(private language: string, private filePath: string, private monacoInstance: any, private serverName?: string) {
    this.lang = language
    this.monaco = monacoInstance
    this.uri = `file://${filePath}`
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      const url = `${WS_HOST}/lsp?lang=${this.lang}${this.serverName ? `&server=${this.serverName}` : ''}`
      this.ws = new WebSocket(url)

      this.ws.onopen = async () => {
        try {
          await this.initialize()
          this.initialized = true
          resolve(true)
        } catch {
          resolve(false)
        }
      }

      this.ws.onmessage = (event) => {
        this.buffer += event.data
        this.processBuffer()
      }

      this.ws.onerror = () => resolve(false)
      this.ws.onclose = () => { this.initialized = false }

      setTimeout(() => resolve(false), 5000)
    })
  }

  private processBuffer() {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) return

      const header = this.buffer.substring(0, headerEnd)
      const match = header.match(/Content-Length:\s*(\d+)/i)
      if (!match) {
        this.buffer = this.buffer.substring(headerEnd + 4)
        continue
      }

      const contentLength = parseInt(match[1])
      const bodyStart = headerEnd + 4
      if (this.buffer.length < bodyStart + contentLength) return

      const body = this.buffer.substring(bodyStart, bodyStart + contentLength)
      this.buffer = this.buffer.substring(bodyStart + contentLength)

      try {
        const msg: JsonRpcMessage = JSON.parse(body)
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!
          this.pending.delete(msg.id)
          if (msg.error) reject(msg.error)
          else resolve(msg.result)
        }
        // Handle server notifications (diagnostics)
        if (msg.method === 'textDocument/publishDiagnostics' && msg.params) {
          this.handleDiagnostics(msg.params)
        }
      } catch { /* ignore parse errors */ }
    }
  }

  private send(method: string, params: any, isNotification = false): Promise<any> | void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return isNotification ? undefined : Promise.reject('not connected')

    const msg: JsonRpcMessage = { jsonrpc: '2.0', method, params }

    if (!isNotification) {
      const id = ++this.requestId
      msg.id = id
      const body = JSON.stringify(msg)
      const header = `Content-Length: ${new TextEncoder().encode(body).length}\r\n\r\n`
      this.ws.send(header + body)
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject })
        setTimeout(() => {
          if (this.pending.has(id)) {
            this.pending.delete(id)
            reject('timeout')
          }
        }, 10000)
      })
    }

    const body = JSON.stringify(msg)
    const header = `Content-Length: ${new TextEncoder().encode(body).length}\r\n\r\n`
    this.ws.send(header + body)
  }

  private async initialize() {
    await this.send('initialize', {
      processId: null,
      capabilities: {
        textDocument: {
          completion: { completionItem: { snippetSupport: true } },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          publishDiagnostics: { relatedInformation: true },
        },
      },
      rootUri: `file://${this.filePath.substring(0, this.filePath.lastIndexOf('/'))}`,
    })
    this.send('initialized', {}, true)
  }

  didOpen(content: string) {
    if (!this.initialized) return
    this.send('textDocument/didOpen', {
      textDocument: { uri: this.uri, languageId: this.lang, version: 1, text: content },
    }, true)
  }

  didChange(content: string, version: number) {
    if (!this.initialized) return
    this.send('textDocument/didChange', {
      textDocument: { uri: this.uri, version },
      contentChanges: [{ text: content }],
    }, true)
  }

  async completion(line: number, character: number): Promise<any> {
    if (!this.initialized) return null
    return this.send('textDocument/completion', {
      textDocument: { uri: this.uri },
      position: { line, character },
    })
  }

  async hover(line: number, character: number): Promise<any> {
    if (!this.initialized) return null
    return this.send('textDocument/hover', {
      textDocument: { uri: this.uri },
      position: { line, character },
    })
  }

  private handleDiagnostics(params: { uri: string; diagnostics: any[] }) {
    const monaco = this.monaco
    const model = monaco.editor.getModels().find((m: any) => m.uri.toString() === params.uri || m.uri.path === this.filePath)
    if (!model) return

    const markers = params.diagnostics.map((d: any) => ({
      severity: d.severity === 1 ? monaco.MarkerSeverity.Error
        : d.severity === 2 ? monaco.MarkerSeverity.Warning
        : monaco.MarkerSeverity.Info,
      message: d.message,
      startLineNumber: (d.range?.start?.line ?? 0) + 1,
      startColumn: (d.range?.start?.character ?? 0) + 1,
      endLineNumber: (d.range?.end?.line ?? 0) + 1,
      endColumn: (d.range?.end?.character ?? 0) + 1,
      source: d.source || 'lsp',
    }))
    monaco.editor.setModelMarkers(model, 'lsp', markers)
  }

  registerProviders() {
    const monaco = this.monaco
    const self = this

    // Completion provider
    const completionDisposable = monaco.languages.registerCompletionItemProvider(this.lang, {
      triggerCharacters: ['.', ':', '/', '@', '<'],
      async provideCompletionItems(model: any, position: any) {
        if (!model.uri.path.endsWith(self.filePath) && model.uri.toString() !== self.uri) return { suggestions: [] }
        const result = await self.completion(position.lineNumber - 1, position.column - 1)
        if (!result) return { suggestions: [] }

        const items = Array.isArray(result) ? result : result.items || []
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        return {
          suggestions: items.map((item: any) => ({
            label: item.label || item.insertText || '',
            kind: item.kind || monaco.languages.CompletionItemKind.Text,
            insertText: item.insertText || item.label || '',
            detail: item.detail,
            documentation: item.documentation,
            range,
          })),
        }
      },
    })
    this.disposables.push(completionDisposable)

    // Hover provider
    const hoverDisposable = monaco.languages.registerHoverProvider(this.lang, {
      async provideHover(model: any, position: any) {
        if (!model.uri.path.endsWith(self.filePath) && model.uri.toString() !== self.uri) return null
        const result = await self.hover(position.lineNumber - 1, position.column - 1)
        if (!result || !result.contents) return null

        const contents = Array.isArray(result.contents)
          ? result.contents.map((c: any) => ({ value: typeof c === 'string' ? c : c.value || '' }))
          : [{ value: typeof result.contents === 'string' ? result.contents : result.contents.value || '' }]

        return { contents }
      },
    })
    this.disposables.push(hoverDisposable)
  }

  dispose() {
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
    if (this.ws) {
      this.send('shutdown', null)?.then(() => {
        this.send('exit', null, true)
        this.ws?.close()
      }).catch(() => this.ws?.close())
    }
    this.initialized = false
  }
}

// Active LSP connections per file
const activeClients = new Map<string, LspClient>()

// Languages that need multiple servers
const MULTI_SERVER: Record<string, string[]> = {
  python: ['pyright', 'ruff'],
}

export function connectLsp(monaco: any, filePath: string, language: string, content: string): (() => void) | null {
  if (!isLspLanguage(language)) return null

  // Don't use LSP for JS/TS since Monaco's built-in TS service is better with addExtraLib
  if (language === 'typescript' || language === 'javascript') return null

  const serverNames = MULTI_SERVER[language] || [undefined]
  const disconnects: (() => void)[] = []

  for (const serverName of serverNames) {
    const key = `${language}:${serverName || 'default'}:${filePath}`
    if (activeClients.has(key)) continue

    const client = new LspClient(language, filePath, monaco, serverName)
    activeClients.set(key, client)

    client.connect().then((ok) => {
      if (ok) {
        client.registerProviders()
        client.didOpen(content)
      } else {
        activeClients.delete(key)
      }
    })

    disconnects.push(() => {
      client.dispose()
      activeClients.delete(key)
    })
  }

  if (disconnects.length === 0) return null
  return () => disconnects.forEach(d => d())
}

export function notifyLspChange(filePath: string, language: string, content: string, version: number) {
  const serverNames = MULTI_SERVER[language] || [undefined]
  for (const serverName of serverNames) {
    const key = `${language}:${serverName || 'default'}:${filePath}`
    const client = activeClients.get(key)
    if (client) client.didChange(content, version)
  }
}

export { isLspLanguage }
