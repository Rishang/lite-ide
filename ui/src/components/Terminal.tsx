'use client'

import { useEffect, useRef } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal as XTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { config } from '@/utils/config'

export function Terminal() {
  const termRef = useRef<HTMLDivElement | null>(null)
  const terminal = useRef<XTerminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!termRef.current || terminal.current) {
      return
    }

    const term = new XTerminal({
      cursorBlink: true,
      theme: {
        background: '#1f2329',
        foreground: '#abb2bf',
        cursor: '#abb2bf',
        cursorAccent: '#1f2329',
        selectionBackground: '#343b47',
        black: '#171b21',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#abb2bf',
      },
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Ubuntu Mono", monospace',
      lineHeight: 1,
      letterSpacing: 0,
      allowTransparency: false,
      scrollback: 5000,
      rows: 24,
      cols: 80,
    })
    terminal.current = term

    const fit = new FitAddon()
    fitAddon.current = fit
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(termRef.current)

    // Delay fit to ensure container is properly sized
    setTimeout(() => {
      if (termRef.current && termRef.current.offsetParent !== null) {
        fit.fit()
      }
    }, 100)

    // Focus the terminal after opening
    term.focus()

    const handleResize = () => {
      // Debounce window resize events
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }

      resizeTimeoutRef.current = setTimeout(() => {
        if (termRef.current && termRef.current.offsetParent !== null && fitAddon.current) {
          try {
            fitAddon.current.fit()
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows
              }))
            }
          } catch (error) {
            console.warn('Terminal resize error:', error)
          }
        }
      }, 100)
    }
    window.addEventListener('resize', handleResize)

    // Use config WebSocket host for terminal connection
    const url = `${config.wsHost}/terminal`
    const socket = new WebSocket(url)
    socket.binaryType = 'arraybuffer'
    socketRef.current = socket

    socket.onopen = () => {
      // term.writeln('Connected to terminal')
      const initialSize = { cols: term.cols, rows: term.rows }
      socket.send(JSON.stringify({ type: 'resize', ...initialSize }))
    }

    socket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(event.data)
        const text = new TextDecoder('utf-8').decode(uint8Array)
        term.write(text)
      } else if (typeof event.data === 'string') {
        term.write(event.data)
      } else if (event.data instanceof Blob) {
        event.data.arrayBuffer().then(buffer => {
          const uint8Array = new Uint8Array(buffer)
          const text = new TextDecoder('utf-8').decode(uint8Array)
          term.write(text)
        })
      }
    }

    socket.onerror = (err) => {
      term.writeln('\r\nConnection error.')
    }

    socket.onclose = () => {
      term.writeln('\r\nConnection closed.')
    }

    term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data)
      }
    })

    term.onResize((size) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'resize', ...size }))
      }
    })

    // Re-focus when clicked, but only if not already focused
    const handleClick = () => {
      const textarea = termRef.current?.querySelector('textarea') as HTMLTextAreaElement
      if (textarea && document.activeElement !== textarea) {
        term.focus()
      }
    }
    termRef.current.addEventListener('click', handleClick)

    // Add focus method accessible via DOM
    if (termRef.current) {
      (termRef.current as any).focusTerminal = () => {
        const textarea = termRef.current?.querySelector('textarea') as HTMLTextAreaElement
        if (textarea && document.activeElement !== textarea) {
          terminal.current?.focus()
        }
      }
    }

    // Listen for custom focus event
    const handleFocusTerminal = () => {
      const textarea = termRef.current?.querySelector('textarea') as HTMLTextAreaElement
      if (textarea && document.activeElement !== textarea) {
        term.focus()
      }
    }
    window.addEventListener('focusTerminal', handleFocusTerminal)

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('focusTerminal', handleFocusTerminal)
      if (termRef.current) {
        termRef.current.removeEventListener('click', handleClick)
        delete (termRef.current as any).focusTerminal
      }
      term.dispose()
      terminal.current = null
      fitAddon.current = null
    }
  }, [])

  return (
    <div
      className="h-full w-full bg-[#1f2329] px-3 py-2 outline-none [--terminal-bg:#1f2329] [--terminal-fg:#abb2bf] [&_.xterm]:h-full [&_.xterm-helpers]:top-2 [&_.xterm-viewport]:bg-[var(--terminal-bg)] [&_.xterm-screen]:focus:outline-none"
      ref={termRef}
    />
  )
} 
