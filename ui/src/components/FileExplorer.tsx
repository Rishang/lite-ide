// FileExplorer.tsx - Updated with SSE support and lazy loading
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
  showMinimizeButton = true
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null)
  const [createState, setCreateState] = useState<CreateState | null>(null)
  const [renameState, setRenameState] = useState<RenameState | null>(null)
  const [deleteNode, setDeleteNode] = useState<FileNode | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [localTree, setLocalTree] = useState<FileNode[]>(tree)
  const [pathInput, setPathInput] = useState<string>(currentPath)
  const [isPathEditing, setIsPathEditing] = useState<boolean>(false)
  
  const explorerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathInputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Sync local tree with props
  useEffect(() => {
    setLocalTree(tree)
  }, [tree])

  // Sync path input with currentPath
  useEffect(() => {
    setPathInput(currentPath)
  }, [currentPath])

  // SSE connection for real-time updates
  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`${config.apiEndpoint}/api/watch?root=${encodeURIComponent(currentPath)}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const newTree = JSON.parse(event.data) as FileNode[]
        setLocalTree(newTree)
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          window.dispatchEvent(new Event('refreshTree'))
        }
      }, 3000)
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [currentPath])

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (explorerRef.current && !explorerRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when creating/renaming
  useEffect(() => {
    if ((createState?.isActive || renameState?.isActive) && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [createState?.isActive, renameState?.isActive])

  // Get file icon based on extension
  const getFileIcon = useCallback((fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const iconMap: Record<string, React.JSX.Element> = {
      'js': <Code className="w-4 h-4 text-yellow-400" />,
      'jsx': <Code className="w-4 h-4 text-yellow-400" />,
      'ts': <Code className="w-4 h-4 text-blue-400" />,
      'tsx': <Code className="w-4 h-4 text-blue-400" />,
      'py': <Code className="w-4 h-4 text-green-400" />,
      'go': <Code className="w-4 h-4 text-cyan-400" />,
      'rs': <Code className="w-4 h-4 text-orange-500" />,
      'java': <Code className="w-4 h-4 text-orange-400" />,
      'cpp': <Code className="w-4 h-4 text-blue-500" />,
      'c': <Code className="w-4 h-4 text-blue-500" />,
      'php': <Code className="w-4 h-4 text-purple-400" />,
      'rb': <Code className="w-4 h-4 text-red-400" />,
      'html': <FileText className="w-4 h-4 text-orange-400" />,
      'css': <FileText className="w-4 h-4 text-purple-400" />,
      'json': <Database className="w-4 h-4 text-yellow-500" />,
      'md': <FileText className="w-4 h-4 text-blue-300" />,
      'xml': <FileText className="w-4 h-4 text-orange-300" />,
      'yaml': <FileText className="w-4 h-4 text-red-300" />,
      'yml': <FileText className="w-4 h-4 text-red-300" />,
      'png': <Image className="w-4 h-4 text-green-300" />,
      'jpg': <Image className="w-4 h-4 text-green-300" />,
      'jpeg': <Image className="w-4 h-4 text-green-300" />,
      'gif': <Image className="w-4 h-4 text-green-300" />,
      'svg': <Image className="w-4 h-4 text-green-300" />,
      'zip': <Archive className="w-4 h-4 text-orange-300" />,
      'tar': <Archive className="w-4 h-4 text-orange-300" />,
      'gz': <Archive className="w-4 h-4 text-orange-300" />,
      'sh': <FileText className="w-4 h-4 text-green-300" />,
      'sql': <Database className="w-4 h-4 text-blue-300" />
    }
    return iconMap[ext] || <File className="w-4 h-4 text-gray-400" />
  }, [])

  // Build full path ensuring proper structure
  const buildFullPath = useCallback((parentPath: string | null, name: string): string => {
    if (!parentPath) return normalizePath(name)
    return normalizePath(`${parentPath}/${name}`)
  }, [])

  // Load directory contents for lazy loading
  const loadDirectoryContents = useCallback(async (folderPath: string) => {
    try {
      console.log('Loading directory contents for:', folderPath)
      const response = await fetch(
        `${config.apiEndpoint}/api/files?root=${encodeURIComponent(currentPath)}&path=${encodeURIComponent(folderPath)}`
      )
      
      if (response.ok) {
        const children = await response.json() as FileNode[] | null
        
        // Update the tree with loaded children (handle null for empty folders)
        setLocalTree(prevTree => updateTreeWithChildren(prevTree, folderPath, children || []))
      } else {
        console.warn('Failed to load directory contents:', folderPath)
      }
    } catch (error) {
      console.error('Error loading directory contents:', folderPath, error)
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
      console.log('Expanding folder for lazy loading:', folderPath)
      
      // Load directory contents using the new lazy loading endpoint
      await loadDirectoryContents(folderPath)
      
      // Also expand for SSE watching
      const response = await fetch(`${config.apiEndpoint}/api/expand?root=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.warn('Failed to expand folder for watching:', folderPath, 'Error:', errorText)
      } else {
        const result = await response.json()
        console.log('Folder expansion successful:', result)
      }
    } catch (error) {
      console.error('Error expanding folder:', folderPath, error)
    }
  }, [currentPath, loadDirectoryContents])

  // API calls
  const apiCall = async (endpoint: string, method: string, body?: any) => {
    const url = `${config.apiEndpoint}/api/files${endpoint}?root=${encodeURIComponent(currentPath)}`
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
    setContextMenu({ x: e.clientX, y: e.clientY, node })
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
    console.log('handleCreate called with:', { type, parentPath });
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

  // Render tree recursively
  const renderTree = useCallback((nodes: FileNode[], depth = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedFolders.has(node.path)
      const hasChildren = node.children && node.children.length > 0
      const isCreating = createState?.isActive && createState.parentPath === node.path
      const isRenaming = renameState?.isActive && renameState.node.path === node.path

      return (
        <div key={node.path}>
          <div
            className={cn(
              'flex items-center px-2 py-1 hover:bg-[#2a2a2a] cursor-pointer text-sm transition-colors duration-200 rounded-md group',
              depth > 0 && 'ml-2'
            )}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onContextMenu={(e) => handleContextMenu(e, node)}
            onClick={() => {
              if (node.type === 'folder') {
                toggleFolder(node.path)
              } else {
                onFileOpen(node.path)
              }
            }}
          >
            {node.type === 'folder' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 mr-1 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-1 text-muted-foreground flex-shrink-0" />
                )}
                <Folder className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
              </>
            ) : (
              <div className="flex-shrink-0 mr-2">{getFileIcon(node.name)}</div>
            )}
            
            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={renameState.newName}
                onChange={(e) => setRenameState(prev => prev ? { ...prev, newName: e.target.value } : null)}
                onBlur={() => setRenameState(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameState.newName.trim()) {
                    renameFileOrFolder(renameState.node, renameState.newName.trim())
                  } else if (e.key === 'Escape') {
                    setRenameState(null)
                  }
                }}
                className="w-32 bg-[#2a2a2a] text-white border border-[#444] rounded px-2 py-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate text-white flex-1">{node.name}</span>
            )}
          </div>

          {/* Create new file/folder input */}
          {isCreating && (
            <div className="ml-4 mt-1" style={{ marginLeft: `${12 + (depth + 1) * 16}px` }}>
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={createState.name}
                  onChange={(e) => setCreateState(prev => prev ? { ...prev, name: e.target.value } : null)}
                  onBlur={() => setCreateState(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createState.name.trim()) {
                      createFileOrFolder(createState.type, createState.parentPath, createState.name.trim())
                    } else if (e.key === 'Escape') {
                      setCreateState(null)
                    }
                  }}
                  placeholder={createState.type === 'file' ? 'filename.ext' : 'foldername'}
                  className="flex-1 bg-[#2a2a2a] text-white border border-[#444] rounded px-2 py-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => createState.name.trim() && createFileOrFolder(createState.type, createState.parentPath, createState.name.trim())}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Create
                </button>
                <button
                  onClick={() => setCreateState(null)}
                  className="px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Render children */}
          {node.type === 'folder' && isExpanded && node.children && (
            <div className="mt-1">
              {node.children.length > 0 ? (
                renderTree(node.children, depth + 1)
              ) : (
                <div className="text-gray-500 text-xs italic px-4 py-2">
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
    getFileIcon, 
    buildFullPath,
    handleContextMenu
  ])

  return (
    <div ref={explorerRef} className={cn('bg-[#181818] border-r border-[#333] flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-3 border-b border-[#333] bg-[#181818] flex items-center justify-between flex-shrink-0">
        {!isMinimized && (
          <div className="flex-1 mr-2">
            {isPathEditing ? (
              <input
                ref={pathInputRef}
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onBlur={handlePathChange}
                onKeyDown={handlePathKeyDown}
                className="w-full bg-[#2a2a2a] text-white border border-[#444] rounded px-2 py-1 text-sm"
                placeholder="Enter path..."
                autoFocus
              />
            ) : (
              <div 
                className="text-sm text-white cursor-pointer hover:bg-[#2a2a2a] rounded px-2 py-1 transition-colors"
                onClick={() => {
                  setIsPathEditing(true)
                  setTimeout(() => pathInputRef.current?.focus(), 0)
                }}
                title="Click to edit path"
              >
                {currentPath}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-1">
          {!isMinimized && (
            <>
              <button
                title="Refresh"
                className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
                onClick={() => onRefresh && onRefresh()}
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
              <button
                title="New File"
                className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
                onClick={() => {
                  console.log('New File button clicked');
                  handleCreate('file', null);
                }}
              >
                <FilePlus className="w-4 h-4 text-white" />
              </button>
              <button
                title="New Folder"
                className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
                onClick={() => {
                  console.log('New Folder button clicked');
                  handleCreate('folder', null);
                }}
              >
                <FolderPlus className="w-4 h-4 text-white" />
              </button>
            </>
          )}
          {onMinimize && showMinimizeButton && (
            <button
              title={isMinimized ? "Expand Explorer" : "Minimize Explorer"}
              className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
              onClick={onMinimize}
            >
              {isMinimized ? (
                <ChevronRight className="w-4 h-4 text-white" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-white" />
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
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {localTree.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No files or folders
              </div>
            ) : (
              <>
                {renderTree(localTree)}
                {/* Show create input at root level when creating at root */}
                {createState?.isActive && createState.parentPath === null && (
                  <div className="mt-2 ml-2">
                    <div className="flex items-center gap-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={createState.name}
                        onChange={(e) => setCreateState(prev => prev ? { ...prev, name: e.target.value } : null)}
                        onBlur={() => setCreateState(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && createState.name.trim()) {
                            createFileOrFolder(createState.type, createState.parentPath, createState.name.trim())
                          } else if (e.key === 'Escape') {
                            setCreateState(null)
                          }
                        }}
                        placeholder={createState.type === 'file' ? 'filename.ext' : 'foldername'}
                        className="flex-1 bg-[#2a2a2a] text-white border border-[#444] rounded px-2 py-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => createState.name.trim() && createFileOrFolder(createState.type, createState.parentPath, createState.name.trim())}
                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setCreateState(null)}
                        className="px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && contextMenu.node && (
        <div
          className="fixed z-50 bg-[#181818] border border-[#333] rounded shadow-lg py-1 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            className="flex items-center px-3 py-2 text-sm text-white hover:bg-[#2a2a2a] w-full text-left"
            onClick={() => handleRename(contextMenu.node!)}
          >
            <Edit2 className="w-4 h-4 mr-2" /> Rename
          </button>
          <button
            className="flex items-center px-3 py-2 text-sm text-white hover:bg-[#2a2a2a] w-full text-left"
            onClick={() => handleDelete(contextMenu.node!)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </button>
          {contextMenu.node.type === 'folder' && (
            <>
              <div className="border-t border-[#333] my-1" />
              <button
                className="flex items-center px-3 py-2 text-sm text-white hover:bg-[#2a2a2a] w-full text-left"
                onClick={() => handleCreate('file', contextMenu.node!.path)}
              >
                <FilePlus className="w-4 h-4 mr-2" /> New File
              </button>
              <button
                className="flex items-center px-3 py-2 text-sm text-white hover:bg-[#2a2a2a] w-full text-left"
                onClick={() => handleCreate('folder', contextMenu.node!.path)}
              >
                <FolderPlus className="w-4 h-4 mr-2" /> New Folder
              </button>
            </>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#181818] p-6 rounded-lg border border-[#333] shadow-xl">
            <h3 className="text-white text-lg mb-2">Delete {deleteNode.type}</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete "{deleteNode.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 bg-[#2a2a2a] text-white rounded hover:bg-[#3a3a3a] transition-colors"
                onClick={() => setDeleteNode(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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