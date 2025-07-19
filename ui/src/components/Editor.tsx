'use client'

import { useEffect, useRef, Suspense } from 'react'
import { LazyMonacoEditor, LoadingScreen } from './MonacoEditor'

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
    
    // Import the shared utility
    const { getLanguageFromPath } = require('@/lib/common')
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
          onMount={(editor: any) => {
            editorRef.current = editor
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