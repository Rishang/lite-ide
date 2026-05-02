'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CaseSensitive,
  ChevronDown,
  Copy,
  Ellipsis,
  Files,
  ListFilter,
  RefreshCw,
  Regex,
  ReplaceAll,
  Settings,
  WholeWord,
} from 'lucide-react'
import { config } from '@/utils/config'
import { cn } from '@/lib/utils'
import { getFileIcon } from '@/components/FileExplorer'

interface SearchMatch {
  line: number
  column: number
  endColumn: number
  lineText: string
  previewStart: number
  previewLength: number
}

interface SearchFileResult {
  path: string
  matches: SearchMatch[]
}

interface SearchResult {
  files: SearchFileResult[]
  matches: number
  limitHit: boolean
}

interface ReplaceResult {
  files: number
  replacements: number
  paths: string[]
}

interface SearchPanelProps {
  currentPath: string
  onFileOpen: (path: string, line?: number, column?: number) => void
  onReplaceComplete: (paths: string[]) => void
  className?: string
}

export function SearchPanel({
  currentPath,
  onFileOpen,
  onReplaceComplete,
  className,
}: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [includeFiles, setIncludeFiles] = useState('')
  const [excludeFiles, setExcludeFiles] = useState('')
  const [showReplace, setShowReplace] = useState(true)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [result, setResult] = useState<SearchResult>({
    files: [],
    matches: 0,
    limitHit: false,
  })
  const [isSearching, setIsSearching] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  const hasQuery = query.trim().length > 0

  const searchUrl = useMemo(() => {
    const params = new URLSearchParams({
      root: currentPath,
      q: query,
      include: includeFiles,
      exclude: excludeFiles,
      caseSensitive: String(caseSensitive),
      wholeWord: String(wholeWord),
      regex: String(useRegex),
    })
    return `${config.apiEndpoint}/api/search?${params.toString()}`
  }, [caseSensitive, currentPath, excludeFiles, includeFiles, query, useRegex, wholeWord])

  useEffect(() => {
    if (!hasQuery) {
      setResult({ files: [], matches: 0, limitHit: false })
      setError(null)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true)
        setError(null)
        const response = await fetch(searchUrl, { signal: controller.signal })
        if (!response.ok) throw new Error(await response.text())
        setResult((await response.json()) as SearchResult)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Search failed')
        }
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [hasQuery, refreshVersion, searchUrl])

  const replaceAll = async () => {
    if (!hasQuery || isReplacing) return
    try {
      setIsReplacing(true)
      setError(null)
      setMessage(null)
      const response = await fetch(
        `${config.apiEndpoint}/api/search?root=${encodeURIComponent(currentPath)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            replace: replaceText,
            include: includeFiles,
            exclude: excludeFiles,
            caseSensitive,
            wholeWord,
            useRegex,
          }),
        },
      )
      if (!response.ok) throw new Error(await response.text())
      const data = (await response.json()) as ReplaceResult
      setMessage(`Replaced ${data.replacements} match${data.replacements === 1 ? '' : 'es'} in ${data.files} file${data.files === 1 ? '' : 's'}.`)
      onReplaceComplete(data.paths || [])
      setResult({ files: [], matches: 0, limitHit: false })
      window.setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replace failed')
    } finally {
      setIsReplacing(false)
    }
  }

  const rerunSearch = () => {
    if (!hasQuery) return
    setResult({ files: [], matches: 0, limitHit: false })
    setRefreshVersion((value) => value + 1)
  }

  const getFileMeta = (path: string) => {
    const cleanPath = path.replace(/^\//, '')
    const parts = cleanPath.split('/')
    return {
      name: parts.pop() || cleanPath,
      folder: parts.join('/'),
    }
  }

  const renderHighlightedLine = (match: SearchMatch) => {
    const before = match.lineText.slice(0, match.previewStart)
    const matched = match.lineText.slice(
      match.previewStart,
      match.previewStart + match.previewLength,
    )
    const after = match.lineText.slice(match.previewStart + match.previewLength)

    return (
      <span className="truncate">
        {before}
        <mark className="bg-[#3a2f22] text-[#e5c07b] px-0.5">{matched}</mark>
        {after}
      </span>
    )
  }

  return (
    <div className={cn('bg-[#191d23] flex flex-col h-full', className)}>
      <div className="h-[35px] border-b border-[#303641] bg-[#191d23] flex items-center justify-between px-4 flex-shrink-0 group/header">
        <span className="text-[11px] font-semibold tracking-wider text-[#abb2bf] uppercase select-none">
          Search
        </span>
        <div className="flex items-center gap-0.5 opacity-80 group-hover/header:opacity-100">
          <IconButton title="Refresh Search" onClick={rerunSearch}>
            <RefreshCw className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton title="Search Settings" onClick={() => {}}>
            <Settings className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton title="Clear Search Results" onClick={() => setResult({ files: [], matches: 0, limitHit: false })}>
            <ListFilter className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton title="Open Search Editor" onClick={() => {}}>
            <Files className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton title="Collapse All" onClick={() => {}}>
            <Copy className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="pt-2 pb-1 border-b border-[#191d23]">
        <div className="flex items-center px-2">
          <button
            title={showReplace ? 'Hide Replace' : 'Show Replace'}
            className="h-7 w-4 flex items-center justify-center text-[#abb2bf] hover:text-white flex-shrink-0"
            onClick={() => setShowReplace((value) => !value)}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', !showReplace && '-rotate-90')} />
          </button>
          <div className="h-[28px] flex-1 flex items-center bg-[#171b21] border border-[#303641] focus-within:border-[#61afef] min-w-0">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-full flex-1 bg-transparent outline-none text-[13px] text-[#abb2bf] px-2 min-w-0"
              autoFocus
            />
            <div className="flex items-center pr-1">
              <ToggleButton active={caseSensitive} title="Match Case" onClick={() => setCaseSensitive((value) => !value)}>
                <CaseSensitive className="w-3.5 h-3.5" />
              </ToggleButton>
              <ToggleButton active={wholeWord} title="Match Whole Word" onClick={() => setWholeWord((value) => !value)}>
                <WholeWord className="w-3.5 h-3.5" />
              </ToggleButton>
              <ToggleButton active={useRegex} title="Use Regular Expression" onClick={() => setUseRegex((value) => !value)}>
                <Regex className="w-3.5 h-3.5" />
              </ToggleButton>
            </div>
          </div>
        </div>

        {showReplace && (
          <div className="flex items-center px-2 mt-1">
            <span className="h-7 w-4 flex-shrink-0" />
            <div className="h-[28px] flex-1 flex items-center bg-[#171b21] border border-transparent focus-within:border-[#61afef] min-w-0">
              <input
                value={replaceText}
                onChange={(event) => setReplaceText(event.target.value)}
                placeholder="Replace"
                className="h-full flex-1 bg-transparent outline-none text-[13px] text-[#abb2bf] px-2 min-w-0 placeholder:text-[#5c6370]"
              />
              <button
                title="Replace All"
                disabled={!hasQuery || isReplacing}
                onClick={replaceAll}
                className="h-7 w-7 flex items-center justify-center text-[#abb2bf] hover:bg-[#303641] hover:text-white disabled:text-[#5c6370] disabled:cursor-not-allowed"
              >
                <ReplaceAll className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <FilterInput
          value={includeFiles}
          onChange={setIncludeFiles}
          placeholder="files to include"
          icon={<Ellipsis className="w-4 h-4" />}
          title="Include files. Supports wildcards, for example: *.ts, src/**"
        />
        <FilterInput
          value={excludeFiles}
          onChange={setExcludeFiles}
          placeholder="files to exclude"
          icon={<BookOpen className="w-4 h-4" />}
          title="Exclude files. Supports wildcards, for example: node_modules/**, *.test.ts"
        />
      </div>

      <div className="px-5 py-2 text-[13px] text-[#abb2bf] min-h-[34px] flex items-center">
        <div className="truncate">
          {isSearching
            ? 'Searching...'
            : hasQuery
              ? `${result.matches} result${result.matches === 1 ? '' : 's'} in ${result.files.length} file${result.files.length === 1 ? '' : 's'}`
              : 'Type to search the workspace'}
          {hasQuery && result.matches > 0 && (
            <button
              className="ml-1 text-[#61afef] hover:underline"
              onClick={() => result.files[0] && onFileOpen(result.files[0].path, result.files[0].matches[0]?.line, result.files[0].matches[0]?.column)}
            >
              Open in editor
            </button>
          )}
          {result.limitHit && <span className="text-[#e5c07b]"> Limit reached.</span>}
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-900/20 border-b border-red-800 text-red-400 text-[12px] whitespace-pre-wrap">
          {error}
        </div>
      )}
      {message && (
        <div className="px-3 py-2 bg-[#1f2d23] border-b border-[#304a36] text-[#98c379] text-[12px]">
          {message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
        {result.files.map((file) => {
          const meta = getFileMeta(file.path)
          return (
          <div key={file.path}>
            <button
              className="w-full h-[24px] flex items-center gap-1 px-3 text-left text-[13px] text-[#abb2bf] hover:bg-[#252a32]"
              onClick={() => onFileOpen(file.path, file.matches[0]?.line, file.matches[0]?.column)}
            >
              <ChevronDown className="w-3.5 h-3.5 text-[#abb2bf] flex-shrink-0" />
              <div className="flex-shrink-0">{getFileIcon(meta.name)}</div>
              <span className="truncate font-medium text-[#abb2bf]">{meta.name}</span>
              {meta.folder && <span className="truncate text-[#5c6370]">{meta.folder}</span>}
              <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#303641] text-[#abb2bf] text-[11px] flex items-center justify-center">
                {file.matches.length}
              </span>
            </button>
            {file.matches.map((match, index) => (
              <button
                key={`${file.path}-${match.line}-${match.column}-${index}`}
                className="w-full h-[24px] flex items-center gap-2 pl-12 pr-3 text-left text-[12px] text-[#abb2bf] hover:bg-[#252a32]"
                onClick={() => onFileOpen(file.path, match.line, match.column)}
              >
                {renderHighlightedLine(match)}
              </button>
            ))}
          </div>
          )
        })}
      </div>
    </div>
  )
}

function FilterInput({
  value,
  onChange,
  placeholder,
  icon,
  title,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  icon: React.ReactNode
  title: string
}) {
  return (
    <div className="flex items-center pl-5 pr-2 mt-1">
      <div className="h-[26px] w-full flex items-center bg-[#191d23] border border-transparent focus-within:bg-[#171b21] focus-within:border-[#61afef] min-w-0">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          title={title}
          className="h-full flex-1 bg-transparent outline-none text-[13px] text-[#abb2bf] px-0.5 min-w-0 placeholder:text-[#5c6370]"
        />
        <button
          title={title}
          type="button"
          className="h-6 w-7 flex items-center justify-center text-[#5c6370] hover:bg-[#303641] hover:text-[#abb2bf] flex-shrink-0"
        >
          {icon}
        </button>
      </div>
    </div>
  )
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="h-6 w-6 flex items-center justify-center text-[#abb2bf] hover:bg-[#303641] hover:text-white"
    >
      {children}
    </button>
  )
}

function ToggleButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        'h-6 w-6 flex items-center justify-center text-[#abb2bf] hover:bg-[#303641] hover:text-white',
        active && 'text-white bg-[#252a32]',
      )}
    >
      {children}
    </button>
  )
}
