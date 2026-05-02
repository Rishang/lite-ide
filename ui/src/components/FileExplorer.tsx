// FileExplorer.tsx - Performance-optimized with lazy loading
'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { FileNode } from '@/types/file'
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FilePlus,
  FolderPlus,
  RotateCcw
} from 'lucide-react'
import { cn, normalizePath } from '@/lib/utils'
import { config } from '@/utils/config'

interface FileIconThemeEntry {
  label: string
  bg: string
  text: string
}

// Atom One Dark inspired file icon theme. Shared by explorer, tabs, and search.
const FILE_ICON_MAP: Record<string, FileIconThemeEntry> = {
  js: { label: 'JS', bg: '#e5c07b22', text: '#e5c07b' },
  mjs: { label: 'JS', bg: '#e5c07b22', text: '#e5c07b' },
  cjs: { label: 'JS', bg: '#e5c07b22', text: '#e5c07b' },
  jsx: { label: 'RJ', bg: '#61afef22', text: '#61afef' },
  ts: { label: 'TS', bg: '#61afef22', text: '#61afef' },
  mts: { label: 'TS', bg: '#61afef22', text: '#61afef' },
  cts: { label: 'TS', bg: '#61afef22', text: '#61afef' },
  tsx: { label: 'RX', bg: '#56b6c222', text: '#56b6c2' },
  py: { label: 'PY', bg: '#98c37922', text: '#98c379' },
  pyi: { label: 'PY', bg: '#98c37922', text: '#98c379' },
  pyw: { label: 'PY', bg: '#98c37922', text: '#98c379' },
  go: { label: 'GO', bg: '#56b6c222', text: '#56b6c2' },
  rs: { label: 'RS', bg: '#d19a6622', text: '#d19a66' },
  rb: { label: 'RB', bg: '#e06c7522', text: '#e06c75' },
  rake: { label: 'RB', bg: '#e06c7522', text: '#e06c75' },
  gemspec: { label: 'RB', bg: '#e06c7522', text: '#e06c75' },
  svelte: { label: 'SV', bg: '#e06c7522', text: '#e06c75' },
  html: { label: '<>', bg: '#d19a6622', text: '#d19a66' },
  htm: { label: '<>', bg: '#d19a6622', text: '#d19a66' },
  css: { label: '#', bg: '#61afef22', text: '#61afef' },
  scss: { label: 'SC', bg: '#c678dd22', text: '#c678dd' },
  sass: { label: 'SA', bg: '#c678dd22', text: '#c678dd' },
  json: { label: '{}', bg: '#e5c07b22', text: '#e5c07b' },
  yaml: { label: 'Y', bg: '#c678dd22', text: '#c678dd' },
  yml: { label: 'Y', bg: '#c678dd22', text: '#c678dd' },
  md: { label: 'MD', bg: '#abb2bf22', text: '#abb2bf' },
  markdown: { label: 'MD', bg: '#abb2bf22', text: '#abb2bf' },
  dockerfile: { label: 'DK', bg: '#61afef22', text: '#61afef' },
  sh: { label: '$', bg: '#98c37922', text: '#98c379' },
  bash: { label: '$', bg: '#98c37922', text: '#98c379' },
  zsh: { label: '$', bg: '#98c37922', text: '#98c379' },
  sql: { label: 'DB', bg: '#56b6c222', text: '#56b6c2' },
  xml: { label: '<>', bg: '#d19a6622', text: '#d19a66' },
  svg: { label: 'SVG', bg: '#d19a6622', text: '#d19a66' },
  png: { label: 'IMG', bg: '#98c37922', text: '#98c379' },
  jpg: { label: 'IMG', bg: '#98c37922', text: '#98c379' },
  jpeg: { label: 'IMG', bg: '#98c37922', text: '#98c379' },
  gif: { label: 'GIF', bg: '#98c37922', text: '#98c379' },
  webp: { label: 'IMG', bg: '#98c37922', text: '#98c379' },
  zip: { label: 'ZIP', bg: '#d19a6622', text: '#d19a66' },
  tar: { label: 'TAR', bg: '#d19a6622', text: '#d19a66' },
  gz: { label: 'GZ', bg: '#d19a6622', text: '#d19a66' },
}

const FILE_NAME_ICON_MAP: Record<string, FileIconThemeEntry> = {
  dockerfile: FILE_ICON_MAP.dockerfile,
  containerfile: FILE_ICON_MAP.dockerfile,
  'go.mod': { label: 'GO', bg: '#56b6c222', text: '#56b6c2' },
  'go.sum': { label: 'GO', bg: '#56b6c222', text: '#56b6c2' },
  'go.work': { label: 'GO', bg: '#56b6c222', text: '#56b6c2' },
  gemfile: { label: 'RB', bg: '#e06c7522', text: '#e06c75' },
  rakefile: { label: 'RB', bg: '#e06c7522', text: '#e06c75' },
  'package.json': { label: '{}', bg: '#e5c07b22', text: '#e5c07b' },
  'tsconfig.json': { label: 'TS', bg: '#61afef22', text: '#61afef' },
}

function getFileIcon(fileName: string) {
  const lowerName = fileName.toLowerCase()
  const nameEntry = FILE_NAME_ICON_MAP[lowerName] || (
    lowerName.startsWith('dockerfile.') || lowerName.startsWith('containerfile.')
      ? FILE_ICON_MAP.dockerfile
      : undefined
  )
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const entry = nameEntry || FILE_ICON_MAP[ext]
  if (!entry) return <File className="w-4 h-4 text-[#5c6370]" />

  return (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] px-[3px] text-[8px] font-bold leading-none"
      style={{ backgroundColor: entry.bg, color: entry.text }}
      aria-hidden="true"
    >
      {entry.label}
    </span>
  )
}

// Exported for reuse in TabBar
export { FILE_ICON_MAP, getFileIcon }

interface FileExplorerProps {
  tree: FileNode[]
  onFileOpen: (path: string) => void
  onFileRename?: (oldPath: string, newPath: string) => void
  onCheckFileDirty?: (path: string) => boolean
  onSaveFile?: (path: string) => Promise<void>
  className?: string
  currentPath: string
  onPathChange?: (newPath: string) => void
  onRefresh?: () => void
  onMinimize?: () => void
  isMinimized?: boolean
  showMinimizeButton?: boolean
  activeFilePath?: string | null
}

interface CreateState {
  type: 'file' | 'folder'
  parentPath: string | null
  name: string
  isActive: boolean
}

interface RenameState {
  node: FileNode
  newName: string
  isActive: boolean
}

export function FileExplorer({
  tree,
  onFileOpen,
  onFileRename,
  onCheckFileDirty,
  onSaveFile,
  className,
  currentPath,
  onPathChange,
  onRefresh,
  onMinimize,
  isMinimized = false,
  showMinimizeButton = true,
  activeFilePath = null
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null)
  const [clipboard, setClipboard] = useState<{ action: 'cut' | 'copy'; path: string; name: string; isFolder: boolean } | null>(null)
  const [createState, setCreateState] = useState<CreateState | null>(null)
  const [renameState, setRenameState] = useState<RenameState | null>(null)
  const [deleteNode, setDeleteNode] = useState<FileNode | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [localTree, setLocalTree] = useState<FileNode[]>(tree)
  const [pathInput, setPathInput] = useState<string>(currentPath)
  const [isPathEditing, setIsPathEditing] = useState<boolean>(false)

  const explorerRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathInputRef = useRef<HTMLInputElement>(null)
  const isCommittingRef = useRef(false)

  // Sync local tree with props
  useEffect(() => {
    setLocalTree(tree)
  }, [tree])

  // Sync path input with currentPath
  useEffect(() => {
    setPathInput(currentPath)
  }, [currentPath])

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMsg])

  // Close context menu when clicking outside it, or pressing Escape
  useEffect(() => {
    if (!contextMenu) return
    const handleMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  // Focus input when creating/renaming
  useEffect(() => {
    if ((createState?.isActive || renameState?.isActive) && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [createState?.isActive, renameState?.isActive])

  const buildFullPath = useCallback((parentPath: string | null, name: string): string => {
    if (!parentPath) return normalizePath(name)
    return normalizePath(`${parentPath}/${name}`)
  }, [])

  const loadDirectoryContents = useCallback(async (folderPath: string) => {
    try {
      const response = await fetch(
        `${config.apiEndpoint}/api/files?root=${encodeURIComponent(currentPath)}&path=${encodeURIComponent(folderPath)}`
      )
      if (response.ok) {
        const children = await response.json() as FileNode[] | null
        setLocalTree(prevTree => updateTreeWithChildren(prevTree, folderPath, children || []))
      }
    } catch {
      // silently ignore lazy load errors
    }
  }, [currentPath])

  const updateTreeWithChildren = (tree: FileNode[], folderPath: string, children: FileNode[]): FileNode[] => {
    return tree.map(node => updateNodeWithChildren(node, folderPath, children))
  }

  const updateNodeWithChildren = (node: FileNode, folderPath: string, children: FileNode[]): FileNode => {
    if (node.path === folderPath) {
      return {
        ...node,
        children: children || [],
        loaded: true,
        hasMore: children && children.length >= 100
      }
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateNodeWithChildren(child, folderPath, children))
      }
    }
    return node
  }

  const toggleFolder = useCallback(async (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
        const findNode = (nodes: FileNode[]): FileNode | null => {
          for (const node of nodes) {
            if (node.path === path) return node
            if (node.children) {
              const found = findNode(node.children)
              if (found) return found
            }
          }
          return null
        }
        const node = findNode(localTree)
        if (node && (node.children && node.children.length > 0 || !node.loaded)) {
          expandFolder(path)
        }
      }
      return newSet
    })
  }, [currentPath, localTree])

  const expandFolder = useCallback(async (folderPath: string) => {
    try {
      await loadDirectoryContents(folderPath)
      await fetch(`${config.apiEndpoint}/api/expand?root=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath })
      })
    } catch {
      // silently ignore expand errors
    }
  }, [currentPath, loadDirectoryContents])

  const apiCall = async (endpoint: string, method: string, body?: any) => {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint
    const url = `${config.apiEndpoint}/api/files${normalizedEndpoint}?root=${encodeURIComponent(currentPath)}`
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }
    return response
  }

  const createFileOrFolder = async (type: 'file' | 'folder', parentPath: string | null, name: string) => {
    try {
      const fullPath = buildFullPath(parentPath, name)
      await apiCall('', 'POST', { path: fullPath, type })
      setCreateState(null)
    } catch (error) {
      console.error('Create error:', error)
      setErrorMsg(error instanceof Error ? error.message : 'Failed to create')
    }
  }

  const renameFileOrFolder = async (node: FileNode, newName: string) => {
    try {
      if (onCheckFileDirty?.(node.path) && onSaveFile) {
        await onSaveFile(node.path)
      }
      const parentPath = node.path.split('/').slice(0, -1).join('/') || ''
      const newPath = buildFullPath(parentPath, newName)
      await apiCall(`/${normalizePath(node.path)}`, 'PATCH', { newPath })
      if (onFileRename) onFileRename(node.path, newPath)
      setRenameState(null)
    } catch (error) {
      console.error('Rename error:', error)
      setErrorMsg(error instanceof Error ? error.message : 'Failed to rename')
    }
  }

  const deleteFileOrFolder = async (node: FileNode) => {
    try {
      await apiCall(`/${normalizePath(node.path)}`, 'DELETE')
      setDeleteNode(null)
    } catch (error) {
      console.error('Delete error:', error)
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    e.stopPropagation()
    const menuWidth = 180
    const menuHeight = 200
    const x = Math.min(e.clientX, window.innerWidth - menuWidth)
    const y = Math.min(e.clientY, window.innerHeight - menuHeight)
    setContextMenu({ x, y, node })
  }, [])

  const handlePathChange = () => {
    if (onPathChange && pathInput.trim() !== currentPath) {
      onPathChange(pathInput.trim())
    }
    setIsPathEditing(false)
  }

  const handlePathKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePathChange()
    } else if (e.key === 'Escape') {
      setPathInput(currentPath)
      setIsPathEditing(false)
    }
  }

  const handleCreate = useCallback((type: 'file' | 'folder', parentPath: string | null) => {
    setCreateState({ type, parentPath, name: '', isActive: true })
    setContextMenu(null)
  }, [])

  const handleRename = useCallback((node: FileNode) => {
    setRenameState({ node, newName: node.name, isActive: true })
    setContextMenu(null)
  }, [])

  const handleDelete = useCallback((node: FileNode) => {
    setDeleteNode(node)
    setContextMenu(null)
  }, [])

  const handleCut = useCallback((node: FileNode) => {
    setClipboard({ action: 'cut', path: node.path, name: node.name, isFolder: node.type === 'folder' })
    setContextMenu(null)
  }, [])

  const handleCopy = useCallback((node: FileNode) => {
    setClipboard({ action: 'copy', path: node.path, name: node.name, isFolder: node.type === 'folder' })
    setContextMenu(null)
  }, [])

  const handlePaste = useCallback(async (targetFolderNode: FileNode | null) => {
    if (!clipboard) return
    try {
      let destFolder = ''
      if (targetFolderNode) {
        destFolder = targetFolderNode.type === 'folder'
          ? targetFolderNode.path
          : (targetFolderNode.path.split('/').slice(0, -1).join('/') || '')
      }
      const destPath = buildFullPath(destFolder, clipboard.name)

      if (clipboard.action === 'cut') {
        await apiCall(`/${normalizePath(clipboard.path)}`, 'PATCH', { newPath: destPath })
        if (onFileRename) onFileRename(clipboard.path, destPath)
        setClipboard(null)
      } else {
        const response = await fetch(
          `${config.apiEndpoint}/api/copy?root=${encodeURIComponent(currentPath)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: clipboard.path, destination: destPath })
          }
        )
        if (!response.ok) {
          const err = await response.text()
          throw new Error(`HTTP ${response.status}: ${err}`)
        }
      }
      setContextMenu(null)
    } catch (error) {
      console.error('Paste error:', error)
      setErrorMsg(error instanceof Error ? error.message : 'Failed to paste')
    }
  }, [clipboard, buildFullPath, onFileRename])

  const sortNodes = useCallback((nodes: FileNode[]): FileNode[] => {
    return [...nodes].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }, [])

  const copyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path).catch(() => { })
    setContextMenu(null)
  }, [])

  const contextMenuItemClass = 'flex h-[26px] w-full items-center px-6 text-left text-[13px] text-[#abb2bf] outline-none transition-colors hover:bg-[#343b47] hover:text-white focus:bg-[#343b47] focus:text-white'
  const contextMenuDisabledItemClass = 'flex h-[26px] w-full items-center px-6 text-left text-[13px] text-[#5c6370] cursor-not-allowed'
  const contextMenuSeparatorClass = 'my-1 h-px bg-[#111318]'

  // The path of whichever node the context menu is currently open for.
  // Used to draw the selection highlight that persists until menu is dismissed.
  const contextMenuNodePath = contextMenu?.node?.path ?? null

  const renderTree = useCallback((nodes: FileNode[], depth = 0) => {
    const sorted = sortNodes(nodes)
    return sorted.map(node => {
      const isExpanded = expandedFolders.has(node.path)
      const isCreating = createState?.isActive && createState.parentPath === node.path
      const isRenaming = renameState?.isActive && renameState.node.path === node.path
      const isActiveFile = node.type === 'file' && node.path === activeFilePath
      const isCut = clipboard?.action === 'cut' && clipboard.path === node.path

      // Right-click selection: highlight the node the context menu was opened on,
      // using a slightly lighter tint than the active-file highlight so they're
      // visually distinct but clearly in the same "selection" family.
      const isContextSelected = node.path === contextMenuNodePath

      return (
        <div key={node.path} style={{ opacity: isCut ? 0.4 : 1 }}>
          <div
            className={cn(
              'flex items-center relative cursor-pointer text-[13px] select-none',
              'h-[22px]',
              // Priority: active file > context-menu selection > hover
              isActiveFile
                ? 'bg-[#343b47]'
                : isContextSelected
                  ? 'bg-[#252a32]'          // VS Code's right-click selection colour
                  : 'hover:bg-[#252a32]',
            )}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            onContextMenu={(e) => handleContextMenu(e, node)}
            onClick={() => {
              if (node.type === 'folder') {
                toggleFolder(node.path)
              } else {
                onFileOpen(node.path)
              }
            }}
          >
            {/* Indent guide lines */}
            {Array.from({ length: depth }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-[#303641]"
                style={{ left: `${16 + i * 16}px` }}
              />
            ))}

            {/* Active file left border */}
            {isActiveFile && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#61afef]" />
            )}

            {/* Right-click selection border — dashed to distinguish from active-file solid */}
            {isContextSelected && !isActiveFile && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#61afef] opacity-60" />
            )}

            {node.type === 'folder' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 mr-1 text-[#abb2bf] flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-1 text-[#abb2bf] flex-shrink-0" />
                )}
                <Folder className={cn(
                  'w-4 h-4 mr-2 flex-shrink-0',
                  isExpanded ? 'text-[#e5c07b]' : 'text-[#61afef]'
                )} />
              </>
            ) : (
              <>
                <span className="w-4 mr-1 flex-shrink-0" />
                <div className="flex-shrink-0 mr-2">{getFileIcon(node.name)}</div>
              </>
            )}

            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={renameState.newName}
                onChange={(e) => setRenameState(prev => prev ? { ...prev, newName: e.target.value } : null)}
                onBlur={() => {
                  if (!isCommittingRef.current) setRenameState(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameState.newName.trim()) {
                    isCommittingRef.current = true
                    renameFileOrFolder(renameState.node, renameState.newName.trim()).finally(() => {
                      isCommittingRef.current = false
                    })
                  } else if (e.key === 'Escape') {
                    setRenameState(null)
                  }
                }}
                className="flex-1 bg-[#303641] text-[#abb2bf] border border-[#61afef] outline-none px-1 text-[13px] min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={cn(
                'truncate flex-1',
                isActiveFile ? 'text-white' : 'text-[#abb2bf]'
              )}>{node.name}</span>
            )}
          </div>

          {/* Create new file/folder input (inline VS Code style) */}
          {isCreating && (
            <div className="relative h-[22px] flex items-center" style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}>
              {Array.from({ length: depth + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-[#303641]"
                  style={{ left: `${16 + i * 16}px` }}
                />
              ))}
              {createState.type === 'folder' ? (
                <Folder className="w-4 h-4 mr-2 text-[#e5c07b] flex-shrink-0" />
              ) : (
                <>
                  <span className="w-4 mr-1 flex-shrink-0" />
                  <File className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                </>
              )}
              <input
                ref={inputRef}
                type="text"
                value={createState.name}
                onChange={(e) => setCreateState(prev => prev ? { ...prev, name: e.target.value } : null)}
                onBlur={() => {
                  if (!isCommittingRef.current) setCreateState(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && createState.name.trim()) {
                    isCommittingRef.current = true
                    createFileOrFolder(createState.type, createState.parentPath, createState.name.trim())
                    setTimeout(() => { isCommittingRef.current = false }, 100)
                  } else if (e.key === 'Escape') {
                    setCreateState(null)
                  }
                }}
                placeholder={createState.type === 'file' ? 'File name' : 'Folder name'}
                className="flex-1 bg-[#303641] text-[#abb2bf] border border-[#61afef] outline-none px-1 py-0 text-[13px] min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Render children */}
          {node.type === 'folder' && isExpanded && node.children && (
            <div>
              {node.children.length > 0 ? (
                renderTree(node.children, depth + 1)
              ) : (
                <div
                  className="text-[#5c6370] text-xs italic h-[22px] flex items-center"
                  style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}
                >
                  Empty folder
                </div>
              )}
            </div>
          )}
        </div>
      )
    })
  }, [
    expandedFolders,
    createState,
    renameState,
    onFileOpen,
    toggleFolder,
    buildFullPath,
    handleContextMenu,
    activeFilePath,
    sortNodes,
    clipboard,
    contextMenuNodePath,   // re-render when context-menu target changes
  ])

  return (
    <div ref={explorerRef} className={cn('bg-[#191d23] flex flex-col h-full', className)}>
      {/* Header */}
      <div className="h-[35px] border-b border-[#303641] bg-[#191d23] flex items-center justify-between px-4 flex-shrink-0 group/header">
        {!isMinimized && (
          <span className="text-[11px] font-semibold tracking-wider text-[#abb2bf] uppercase select-none">Explorer</span>
        )}
        <div className="flex gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
          {!isMinimized && (
            <>
              <button
                title="Refresh Explorer"
                className="p-1 hover:bg-[#303641] rounded transition-colors"
                onClick={() => onRefresh && onRefresh()}
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#abb2bf]" />
              </button>
              <button
                title="New File"
                className="p-1 hover:bg-[#303641] rounded transition-colors"
                onClick={() => handleCreate('file', null)}
              >
                <FilePlus className="w-3.5 h-3.5 text-[#abb2bf]" />
              </button>
              <button
                title="New Folder"
                className="p-1 hover:bg-[#303641] rounded transition-colors"
                onClick={() => handleCreate('folder', null)}
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#abb2bf]" />
              </button>
            </>
          )}
          {onMinimize && showMinimizeButton && (
            <button
              title={isMinimized ? "Expand Explorer" : "Minimize Explorer"}
              className="p-1 hover:bg-[#303641] rounded transition-colors"
              onClick={onMinimize}
            >
              {isMinimized ? (
                <ChevronRight className="w-4 h-4 text-[#abb2bf]" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-[#abb2bf]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="px-3 py-2 bg-red-900/20 border-b border-red-800 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* File tree */}
      {!isMinimized && (
        <div
          className="flex-1 overflow-y-auto scrollbar-thin"
          onContextMenu={(e) => {
            e.preventDefault()
            const menuWidth = 180
            const menuHeight = 120
            const x = Math.min(e.clientX, window.innerWidth - menuWidth)
            const y = Math.min(e.clientY, window.innerHeight - menuHeight)
            setContextMenu({ x, y, node: null })
          }}
        >
          <div className="py-1">
            {localTree.length === 0 ? (
              <div className="text-center text-[#5c6370] text-[13px] py-8">
                No files or folders
              </div>
            ) : (
              <>
                {renderTree(localTree)}
                {/* Root-level create input */}
                {createState?.isActive && createState.parentPath === null && (
                  <div className="px-2 py-[2px]">
                    <div className="flex items-center">
                      {createState.type === 'folder' ? (
                        <Folder className="w-4 h-4 mr-2 text-[#e5c07b] flex-shrink-0" />
                      ) : (
                        <File className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                      )}
                      <input
                        ref={inputRef}
                        type="text"
                        value={createState.name}
                        onChange={(e) => setCreateState(prev => prev ? { ...prev, name: e.target.value } : null)}
                        onBlur={() => {
                          if (!isCommittingRef.current) setCreateState(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && createState.name.trim()) {
                            isCommittingRef.current = true
                            createFileOrFolder(createState.type, createState.parentPath, createState.name.trim())
                            setTimeout(() => { isCommittingRef.current = false }, 100)
                          } else if (e.key === 'Escape') {
                            setCreateState(null)
                          }
                        }}
                        placeholder={createState.type === 'file' ? 'File name' : 'Folder name'}
                        className="flex-1 bg-[#303641] text-[#abb2bf] border border-[#61afef] outline-none px-1 py-0 text-[13px] min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[210px] overflow-hidden border border-[#111318] bg-[#191d23] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className={contextMenuItemClass}
            onClick={() => handleCreate('file', contextMenu.node?.type === 'folder' ? contextMenu.node.path : null)}
          >
            New File
          </button>
          <button
            className={contextMenuItemClass}
            onClick={() => handleCreate('folder', contextMenu.node?.type === 'folder' ? contextMenu.node.path : null)}
          >
            New Folder
          </button>
          <div className={contextMenuSeparatorClass} />

          {contextMenu.node && (
            <>
              <button
                className={contextMenuItemClass}
                onClick={() => handleRename(contextMenu.node!)}
              >
                Rename
              </button>
              <button
                className={contextMenuItemClass}
                onClick={() => handleDelete(contextMenu.node!)}
              >
                Delete
              </button>
              <div className={contextMenuSeparatorClass} />
              <button
                className={contextMenuItemClass}
                onClick={() => handleCut(contextMenu.node!)}
              >
                Cut
              </button>
              <button
                className={contextMenuItemClass}
                onClick={() => handleCopy(contextMenu.node!)}
              >
                Copy
              </button>
              <div className={contextMenuSeparatorClass} />
              <button
                className={contextMenuItemClass}
                onClick={() => copyPath(contextMenu.node!.path)}
              >
                Copy Path
              </button>
              <div className={contextMenuSeparatorClass} />
            </>
          )}

          <button
            className={clipboard ? contextMenuItemClass : contextMenuDisabledItemClass}
            onClick={() => { if (clipboard) handlePaste(contextMenu.node) }}
            disabled={!clipboard}
          >
            Paste
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#191d23] p-6 rounded border border-[#303641] shadow-xl max-w-md">
            <h3 className="text-[#abb2bf] text-base mb-2">Delete {deleteNode.type}</h3>
            <p className="text-[#828997] text-sm mb-4">
              Are you sure you want to delete "{deleteNode.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-1.5 bg-transparent text-[#abb2bf] border border-[#303641] hover:bg-[#303641] transition-colors text-sm"
                onClick={() => setDeleteNode(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1.5 bg-[#e06c75] text-white hover:bg-[#be5046] transition-colors text-sm"
                onClick={() => deleteFileOrFolder(deleteNode)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileExplorer
