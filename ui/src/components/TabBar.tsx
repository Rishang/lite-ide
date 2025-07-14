'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabBarProps {
  tabs: string[]
  activeTab: string | null
  dirtyTabs: string[]
  onTabSelect: (path: string) => void
  onTabClose: (path: string) => void
}

export function TabBar({ tabs, activeTab, dirtyTabs, onTabSelect, onTabClose }: TabBarProps) {
  const getFileName = (path: string) => {
    return path.split('/').pop() || path
  }

  return (
    <div className="flex bg-[#181818] border-b border-[#333]">
      {tabs.map((tab) => {
        const isActive = tab === activeTab
        const isDirty = dirtyTabs.includes(tab)
        
        return (
          <div
            key={tab}
            className={cn(
              'flex items-center px-4 py-2 border-r border-[#333] cursor-pointer text-sm transition-all duration-200 min-w-0',
              isActive 
                ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500' 
                : 'bg-[#181818] text-gray-300 hover:bg-[#2a2a2a] hover:text-white'
            )}
            onClick={() => onTabSelect(tab)}
          >
            <span className={cn("truncate max-w-32 font-medium flex-1")}>
              {getFileName(tab)}
              {isDirty && <span className="text-blue-400 ml-1 font-bold">•</span>}
            </span>
            <button
              className="ml-2 p-1 hover:bg-red-600/20 hover:text-red-400 rounded transition-colors duration-200 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab)
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
} 