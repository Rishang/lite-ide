import React, { Suspense } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { setupEditorCompletions } from '@/lib/editor_completion'

// Dark loading screen component
const LoadingScreen = () => (
  <div className="h-full w-full bg-[#1f2329] flex items-center justify-center">
    <div className="text-gray-400 text-sm">Loading editor...</div>
  </div>
)

function setupDockerfileLanguage(monaco: any) {
  const hasDockerfileLanguage = monaco.languages
    .getLanguages()
    .some((language: { id: string }) => language.id === 'dockerfile')

  if (!hasDockerfileLanguage) {
    monaco.languages.register({
      id: 'dockerfile',
      extensions: ['.dockerfile'],
      filenames: ['Dockerfile'],
      aliases: ['Dockerfile', 'dockerfile'],
    })
  }

  monaco.languages.setMonarchTokensProvider('dockerfile', {
    ignoreCase: true,
    keywords: [
      'ADD',
      'ARG',
      'CMD',
      'COPY',
      'ENTRYPOINT',
      'ENV',
      'EXPOSE',
      'FROM',
      'HEALTHCHECK',
      'LABEL',
      'MAINTAINER',
      'ONBUILD',
      'RUN',
      'SHELL',
      'STOPSIGNAL',
      'USER',
      'VOLUME',
      'WORKDIR',
    ],
    tokenizer: {
      root: [
        [/#.*$/, 'comment.dockerfile'],
        [/--[a-zA-Z0-9][\w-]*(?==|\s|$)/, 'flag.dockerfile'],
        [/\$\{?[a-zA-Z_][\w]*\}?/, 'variable.dockerfile'],
        [/"([^"\\]|\\.)*$/, 'string.invalid.dockerfile'],
        [/"/, 'string.dockerfile', '@doubleString'],
        [/'([^'\\]|\\.)*$/, 'string.invalid.dockerfile'],
        [/'/, 'string.dockerfile', '@singleString'],
        [/[a-zA-Z_][\w]*/, {
          cases: {
            '@keywords': 'keyword.dockerfile',
            '@default': 'identifier.dockerfile',
          },
        }],
      ],
      doubleString: [
        [/\$\{?[a-zA-Z_][\w]*\}?/, 'variable.dockerfile'],
        [/[^\\"]+/, 'string.dockerfile'],
        [/\\./, 'string.escape.dockerfile'],
        [/"/, 'string.dockerfile', '@pop'],
      ],
      singleString: [
        [/[^\\']+/, 'string.dockerfile'],
        [/\\./, 'string.escape.dockerfile'],
        [/'/, 'string.dockerfile', '@pop'],
      ],
    },
  })
}

function setupSvelteLanguage(monaco: any) {
  const hasSvelteLanguage = monaco.languages
    .getLanguages()
    .some((language: { id: string }) => language.id === 'svelte')

  if (!hasSvelteLanguage) {
    monaco.languages.register({
      id: 'svelte',
      extensions: ['.svelte'],
      aliases: ['Svelte', 'svelte'],
    })
  }

  monaco.languages.setMonarchTokensProvider('svelte', {
    tokenizer: {
      root: [
        [/<!--/, 'comment.svelte', '@comment'],
        [/<script\b[^>]*>/, 'tag.svelte', '@script'],
        [/<style\b[^>]*>/, 'tag.svelte', '@style'],
        [/<\/?[a-zA-Z][\w:-]*/, 'tag.svelte', '@tag'],
        [/\{#[a-zA-Z]+\b/, 'keyword.svelte'],
        [/\{\/[a-zA-Z]+\}/, 'keyword.svelte'],
        [/\{:[a-zA-Z]+\b/, 'keyword.svelte'],
        [/\{@[a-zA-Z]+\b/, 'keyword.svelte'],
        [/\{[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*\}/, 'variable.svelte'],
        [/\{|\}/, 'delimiter.svelte'],
        [/[^<{]+/, 'text.svelte'],
      ],
      comment: [
        [/-->/, 'comment.svelte', '@pop'],
        [/[^-]+/, 'comment.svelte'],
        [/./, 'comment.svelte'],
      ],
      tag: [
        [/\s+[a-zA-Z_:][\w:.-]*/, 'attribute.name.svelte'],
        [/=/, 'operator.svelte'],
        [/"[^"]*"/, 'string.svelte'],
        [/'[^']*'/, 'string.svelte'],
        [/\{[^\}]*\}/, 'variable.svelte'],
        [/\/?>/, 'tag.svelte', '@pop'],
      ],
      script: [
        [/<\/script>/, 'tag.svelte', '@pop'],
        [/\b(import|export|let|const|var|if|else|return|function|from|await|async)\b/, 'keyword'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/`([^`\\]|\\.)*`/, 'string'],
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@blockComment'],
        [/[a-zA-Z_$][\w$]*/, 'identifier'],
      ],
      style: [
        [/<\/style>/, 'tag.svelte', '@pop'],
        [/\/\*/, 'comment', '@blockComment'],
        [/[.#]?[a-zA-Z_-][\w-]*(?=\s*\{)/, 'type'],
        [/[a-zA-Z-]+(?=\s*:)/, 'attribute.name.svelte'],
        [/#[0-9a-fA-F]{3,8}\b/, 'number'],
        [/"[^"]*"|'[^']*'/, 'string'],
      ],
      blockComment: [
        [/\*\//, 'comment', '@pop'],
        [/./, 'comment'],
      ],
    },
  })
}

// Lazy-loaded Monaco editor with dark theme
const LazyMonacoEditor = React.lazy(() =>
  Promise.resolve({
    default: ({ ...props }: any) => (
      <MonacoEditor
        {...props}
        beforeMount={(monaco: any) => {
          monaco.editor.defineTheme('atom-one-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: '', foreground: 'abb2bf', background: '282c34' },
              { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
              { token: 'keyword', foreground: 'c678dd' },
              { token: 'number', foreground: 'd19a66' },
              { token: 'string', foreground: '98c379' },
              { token: 'type', foreground: 'e5c07b' },
              { token: 'function', foreground: '61afef' },
              { token: 'variable', foreground: 'e06c75' },
              { token: 'operator', foreground: '56b6c2' },
              { token: 'comment.dockerfile', foreground: '5c6370', fontStyle: 'italic' },
              { token: 'keyword.dockerfile', foreground: 'c678dd', fontStyle: 'bold' },
              { token: 'flag.dockerfile', foreground: '56b6c2' },
              { token: 'variable.dockerfile', foreground: 'e06c75' },
              { token: 'string.dockerfile', foreground: '98c379' },
              { token: 'string.escape.dockerfile', foreground: 'd19a66' },
              { token: 'identifier.dockerfile', foreground: 'abb2bf' },
              { token: 'comment.svelte', foreground: '5c6370', fontStyle: 'italic' },
              { token: 'tag.svelte', foreground: 'e06c75' },
              { token: 'attribute.name.svelte', foreground: 'd19a66' },
              { token: 'keyword.svelte', foreground: 'c678dd' },
              { token: 'variable.svelte', foreground: 'e5c07b' },
              { token: 'delimiter.svelte', foreground: '56b6c2' },
              { token: 'text.svelte', foreground: 'abb2bf' },
            ],
            colors: {
              'editor.background': '#1f2329',
              'editor.foreground': '#abb2bf',
              'editorLineNumber.foreground': '#5c6370',
              'editorLineNumber.activeForeground': '#abb2bf',
              'editorCursor.foreground': '#528bff',
              'editor.selectionBackground': '#343b47',
              'editor.inactiveSelectionBackground': '#303641',
              'editor.lineHighlightBackground': '#252a32',
              'editorIndentGuide.background1': '#303641',
              'editorIndentGuide.activeBackground1': '#5c6370',
              'editorWidget.background': '#191d23',
              'editorWidget.border': '#111318',
              'editorSuggestWidget.background': '#191d23',
              'editorSuggestWidget.border': '#111318',
              'editorSuggestWidget.selectedBackground': '#252a32',
              'editorHoverWidget.background': '#191d23',
              'editorHoverWidget.border': '#111318',
              'scrollbarSlider.background': '#5c637066',
              'scrollbarSlider.hoverBackground': '#5c637099',
              'scrollbarSlider.activeBackground': '#5c6370cc',
            },
          })
          monaco.editor.setTheme('atom-one-dark')
          setupDockerfileLanguage(monaco)
          setupSvelteLanguage(monaco)
          
          // Enhanced auto-completion setup
          try {
            setupEditorCompletions(monaco)
          } catch (error) {
            console.warn('Auto-completion setup failed:', error)
          }
        }}
        theme="atom-one-dark"
      />
    )
  })
)

export { LazyMonacoEditor, LoadingScreen }
