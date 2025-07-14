'use client'

import { useEffect, useRef } from 'react'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { Terminal as XTerminal } from 'xterm'
import 'xterm/css/xterm.css'

export function Terminal() {
  const termRef = useRef<HTMLDivElement | null>(null)
  const terminal = useRef<XTerminal | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!termRef.current || terminal.current) {
      return
    }

    const term = new XTerminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
      },
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      rows: 24,
      cols: 80,
    })
    terminal.current = term

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())
    term.open(termRef.current)
    fitAddon.fit()

    // Focus the terminal after opening
    term.focus()

    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/terminal`
    console.log('Connecting to terminal at:', url)
    const socket = new WebSocket(url)
    // Set binary type to handle binary data properly
    socket.binaryType = 'arraybuffer'
    socketRef.current = socket

    socket.onopen = () => {
      console.log('WebSocket connected')
      term.writeln('Connected to terminal')
      const initialSize = { cols: term.cols, rows: term.rows }
      console.log('Sending initial resize:', initialSize)
      socket.send(JSON.stringify({ type: 'resize', ...initialSize }))
    }

    socket.onmessage = (event) => {
      console.log('Received message:', event.data, typeof event.data)
      
      if (event.data instanceof ArrayBuffer) {
        // Handle binary data (ArrayBuffer)
        const uint8Array = new Uint8Array(event.data)
        const text = new TextDecoder('utf-8').decode(uint8Array)
        console.log('Binary data converted to text:', JSON.stringify(text))
        term.write(text)
      } else if (typeof event.data === 'string') {
        // Handle text data directly
        console.log('Text data:', JSON.stringify(event.data))
        term.write(event.data)
      } else if (event.data instanceof Blob) {
        // Handle Blob data
        event.data.arrayBuffer().then(buffer => {
          const uint8Array = new Uint8Array(buffer)
          const text = new TextDecoder('utf-8').decode(uint8Array)
          console.log('Blob data converted to text:', JSON.stringify(text))
          term.write(text)
        })
      } else {
        console.log('Unknown data type:', typeof event.data, event.data)
      }
    }

    socket.onerror = (err) => {
      console.error('Socket error:', err)
      term.writeln('\r\nConnection error.')
    }

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      term.writeln('\r\nConnection closed.')
    }

    term.onData((data) => {
      console.log('Sending to server:', JSON.stringify(data), 'charCodes:', data.split('').map(c => c.charCodeAt(0)))
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data)
      }
    })

    term.onResize((size) => {
      console.log('Terminal resized:', size)
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', ...size }))
      }
    })

    // Re-focus when clicked
    const handleClick = () => {
      term.focus()
    }
    termRef.current.addEventListener('click', handleClick)

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
      window.removeEventListener('resize', handleResize)
      if (termRef.current) {
        termRef.current.removeEventListener('click', handleClick)
      }
      term.dispose()
      terminal.current = null
    }
  }, [])

  return (
    <div className="h-full w-full p-2" ref={termRef} />
  )
} 