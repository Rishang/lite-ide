'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getFileIcon } from '@/components/FileExplorer'

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

  if (tabs.length === 0) return null

  return (
    <div className="flex bg-[#252526] overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const isActive = tab === activeTab
        const isDirty = dirtyTabs.includes(tab)

        return (
          <div
            key={tab}
            className={cn(
              'flex items-center px-3 py-[6px] cursor-pointer text-[13px] min-w-0 relative border-r border-[#252526] select-none group',
              isActive
                ? 'bg-[#1e1e1e] text-white'
                : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2d2d2d]/80'
            )}
            onClick={() => onTabSelect(tab)}
          >
            {/* Active tab top border */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#007acc]" />
            )}

            {/* File icon */}
            <div className="flex-shrink-0 mr-2">
              {getFileIcon(getFileName(tab))}
            </div>

            <span className={cn(
              "truncate max-w-40",
              isActive && "text-white"
            )}>
              {getFileName(tab)}
            </span>

            {/* Dirty indicator or close button */}
            <div className="ml-2 w-5 h-5 flex items-center justify-center flex-shrink-0">
              {isDirty && !isActive ? (
                <span className="w-2 h-2 rounded-full bg-white/60 block" />
              ) : (
                <button
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    isDirty
                      ? "text-white/60"
                      : "opacity-0 group-hover:opacity-100",
                    "hover:bg-[#505050]"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onTabClose(tab)
                  }}
                >
                  {isDirty ? (
                    <span className="w-2 h-2 rounded-full bg-white/80 block" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}