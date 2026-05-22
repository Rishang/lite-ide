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
    <div className="flex bg-[#191d23] overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const isActive = tab === activeTab
        const isDirty = dirtyTabs.includes(tab)

        return (
          <div
            key={tab}
            className={cn(
              'flex items-center px-3 py-[3px] cursor-pointer text-[12px] min-w-0 relative select-none group',
              isActive
                ? 'bg-[#1f2329] text-white'
                : 'bg-[#252a32] text-[#828997] hover:bg-[#252a32]/80'
            )}
            onClick={() => onTabSelect(tab)}
          >
            {/* Active tab top border */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#e5c07b]" />
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
            <div className="ml-2 w-4 h-4 flex items-center justify-center flex-shrink-0">
              {isDirty && !isActive ? (
                <span className="w-2 h-2 rounded-full bg-white/60 block" />
              ) : (
                <button
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    isDirty
                      ? "text-white/60"
                      : "opacity-0 group-hover:opacity-100",
                    "hover:text-[#e06c75] hover:bg-[#e06c75]/15"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onTabClose(tab)
                  }}
                >
                  {isDirty ? (
                    <span className="w-2 h-2 rounded-full bg-white/80 block" />
                  ) : (
                    <X className="w-3 h-3" />
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