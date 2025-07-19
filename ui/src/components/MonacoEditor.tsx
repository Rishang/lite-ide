import React, { Suspense } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { setupEditorCompletions } from '@/lib/editor_completion'

// Dark loading screen component
const LoadingScreen = () => (
  <div className="h-full w-full bg-[#1e1e1e] flex items-center justify-center">
    <div className="text-gray-400 text-sm">Loading editor...</div>
  </div>
)

// Lazy-loaded Monaco editor with dark theme
const LazyMonacoEditor = React.lazy(() =>
  Promise.resolve({
    default: ({ ...props }: any) => (
      <MonacoEditor
        {...props}
        beforeMount={(monaco: any) => {
          // Set dark theme immediately before mount
          monaco.editor.setTheme('vs-dark')
          
          // Enhanced auto-completion setup
          try {
            setupEditorCompletions(monaco)
          } catch (error) {
            console.warn('Auto-completion setup failed:', error)
          }
        }}
        theme="vs-dark"
      />
    )
  })
)

export { LazyMonacoEditor, LoadingScreen }
