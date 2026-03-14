'use client'

import { useEffect, useRef, Suspense } from 'react'
import { LazyMonacoEditor, LoadingScreen } from './MonacoEditor'
import { getLanguageFromPath } from '@/lib/common'

export interface MarkerData {
  severity: number   // monaco.MarkerSeverity: Error=8, Warning=4, Info=2, Hint=1
  message: string
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
  source?: string
  code?: string | { value: string; target: { toString(): string } }
}

interface EditorProps {
  content: string
  path: string
  language?: string
  theme?: string
  onChange: (value: string) => void
  onSave: () => void
  onMarkersChange?: (markers: MarkerData[]) => void
}

export function Editor({ content, path, language, theme = 'vs-dark', onChange, onSave, onMarkersChange }: EditorProps) {
  const editorRef = useRef<any>(null)
  const onMarkersChangeRef = useRef(onMarkersChange)
  onMarkersChangeRef.current = onMarkersChange

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        onSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSave])

  const getLanguage = (path: string) => {
    if (language) return language
    return getLanguageFromPath(path)
  }

  useEffect(() => {
    if (editorRef.current && language && (window as any).monaco) {
      const model = editorRef.current.getModel()
      if (model) {
        (window as any).monaco.editor.setModelLanguage(model, language)
      }
    }
  }, [language])

  return (
    <div className="h-full w-full min-h-0 min-w-0 flex-1 bg-[#1e1e1e]">
      <Suspense fallback={<LoadingScreen />}>
        <div className="h-full w-full pb-8">
          <LazyMonacoEditor
            height="100%"
            defaultLanguage={getLanguage(path)}
            value={content}
            onChange={(value: string) => onChange(value || '')}
            onMount={(editor: any, monaco: any) => {
              editorRef.current = editor

              // Emit markers (diagnostics) whenever they change for this model
              const emitMarkers = () => {
                const model = editor.getModel()
                if (!model || !onMarkersChangeRef.current) return
                const markers: MarkerData[] = monaco.editor.getModelMarkers({ resource: model.uri })
                onMarkersChangeRef.current(markers)
              }

              // Listen for model marker changes on the editor
              const disposable = editor.onDidChangeModelDecorations(() => {
                // Markers update slightly after decorations; defer one tick
                setTimeout(emitMarkers, 0)
              })

              editor._markerDisposable = disposable
            }}
            options={{
              minimap: {
                enabled: true,
                side: 'right',
                size: 'proportional',
                showSlider: 'mouseover',
                renderCharacters: true,
                maxColumn: 120
              },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: true,
              smoothScrolling: true,
              cursorBlinking: 'blink',  // VSCode default
              cursorSmoothCaretAnimation: 'off',  // Less smooth, like VSCode
              renderLineHighlight: 'all',
              bracketPairColorization: { enabled: true },
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              autoClosingDelete: 'always',
              autoClosingOvertype: 'always',
              autoSurround: 'quotes',
              tabSize: 2,
              insertSpaces: true,
              detectIndentation: true,
              wordWrap: 'on',
              wrappingIndent: 'indent',
              folding: true,
              showFoldingControls: 'always',
              foldingHighlight: true,
              foldingStrategy: 'auto',
              links: true,
              colorDecorators: true,
              lightbulb: { enabled: true },
              codeActionsOnSave: {},
              formatOnPaste: true,
              formatOnType: true,
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: 'on',
              snippetSuggestions: 'top',
              emptySelectionClipboard: false,
              copyWithSyntaxHighlighting: true,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
              overviewRulerLanes: 0,
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              renderWhitespace: 'selection',
              guides: {
                bracketPairs: true,
                indentation: true,
              },
              unicodeHighlight: {
                ambiguousCharacters: false,
                invisibleCharacters: false,
              },
              accessibilitySupport: 'auto',
              mouseWheelZoom: true,
              multiCursorModifier: 'alt',
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
              parameterHints: {
                enabled: true,
                cycle: false,
              },
              autoIndent: 'full',
              formatOnSave: false,
              tabCompletion: 'on',
              wordBasedSuggestions: 'off',
              suggest: {
                localityBonus: true,
                shareSuggestSelections: true,
                showIcons: true,
                maxVisibleSuggestions: 12,
                showKeywords: true,
                showSnippets: true,
                showClasses: true,
                showFunctions: true,
                showVariables: true,
                showModules: true,
                showProperties: true,
                showEvents: true,
                showOperators: true,
                showUnits: true,
                showValues: true,
                showConstants: true,
                showEnums: true,
                showEnumMembers: true,
                showColors: true,
                showFiles: true,
                showReferences: true,
                showFolders: true,
                showTypeParameters: true,
                showWords: true,
              },
            }}
          />
        </div>
      </Suspense>
    </div>
  )
} 