'use client'

import { useEffect, useRef } from 'react'
import MonacoEditor from '@monaco-editor/react'

interface EditorProps {
  content: string
  path: string
  language?: string
  theme?: string
  onChange: (value: string) => void
  onSave: () => void
}

export function Editor({ content, path, language, theme = 'vs-dark', onChange, onSave }: EditorProps) {
  const editorRef = useRef<any>(null)

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
    const ext = path.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript'
      case 'ts':
      case 'tsx':
        return 'typescript'
      case 'html':
        return 'html'
      case 'css':
        return 'css'
      case 'json':
        return 'json'
      case 'py':
        return 'python'
      case 'go':
        return 'go'
      case 'rs':
        return 'rust'
      case 'java':
        return 'java'
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp'
      case 'c':
        return 'c'
      case 'php':
        return 'php'
      case 'rb':
        return 'ruby'
      case 'sh':
        return 'shell'
      case 'md':
        return 'markdown'
      case 'xml':
        return 'xml'
      case 'yaml':
      case 'yml':
        return 'yaml'
      default:
        return 'plaintext'
    }
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
    <div className="flex-1">
      <MonacoEditor
        height="100%"
        defaultLanguage={getLanguage(path)}
        value={content}
        onChange={(value) => onChange(value || '')}
        onMount={(editor) => {
          editorRef.current = editor
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Consolas, monospace',
          theme: 'vs-dark',
          automaticLayout: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'blink',  // VSCode default
          cursorSmoothCaretAnimation: 'off',  // Less smooth, like VSCode
          renderLineHighlight: 'all',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
      />
    </div>
  )
} 