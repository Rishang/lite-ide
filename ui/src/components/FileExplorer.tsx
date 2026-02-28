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
  Code,
  FileText,
  Database,
  Image,
  Archive,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  RotateCcw
} from 'lucide-react'
import { cn, normalizePath } from '@/lib/utils'
import { config } from '@/utils/config'

// Static file icon mapping (outside component to avoid re-creation)
const FILE_ICON_MAP: Record<string, { Icon: React.FC<any>; colorClass: string }> = {
  'js': { Icon: Code, colorClass: 'text-yellow-400' },
  'jsx': { Icon: Code, colorClass: 'text-yellow-400' },
  'ts': { Icon: Code, colorClass: 'text-blue-400' },
  'tsx': { Icon: Code, colorClass: 'text-blue-400' },
  'py': { Icon: Code, colorClass: 'text-green-400' },
  'go': { Icon: Code, colorClass: 'text-cyan-400' },
  'rs': { Icon: Code, colorClass: 'text-orange-500' },
  'java': { Icon: Code, colorClass: 'text-orange-400' },
  'cpp': { Icon: Code, colorClass: 'text-blue-500' },
  'c': { Icon: Code, colorClass: 'text-blue-500' },
  'php': { Icon: Code, colorClass: 'text-purple-400' },
  'rb': { Icon: Code, colorClass: 'text-red-400' },
  'html': { Icon: FileText, colorClass: 'text-orange-400' },
  'css': { Icon: FileText, colorClass: 'text-purple-400' },
  'json': { Icon: Database, colorClass: 'text-yellow-500' },
  'md': { Icon: FileText, colorClass: 'text-blue-300' },
  'xml': { Icon: FileText, colorClass: 'text-orange-300' },
  'yaml': { Icon: FileText, colorClass: 'text-red-300' },
  'yml': { Icon: FileText, colorClass: 'text-red-300' },
  'png': { Icon: Image, colorClass: 'text-green-300' },
  'jpg': { Icon: Image, colorClass: 'text-green-300' },
  'jpeg': { Icon: Image, colorClass: 'text-green-300' },
  'gif': { Icon: Image, colorClass: 'text-green-300' },
  'svg': { Icon: Image, colorClass: 'text-green-300' },
  'zip': { Icon: Archive, colorClass: 'text-orange-300' },
  'tar': { Icon: Archive, colorClass: 'text-orange-300' },
  'gz': { Icon: Archive, colorClass: 'text-orange-300' },
  'sh': { Icon: FileText, colorClass: 'text-green-300' },
  'sql': { Icon: Database, colorClass: 'text-blue-300' },
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const entry = FILE_ICON_MAP[ext]
  if (entry) {
    const { Icon, colorClass } = entry
    return <Icon className={`w-4 h-4 ${colorClass}`} />
  }
  return <File className="w-4 h-4 text-gray-400" />
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
  const isCommittingRef = useRef(false) // Prevents blur race on rename/create

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

  // Build full path ensuring proper structure
  const buildFullPath = useCallback((parentPath: string | null, name: string): string => {
    if (!parentPath) return normalizePath(name)
    return normalizePath(`${parentPath}/${name}`)
  }, [])

  // Load directory contents for lazy loading
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

  // Update tree with loaded children
  const updateTreeWithChildren = (tree: FileNode[], folderPath: string, children: FileNode[]): FileNode[] => {
    return tree.map(node => updateNodeWithChildren(node, folderPath, children))
  }

  const updateNodeWithChildren = (node: FileNode, folderPath: string, children: FileNode[]): FileNode => {
    if (node.path === folderPath) {
      return {
        ...node,
        children: children || [], // Handle null children by defaulting to empty array
        loaded: true,
        hasMore: children && children.length >= 100 // Assume more if we hit the limit
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

  // Toggle folder expansion with lazy loading
  const toggleFolder = useCallback(async (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
        // Find the node to check if it has children or needs loading
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
        // Only trigger folder expansion if it has children or hasn't been loaded
        if (node && (node.children && node.children.length > 0 || !node.loaded)) {
          expandFolder(path)
        }
      }
      return newSet
    })
  }, [currentPath, localTree])

  // Expand folder for lazy loading
  const expandFolder = useCallback(async (folderPath: string) => {
    try {
      await loadDirectoryContents(folderPath)

      // Also expand for SSE watching
      await fetch(`${config.apiEndpoint}/api/expand?root=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath })
      })
    } catch {
      // silently ignore expand errors
    }
  }, [currentPath, loadDirectoryContents])

  // API calls
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

  // Create file/folder
  const createFileOrFolder = async (type: 'file' | 'folder', parentPath: string | null, name: string) => {
    try {
      const fullPath = buildFullPath(parentPath, name)
      await apiCall('', 'POST', { path: fullPath, type })

      setCreateState(null)
      // SSE will handle the update automatically
    } catch (error) {
      console.error('Create error:', error)
      setErrorMsg(error instanceof Error ? error.message : 'Failed to create')
    }
  }

  // Rename file/folder
  const renameFileOrFolder = async (node: FileNode, newName: string) => {
    try {
      // Save file if dirty
      if (onCheckFileDirty?.(node.path) && onSaveFile) {
        await onSaveFile(node.path)
      }

      const parentPath = node.path.split('/').slice(0, -1).join('/') || ''
      const newPath = buildFullPath(parentPath, newName)

      await apiCall(`/${normalizePath(node.path)}`, 'PATCH', { newPath })

      if (onFileRename) {
        onFileRename(node.path, newPath)
      }

      setRenameState(null)
      // SSE will handle the update automatically
    } catch (error) {
      console.error('Rename error:', error)
      setErrorMsg(error instanceof Error ? error.message : 'Failed to rename')
    }
  }

  // Delete file/folder
  const deleteFileOrFolder = async (node: FileNode) => {
    try {
      await apiCall(`/${normalizePath(node.path)}`, 'DELETE')
      setDeleteNode(null)
      // SSE will handle the update automatically
    } catch (error) {
      console.error('Delete error:', error)
      setErrorMsg(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    e.stopPropagation() // Prevent bubbling to tree container (which would set node: null)
    // Clamp position to keep menu within viewport
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
      // Determine destination folder
      let destFolder = ''
      if (targetFolderNode) {
        destFolder = targetFolderNode.type === 'folder'
          ? targetFolderNode.path
          : (targetFolderNode.path.split('/').slice(0, -1).join('/') || '')
      }

      const destPath = buildFullPath(destFolder, clipboard.name)

      if (clipboard.action === 'cut') {
        // Move file using the rename PATCH API
        await apiCall(`/${normalizePath(clipboard.path)}`, 'PATCH', { newPath: destPath })
        if (onFileRename) {
          onFileRename(clipboard.path, destPath)
        }
        setClipboard(null) // Clear clipboard after cut
      } else {
        // Copy: use raw fetch because apiCall prefixes /api/files, but copy endpoint is /api/copy
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

  // Sort nodes: folders first, then files, both alphabetical
  const sortNodes = useCallback((nodes: FileNode[]): FileNode[] => {
    return [...nodes].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }, [])

  // Copy path to clipboard
  const copyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path).catch(() => { })
    setContextMenu(null)
  }, [])

  // Render tree recursively
  const renderTree = useCallback((nodes: FileNode[], depth = 0) => {
    const sorted = sortNodes(nodes)
    return sorted.map(node => {
      const isExpanded = expandedFolders.has(node.path)
      const hasChildren = node.children && node.children.length > 0
      const isCreating = createState?.isActive && createState.parentPath === node.path
      const isRenaming = renameState?.isActive && renameState.node.path === node.path
      const isActiveFile = node.type === 'file' && node.path === activeFilePath
      const isCut = clipboard?.action === 'cut' && clipboard.path === node.path

      return (
        <div key={node.path} style={{ opacity: isCut ? 0.4 : 1 }}>
          <div
            className={cn(
              'flex items-center relative cursor-pointer text-[13px] select-none',
              'h-[22px]',
              isActiveFile
                ? 'bg-[#094771]'
                : 'hover:bg-[#2a2d2e]',
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
                className="absolute top-0 bottom-0 w-px bg-[#404040]"
                style={{ left: `${16 + i * 16}px` }}
              />
            ))}

            {/* Active file left border */}
            {isActiveFile && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#007acc]" />
            )}

            {node.type === 'folder' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 mr-1 text-[#cccccc] flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-1 text-[#cccccc] flex-shrink-0" />
                )}
                <Folder className={cn(
                  'w-4 h-4 mr-2 flex-shrink-0',
                  isExpanded ? 'text-[#c09553]' : 'text-[#90a4ae]'
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
                  if (!isCommittingRef.current) {
                    setRenameState(null)
                  }
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
                className="flex-1 bg-[#3c3c3c] text-[#cccccc] border border-[#007acc] outline-none px-1 text-[13px] min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={cn(
                'truncate flex-1',
                isActiveFile ? 'text-white' : 'text-[#cccccc]'
              )}>{node.name}</span>
            )}
          </div>

          {/* Create new file/folder input (inline VS Code style) */}
          {isCreating && (
            <div className="relative h-[22px] flex items-center" style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}>
              {/* Indent guides for create row */}
              {Array.from({ length: depth + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-[#404040]"
                  style={{ left: `${16 + i * 16}px` }}
                />
              ))}
              {createState.type === 'folder' ? (
                <Folder className="w-4 h-4 mr-2 text-[#c09553] flex-shrink-0" />
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
                  if (!isCommittingRef.current) {
                    setCreateState(null)
                  }
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
                className="flex-1 bg-[#3c3c3c] text-[#cccccc] border border-[#007acc] outline-none px-1 py-0 text-[13px] min-w-0"
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
                <div className="text-[#858585] text-xs italic h-[22px] flex items-center" style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}>
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
    clipboard
  ])

  return (
    <div ref={explorerRef} className={cn('bg-[#252526] flex flex-col h-full', className)}>
      {/* Header — action icons appear on hover like VS Code */}
      <div className="h-[35px] border-b border-[#3c3c3c] bg-[#252526] flex items-center justify-between px-4 flex-shrink-0 group/header">
        {!isMinimized && (
          <span className="text-[11px] font-semibold tracking-wider text-[#bbbbbb] uppercase select-none">Explorer</span>
        )}
        <div className="flex gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
          {!isMinimized && (
            <>
              <button
                title="Refresh Explorer"
                className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
                onClick={() => onRefresh && onRefresh()}
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#cccccc]" />
              </button>
              <button
                title="New File"
                className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
                onClick={() => handleCreate('file', null)}
              >
                <FilePlus className="w-3.5 h-3.5 text-[#cccccc]" />
              </button>
              <button
                title="New Folder"
                className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
                onClick={() => handleCreate('folder', null)}
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#cccccc]" />
              </button>
            </>
          )}
          {onMinimize && showMinimizeButton && (
            <button
              title={isMinimized ? "Expand Explorer" : "Minimize Explorer"}
              className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
              onClick={onMinimize}
            >
              {isMinimized ? (
                <ChevronRight className="w-4 h-4 text-[#cccccc]" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-[#cccccc]" />
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
              <div className="text-center text-[#858585] text-[13px] py-8">
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
                        <Folder className="w-4 h-4 mr-2 text-[#c09553] flex-shrink-0" />
                      ) : (
                        <File className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                      )}
                      <input
                        ref={inputRef}
                        type="text"
                        value={createState.name}
                        onChange={(e) => setCreateState(prev => prev ? { ...prev, name: e.target.value } : null)}
                        onBlur={() => {
                          if (!isCommittingRef.current) {
                            setCreateState(null)
                          }
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
                        className="flex-1 bg-[#3c3c3c] text-[#cccccc] border border-[#007acc] outline-none px-1 py-0 text-[13px] min-w-0"
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

      {/* Context menu — closes only on outside click so buttons can fire */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-[#252526] border border-[#454545] shadow-lg py-1 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {/* Node-specific actions */}
          {contextMenu.node && (
            <>
              <button
                className="flex items-center px-6 py-[4px] text-[13px] text-[#cccccc] hover:bg-[#094771] hover:text-white w-full text-left"
                onClick={() => handleRename(contextMenu.node!)}
              >
                Rename
              </button>
              <button
                className="flex items-center px-6 py-[4px] text-[13px] text-[#cccccc] hover:bg-[#094771] hover:text-white w-full text-left"
                onClick={() => handleDelete(contextMenu.node!)}
              >
                Delete
              </button>
              <div className="border-t border-[#454545] my-1" />
              <button
                className="flex items-center px-6 py-[4px] text-[13px] text-[#cccccc] hover:bg-[#094771] hover:text-white w-full text-left"
                onClick={() => handleCut(contextMenu.node!)}
              >
                Cut
              </button>
              <button
                className="flex items-center px-6 py-[4px] text-[13px] text-[#cccccc] hover:bg-[#094771] hover:text-white w-full text-left"
                onClick={() => handleCopy(contextMenu.node!)}
              >
                Copy
              </button>
              <div className="border-t border-[#454545] my-1" />
              <button
                className="flex items-center px-6 py-[4px] text-[13px] text-[#cccccc] hover:bg-[#094771] hover:text-white w-full text-left"
                onClick={() => copyPath(contextMenu.node!.path)}
              >
                Copy Path
              </button>
              <div className="border-t border-[#454545] my-1" />
            </>
          )}

          {/* Paste action (available everywhere if clipboard has item) */}
          <button
            className={cn(
              "flex items-center px-6 py-[4px] text-[13px] w-full text-left",
              clipboard
                ? "text-[#cccccc] hover:bg-[#094771] hover:text-white"
                : "text-[#555555] cursor-not-allowed"
            )}
            onClick={() => {
              if (clipboard) handlePaste(contextMenu.node)
            }}
            disabled={!clipboard}
          >
            Paste
          </button>
          <div className="border-t border-[#454545] my-1" />

          {/* Create actions */}
          <button
            className="flex items-center px-6 py-[4px] text-[13px] text-[#cccccc] hover:bg-[#094771] hover:text-white w-full text-left"
            onClick={() => handleCreate('file', contextMenu.node?.type === 'folder' ? contextMenu.node.path : null)}
          >
            New File
          </button>
          <button
            className="flex items-center px-6 py-[4px] text-[13px] text-[#cccccc] hover:bg-[#094771] hover:text-white w-full text-left"
            onClick={() => handleCreate('folder', contextMenu.node?.type === 'folder' ? contextMenu.node.path : null)}
          >
            New Folder
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#252526] p-6 rounded border border-[#3c3c3c] shadow-xl max-w-md">
            <h3 className="text-[#cccccc] text-base mb-2">Delete {deleteNode.type}</h3>
            <p className="text-[#969696] text-sm mb-4">
              Are you sure you want to delete "{deleteNode.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-1.5 bg-transparent text-[#cccccc] border border-[#3c3c3c] hover:bg-[#3c3c3c] transition-colors text-sm"
                onClick={() => setDeleteNode(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1.5 bg-[#f44747] text-white hover:bg-[#d93e3e] transition-colors text-sm"
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

// Ensure this is the default export
export default FileExplorer