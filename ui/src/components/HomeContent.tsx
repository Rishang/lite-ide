'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronRight } from 'lucide-react'
import { FileExplorer } from '@/components/FileExplorer'
import { Editor } from '@/components/Editor'
import { TabBar } from '@/components/TabBar'
import { ResizablePanel } from '@/components/ResizablePanel'
import { FileNode } from '@/types/file'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { config } from '@/utils/config'

// Dynamically import TerminalPanel with SSR disabled
const TerminalPanel = dynamic(() => import('@/components/TerminalPanel').then(mod => ({ default: mod.TerminalPanel })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-muted-foreground">Loading terminal...</div>
})

export function HomeContent() {
  const [tree, setTree] = useState<FileNode[]>([])
  const [tabs, setTabs] = useState<Map<string, { content: string; dirty: boolean }>>(new Map())
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState<string>('.')
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(config.showEditor ? true : config.showTerminal)
  const [isTerminalMinimized, setIsTerminalMinimized] = useState<boolean>(config.showEditor ? false : !config.showTerminal)
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false)
  const [explorerWidth, setExplorerWidth] = useState(256) // 256px = w-64
  const [isResizing, setIsResizing] = useState(false)
  const [isExplorerMinimized, setIsExplorerMinimized] = useState(!config.showEditor)
  const [lastExplorerWidth, setLastExplorerWidth] = useState(256)
  const [windowHeight, setWindowHeight] = useState(600)
  const searchParams = useSearchParams()

  useEffect(() => {
    const pathParam = searchParams.get('p')
    // Set currentPath to the URL parameter value, or '.' if not present
    setCurrentPath(pathParam || '.')
    refreshTree()
  }, [searchParams])

  // Get window height safely on client side
  useEffect(() => {
    const updateWindowHeight = () => {
      setWindowHeight(window.innerHeight)
    }
    
    updateWindowHeight()
    window.addEventListener('resize', updateWindowHeight)
    
    return () => {
      window.removeEventListener('resize', updateWindowHeight)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        if (!config.showEditor) {
          // When no editor, toggle terminal visibility completely
          setIsTerminalOpen(prev => !prev)
          setIsTerminalMinimized(false)
        } else {
          // When editor is present, just minimize/maximize terminal
          setIsTerminalMinimized(prev => {
            const newMinimized = !prev
            // If we're unminimizing, focus the terminal
            if (!newMinimized) {
              setTimeout(() => {
                // Dispatch custom event to focus terminal
                window.dispatchEvent(new Event('focusTerminal'))
              }, 100)
            }
            return newMinimized
          })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // SSE connection for real-time file tree updates
  useEffect(() => {
    let eventSource: EventSource | null = null

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close()
      }

      eventSource = new EventSource(`${config.apiEndpoint}/api/watch?root=${encodeURIComponent(currentPath)}`)
      
      eventSource.onmessage = (event) => {
        try {
          const newTree = JSON.parse(event.data) as FileNode[]
          setTree(newTree)
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE error:', error)
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (eventSource?.readyState === EventSource.CLOSED) {
            connectSSE()
          }
        }, 3000)
      }
    }

    connectSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [currentPath])

  useEffect(() => {
    const handleRefresh = () => refreshTree()
    window.addEventListener('refreshTree', handleRefresh)
    return () => window.removeEventListener('refreshTree', handleRefresh)
  }, [])

  // Handle explorer resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(200, Math.min(600, e.clientX))
        setExplorerWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true })
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const refreshTree = async () => {
    try {
      const response = await fetch(`${config.apiEndpoint}/api/files?root=${encodeURIComponent(currentPath)}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setTree(data)
    } catch (error) {
      console.error('Failed to load file tree:', error)
    }
  }

  const openFile = async (path: string) => {
    try {
      const response = await fetch(`${config.apiEndpoint}/api/files${path}?root=${encodeURIComponent(currentPath)}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const content = await response.text()
      const newTabs = new Map(tabs)
      newTabs.set(path, { content, dirty: false })
      setTabs(newTabs)
      setActiveTab(path)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  const saveFile = async (path: string, content: string) => {
    try {
      const response = await fetch(`${config.apiEndpoint}/api/files${path}?root=${encodeURIComponent(currentPath)}`, {
        method: 'PUT',
        body: content
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const newTabs = new Map(tabs)
      const tab = newTabs.get(path)
      if (tab) {
        tab.dirty = false
        setTabs(newTabs)
      }
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }

  const closeTab = (path: string) => {
    const newTabs = new Map(tabs)
    newTabs.delete(path)
    setTabs(newTabs)
    if (activeTab === path) {
      setActiveTab(newTabs.size > 0 ? Array.from(newTabs.keys())[0] : null)
    }
  }

  const updateTabContent = (path: string, content: string) => {
    const newTabs = new Map(tabs)
    const tab = newTabs.get(path)
    if (tab) {
      tab.content = content
      tab.dirty = true
      setTabs(newTabs)
    }
  }

  // Handle file renaming - update tabs when a file is renamed
  const handleFileRename = (oldPath: string, newPath: string) => {
    const newTabs = new Map(tabs)
    const tabData = newTabs.get(oldPath)

    if (tabData) {
      // Remove the old path and add the new path
      newTabs.delete(oldPath)
      newTabs.set(newPath, tabData)
      setTabs(newTabs)

      // Update active tab if it was the renamed file
      if (activeTab === oldPath) {
        setActiveTab(newPath)
      }
    }
  }

  // Check if a file is dirty (has unsaved changes)
  const checkFileDirty = (path: string): boolean => {
    const tab = tabs.get(path)
    return tab ? tab.dirty : false
  }

  // Save a specific file
  const saveSpecificFile = async (path: string): Promise<void> => {
    const tab = tabs.get(path)
    if (tab) {
      await saveFile(path, tab.content)
    }
  }

  // Handle terminal maximize
  const handleTerminalMaximize = () => {
    setIsTerminalMaximized(!isTerminalMaximized)
  }

  const getLanguageFromPath = (path: string) => {
    const { getLanguageFromPath: getLang } = require('@/lib/common')
    return getLang(path)
  }

  const getThemeForLanguage = (language: string) => {
    const { getThemeForLanguage: getTheme } = require('@/lib/common')
    return getTheme(language)
  }

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-white overflow-hidden">
      {config.showEditor && (
        <>
          <div style={{ width: isExplorerMinimized ? '48px' : `${explorerWidth}px` }} className={`flex-shrink-0 transition-all duration-75 ${isExplorerMinimized ? 'overflow-hidden' : ''}`}>
            <FileExplorer
              tree={tree}
              onFileOpen={openFile}
              onFileRename={handleFileRename}
              onCheckFileDirty={checkFileDirty}
              onSaveFile={saveSpecificFile}
              className="h-full"
              currentPath={currentPath}
              onRefresh={refreshTree}
              onMinimize={() => {
                setIsExplorerMinimized(prev => {
                  const newMinimized = !prev
                  if (newMinimized) {
                    setLastExplorerWidth(explorerWidth)
                    setExplorerWidth(0)
                  } else {
                    setExplorerWidth(lastExplorerWidth)
                  }
                  return newMinimized
                })
              }}
              isMinimized={isExplorerMinimized}
              showMinimizeButton={config.showEditor}
            />
          </div>

          {/* Resizable border */}
          <div
            className="w-1 bg-[#333] hover:bg-[#555] cursor-col-resize flex-shrink-0"
            onMouseDown={handleResizeStart}
            style={{ cursor: isResizing ? 'col-resize' : 'col-resize' }}
          />
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Editor Area */}
        {config.showEditor && !isTerminalMaximized && (
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <TabBar
              tabs={Array.from(tabs.keys())}
              activeTab={activeTab}
              dirtyTabs={Array.from(tabs.entries()).filter(([_, tab]) => tab.dirty).map(([path]) => path)}
              onTabSelect={setActiveTab}
              onTabClose={closeTab}
            />
            <div className="flex-1 min-h-0 min-w-0 bg-[#1e1e1e] overflow-hidden">
              <Editor
                content={activeTab ? tabs.get(activeTab)?.content || '' : ''}
                path={activeTab || ''}
                language={activeTab ? getLanguageFromPath(activeTab) : 'text'}
                theme={activeTab ? getThemeForLanguage(getLanguageFromPath(activeTab)) : 'vs-dark'}
                onChange={(content: string) => activeTab && updateTabContent(activeTab, content)}
                onSave={() => activeTab && saveFile(activeTab, tabs.get(activeTab)?.content || '')}
              />
            </div>
          </div>
        )}

        {/* Terminal Panel */}
        {config.showTerminal && (
          <ResizablePanel
            defaultHeight={config.showEditor ? 300 : windowHeight}
            minHeight={32}
            maxHeight={windowHeight * 0.7}
            className={`${isTerminalMinimized ? 'hidden' : ''} ${isTerminalMaximized ? 'flex-1' : ''}`}
            showResizeHandle={config.showEditor}
          >
            <TerminalPanel onMaximize={handleTerminalMaximize} />
          </ResizablePanel>
        )}
      </div>
    </div>
  )
} 