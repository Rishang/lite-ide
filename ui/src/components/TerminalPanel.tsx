'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import Terminal component with SSR disabled
const Terminal = dynamic(() => import('./Terminal').then(mod => ({ default: mod.Terminal })), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-muted-foreground">Loading terminal...</div>
})

interface TerminalTab {
  id: string
  name: string
}

export function TerminalPanel() {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'terminal-1', name: 'Terminal 1' }
  ])
  const [activeTab, setActiveTab] = useState<string>('terminal-1')

  const createNewTab = () => {
    const newId = `terminal-${tabs.length + 1}`
    const newTab = { id: newId, name: `Terminal ${tabs.length + 1}` }
    setTabs([...tabs, newTab])
    setActiveTab(newId)
  }

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return // Don't close the last tab
    
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)
    
    if (activeTab === tabId) {
      setActiveTab(newTabs[0]?.id || '')
    }
  }

  return (
    <div className="h-full flex flex-col bg-background border-t border-border">
      {/* Tab Bar */}
      <div className="flex items-center bg-muted/30 border-b border-border">
        <div className="flex items-center">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`
                flex items-center px-3 py-2 text-sm border-r border-border cursor-pointer
                ${activeTab === tab.id 
                  ? 'bg-background text-foreground' 
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="mr-2">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="ml-1 hover:bg-muted rounded p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={createNewTab}
          className="flex items-center px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          title="New Terminal"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 bg-background">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`h-full ${activeTab === tab.id ? 'block' : 'hidden'}`}
          >
            <Terminal />
          </div>
        ))}
      </div>
    </div>
  )
} 