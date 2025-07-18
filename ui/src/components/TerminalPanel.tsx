'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, ChevronUp } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import Terminal component with SSR disabled
const Terminal = dynamic(() => import('./Terminal').then(mod => ({ default: mod.Terminal })), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-gray-400">Loading terminal...</div>
})

interface TerminalTab {
  id: string
  name: string
}

interface TerminalPanelProps {
  onMaximize?: () => void
}

export function TerminalPanel({ onMaximize }: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'terminal-1', name: 'Terminal 1' }
  ])
  const [activeTab, setActiveTab] = useState<string>('terminal-1')
  const terminalRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

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
    
    // Clean up the ref
    terminalRefs.current.delete(tabId)
  }

  // Focus terminal when tab becomes active
  useEffect(() => {
    if (activeTab) {
      const terminalRef = terminalRefs.current.get(activeTab)
      if (terminalRef && (terminalRef as any).focusTerminal) {
        // Small delay to ensure the terminal is fully rendered
        setTimeout(() => {
          (terminalRef as any).focusTerminal()
        }, 50)
      }
    }
  }, [activeTab])

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Tab Bar */}
      <div className="flex items-center justify-between bg-[#181818] border-b border-[#333]">
        <div className="flex items-center">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`
                flex items-center px-3 py-2 text-sm border-r border-[#333] cursor-pointer transition-colors relative
                ${activeTab === tab.id 
                  ? 'bg-[#1e1e1e] text-white' 
                  : 'bg-[#181818] text-gray-300 hover:bg-[#2a2a2a] hover:text-white'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700"></div>
              )}
              <span className="mr-2">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="ml-1 hover:bg-red-600/20 hover:text-red-400 rounded p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center">
          <button
            onClick={createNewTab}
            className="flex items-center px-2 py-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
            title="New Terminal"
          >
            <Plus size={14} />
          </button>
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="flex items-center px-2 py-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
              title="Maximize Terminal"
            >
              <ChevronUp size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 bg-[#1e1e1e] overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`h-full ${activeTab === tab.id ? 'block' : 'hidden'}`}
            ref={(el) => {
              if (el) {
                terminalRefs.current.set(tab.id, el)
              }
            }}
          >
            <Terminal />
          </div>
        ))}
      </div>
    </div>
  )
} 
