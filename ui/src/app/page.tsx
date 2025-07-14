'use client'

import { useState, useEffect } from 'react'
import { FileExplorer } from '@/components/FileExplorer'
import { Editor } from '@/components/Editor'
import { TabBar } from '@/components/TabBar'
import { FileNode } from '@/types/file'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import TerminalPanel with SSR disabled
const TerminalPanel = dynamic(() => import('@/components/TerminalPanel').then(mod => ({ default: mod.TerminalPanel })), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-muted-foreground border-t border-border">Loading terminal...</div>
})

export default function Home() {
  const [tree, setTree] = useState<FileNode[]>([])
  const [tabs, setTabs] = useState<Map<string, { content: string; dirty: boolean }>>(new Map())
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState<string>('/tmp/op')
  const [isTerminalOpen, setIsTerminalOpen] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    const pathParam = searchParams.get('p')
    if (pathParam) {
      setCurrentPath(pathParam)
    }
    refreshTree()
  }, [searchParams])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        setIsTerminalOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const handleRefresh = () => refreshTree()
    window.addEventListener('refreshTree', handleRefresh)
    return () => window.removeEventListener('refreshTree', handleRefresh)
  }, [])

  const refreshTree = async () => {
    try {
      const response = await fetch(`/api/files?root=${encodeURIComponent(currentPath)}`)
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
      const response = await fetch(`/api/files${path}?root=${encodeURIComponent(currentPath)}`)
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
      const response = await fetch(`/api/files${path}?root=${encodeURIComponent(currentPath)}`, {
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

  const getLanguageFromPath = (path: string) => {
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

  const getThemeForLanguage = (language: string) => {
    const themes: Record<string, string> = {
      'javascript': 'vs-dark',
      'typescript': 'vs-dark',
      'python': 'vs-dark',
      'go': 'vs-dark',
      'rust': 'vs-dark',
      'java': 'vs-dark',
      'cpp': 'vs-dark',
      'c': 'vs-dark',
      'html': 'vs-dark',
      'css': 'vs-dark',
      'json': 'vs-dark',
      'yaml': 'vs-dark',
      'markdown': 'vs-dark',
      'shell': 'vs-dark',
      'php': 'vs-dark',
      'ruby': 'vs-dark',
      'xml': 'vs-dark',
      'sql': 'vs-dark',
      'text': 'vs-dark'
    }
    return themes[language] || 'vs-dark'
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <FileExplorer
        tree={tree}
        onFileOpen={openFile}
        className="w-64 border-r border-border"
        currentPath={currentPath}
      />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col min-h-0">
          <TabBar
            tabs={Array.from(tabs.keys())}
            activeTab={activeTab}
            dirtyTabs={Array.from(tabs.entries()).filter(([_, tab]) => tab.dirty).map(([path]) => path)}
            onTabSelect={setActiveTab}
            onTabClose={closeTab}
          />
          <div className="flex-1 flex flex-col">
            <Editor
              content={activeTab ? tabs.get(activeTab)?.content || '' : ''}
              path={activeTab || ''}
              language={activeTab ? getLanguageFromPath(activeTab) : 'text'}
              theme={activeTab ? getThemeForLanguage(getLanguageFromPath(activeTab)) : 'vs-dark'}
              onChange={(content) => activeTab && updateTabContent(activeTab, content)}
              onSave={() => activeTab && saveFile(activeTab, tabs.get(activeTab)?.content || '')}
            />
          </div>
        </div>
        {isTerminalOpen && (
          <div className="h-1/3">
            <TerminalPanel />
          </div>
        )}
      </div>
    </div>
  )
} 