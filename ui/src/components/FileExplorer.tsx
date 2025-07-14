'use client'

import { useState, useRef, useEffect } from 'react'
import { FileNode } from '@/types/file'
import { Folder, File, ChevronRight, ChevronDown, Code, FileText, Database, Image, Archive, Plus, FolderPlus, MoreVertical, Trash2, Edit2, FilePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileExplorerProps {
  tree: FileNode[]
  onFileOpen: (path: string) => void
  className?: string
  currentPath: string
}

export function FileExplorer({ tree, onFileOpen, className, currentPath }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null)
  const [showCreate, setShowCreate] = useState<{ type: 'file' | 'folder'; parent: string | null } | null>(null)
  const [showRename, setShowRename] = useState<FileNode | null>(null)
  const [showDelete, setShowDelete] = useState<FileNode | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const explorerRef = useRef<HTMLDivElement>(null)
  const [refreshFlag, setRefreshFlag] = useState(0)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (explorerRef.current && !explorerRef.current.contains(event.target as Node)) {
        setShowCreate(null)
        setShowRename(null)
        setShowDelete(null)
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Refresh tree when needed
  useEffect(() => {
    // This will trigger parent to reload tree
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('refreshTree')
      window.dispatchEvent(event)
    }
  }, [refreshFlag])

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'js':
      case 'jsx':
        return <Code className="w-4 h-4 mr-2 text-white" />
      case 'ts':
      case 'tsx':
        return <Code className="w-4 h-4 mr-2 text-white" />
      case 'py':
        return <Code className="w-4 h-4 mr-2 text-white" />
      case 'go':
        return <Code className="w-4 h-4 mr-2 text-white" />
      case 'html':
        return <FileText className="w-4 h-4 mr-2 text-white" />
      case 'css':
        return <FileText className="w-4 h-4 mr-2 text-white" />
      case 'json':
        return <Database className="w-4 h-4 mr-2 text-white" />
      case 'md':
        return <FileText className="w-4 h-4 mr-2 text-white" />
      default:
        return <File className="w-4 h-4 mr-2 text-gray-400" />
    }
  }

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const handleCreate = (type: 'file' | 'folder', parent: string | null) => {
    setShowCreate({ type, parent })
    setContextMenu(null)
  }

  const handleRename = (node: FileNode) => {
    setShowRename(node)
    setContextMenu(null)
  }

  const handleDelete = (node: FileNode) => {
    setShowDelete(node)
    setContextMenu(null)
  }

  // API helpers
  const createNode = async (type: 'file' | 'folder', name: string, parent: string | null) => {
    let path = parent ? `${parent}/${name}` : `/${name}`
    await fetch(`/api/files?root=${encodeURIComponent(currentPath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, type })
    })
    setShowCreate(null)
    setRefreshFlag(f => f + 1)
  }

  const renameNode = async (node: FileNode, newName: string) => {
    const parentPath = node.path.split('/').slice(0, -1).join('/') || '/'
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`
    await fetch(`/api/files${node.path}?root=${encodeURIComponent(currentPath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPath })
    })
    setShowRename(null)
    setRefreshFlag(f => f + 1)
  }

  const deleteNode = async (node: FileNode) => {
    await fetch(`/api/files${node.path}?root=${encodeURIComponent(currentPath)}`, { method: 'DELETE' })
    setShowDelete(null)
    setRefreshFlag(f => f + 1)
  }

  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.path)
    const hasChildren = node.children && node.children.length > 0
    const isRenaming = showRename && showRename.path === node.path
    return (
      <div key={node.path} onContextMenu={(e) => handleContextMenu(e, node)}>
        <div
          className={cn(
            'flex items-center px-3 py-2 hover:bg-accent/50 cursor-pointer text-sm transition-colors duration-200 rounded-md mx-2',
            depth > 0 && 'ml-4'
          )}
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
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 mr-1 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-1 text-muted-foreground" />
                )
              ) : (
                <div className="w-4 h-4 mr-1" />
              )}
              <Folder className="w-4 h-4 mr-2 text-blue-500" />
            </>
          ) : (
            getFileIcon(node.name)
          )}
          {isRenaming ? (
            <input
              ref={inputRef}
              className="bg-background text-white border border-border rounded px-1 py-0.5 w-32 ml-1"
              defaultValue={node.name}
              onBlur={() => setShowRename(null)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  await renameNode(node, (e.target as HTMLInputElement).value)
                } else if (e.key === 'Escape') {
                  setShowRename(null)
                }
              }}
              autoFocus
            />
          ) : (
            <span className="truncate font-medium text-white">{node.name}</span>
          )}
        </div>
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={explorerRef} className={cn('bg-[#23272e] border-r border-border overflow-y-auto', className)}>
      <div className="p-4 border-b border-border bg-[#23272e] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Explorer</h2>
        <div className="flex gap-2">
          <button title="New File" className="p-1 hover:bg-accent/30 rounded" onClick={() => handleCreate('file', null)}>
            <FilePlus className="w-4 h-4 text-white" />
          </button>
          <button title="New Folder" className="p-1 hover:bg-accent/30 rounded" onClick={() => handleCreate('folder', null)}>
            <FolderPlus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <div className="p-2">
        {/* Show create input if needed */}
        {showCreate && (
          <div className="flex items-center mb-2">
            <input
              ref={inputRef}
              className="bg-background text-white border border-border rounded px-1 py-0.5 w-32 mr-2"
              placeholder={showCreate.type === 'file' ? 'New file name' : 'New folder name'}
              onBlur={() => setShowCreate(null)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  await createNode(showCreate.type, (e.target as HTMLInputElement).value, showCreate.parent)
                } else if (e.key === 'Escape') {
                  setShowCreate(null)
                }
              }}
              autoFocus
            />
            <button className="text-xs text-white px-2 py-1 bg-accent rounded ml-1" onClick={async () => {
              if (inputRef.current) {
                await createNode(showCreate.type, inputRef.current.value, showCreate.parent)
              }
            }}>Create</button>
          </div>
        )}
        {tree.map((node) => renderNode(node))}
      </div>
      {/* Context Menu */}
      {contextMenu && contextMenu.node && (
        <div
          className="fixed z-50 bg-[#23272e] border border-border rounded shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button className="flex items-center px-4 py-1 text-white hover:bg-accent/30 w-full" onClick={() => handleRename(contextMenu.node!)}>
            <Edit2 className="w-4 h-4 mr-2" /> Rename
          </button>
          <button className="flex items-center px-4 py-1 text-white hover:bg-accent/30 w-full" onClick={() => handleDelete(contextMenu.node!)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </button>
          {contextMenu.node.type === 'folder' && (
            <>
              <button className="flex items-center px-4 py-1 text-white hover:bg-accent/30 w-full" onClick={() => handleCreate('file', contextMenu.node!.path)}>
                <FilePlus className="w-4 h-4 mr-2" /> New File
              </button>
              <button className="flex items-center px-4 py-1 text-white hover:bg-accent/30 w-full" onClick={() => handleCreate('folder', contextMenu.node!.path)}>
                <FolderPlus className="w-4 h-4 mr-2" /> New Folder
              </button>
            </>
          )}
        </div>
      )}
      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowDelete(null)}>
          <div className="bg-[#23272e] p-6 rounded shadow-lg border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="text-white mb-4">Delete <span className="font-bold">{showDelete.name}</span>? This cannot be undone.</div>
            <div className="flex gap-4 justify-end">
              <button className="px-3 py-1 rounded bg-muted text-white" onClick={() => setShowDelete(null)}>Cancel</button>
              <button className="px-3 py-1 rounded bg-destructive text-white" onClick={async () => { await deleteNode(showDelete); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 