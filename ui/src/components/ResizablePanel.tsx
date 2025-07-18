'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface ResizablePanelProps {
  children: ReactNode
  defaultHeight?: number
  minHeight?: number
  maxHeight?: number
  className?: string
  showResizeHandle?: boolean
}

export function ResizablePanel({ 
  children, 
  defaultHeight = 300, 
  minHeight = 100, 
  maxHeight = 600,
  className = '',
  showResizeHandle = true
}: ResizablePanelProps) {
  const [height, setHeight] = useState(defaultHeight)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return
      
      const rect = panelRef.current.getBoundingClientRect()
      const newHeight = rect.bottom - e.clientY
      
      // Clamp the height between min and max
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))
      setHeight(clampedHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, minHeight, maxHeight])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  return (
    <div 
      ref={panelRef}
      className={`flex flex-col mt-2 ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* Resize handle - only show if showResizeHandle is true */}
      {showResizeHandle && (
        <div
          className="h-1 bg-[#333] hover:bg-blue-500 cursor-ns-resize transition-colors duration-200 relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-0 -top-1 -bottom-1" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-[#666] rounded opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
      
      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
} 