'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Maximize2, ChevronDown, ChevronUp } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTerminal } from '@fortawesome/free-solid-svg-icons'
import dynamic from 'next/dynamic'

const Terminal = dynamic(
  () => import('./Terminal').then(mod => ({ default: mod.Terminal })),
  {
    ssr: false,
    loading: () => <TerminalSkeleton />,
  }
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface TerminalInstance {
  id: string
  label: string   // e.g. "zsh"
  cwd?: string    // e.g. "lab-images"
  pid?: number
}

interface TerminalState {
  instances: TerminalInstance[]
  activeId: string
}

interface TerminalPanelProps {
  onMaximize?: () => void
  onMinimize?: () => void
  onClose?: () => void
  isMaximized?: boolean
  isMinimized?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

export function TerminalPanel({ onMaximize, onMinimize, onClose, isMaximized, isMinimized }: TerminalPanelProps) {
  const counterRef = useRef(1)
  const [terminalState, setTerminalState] = useState<TerminalState>({
    instances: [{ id: 'term-1', label: 'zsh 1' }],
    activeId: 'term-1',
  })
  const { instances, activeId } = terminalState

  // Auto-focus terminal when active instance changes
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('focusTerminal', { detail: { id: activeId } }))
    }, 50)
  }, [activeId])

  // Re-focus active terminal when the panel is opened via keyboard shortcut
  useEffect(() => {
    const handler = () => {
      window.dispatchEvent(new CustomEvent('focusTerminal', { detail: { id: activeId } }))
    }
    window.addEventListener('terminalPanelOpened', handler)
    return () => window.removeEventListener('terminalPanelOpened', handler)
  }, [activeId])

  const addInstance = () => {
    const num = ++counterRef.current
    const id = `term-${num}`
    setTerminalState(prev => ({
      instances: [...prev.instances, { id, label: `zsh ${num}` }],
      activeId: id,
    }))
  }

  const closeActiveInstance = (e: React.MouseEvent) => {
    e.stopPropagation()

    setTerminalState(prev => {
      if (prev.instances.length === 1) return prev

      const closingIndex = prev.instances.findIndex(inst => inst.id === prev.activeId)
      const next = prev.instances.filter(inst => inst.id !== prev.activeId)
      const nextActive = next[Math.min(Math.max(closingIndex, 0), next.length - 1)]?.id ?? next[0]?.id ?? prev.activeId

      return {
        instances: next,
        activeId: nextActive,
      }
    })
  }

  const selectInstance = (id: string) => {
    setTerminalState(prev => (
      prev.activeId === id ? prev : { ...prev, activeId: id }
    ))
  }

  return (
    <div className="h-full flex flex-col bg-[#1f2329] select-none font-['Segoe_UI',system-ui,sans-serif] border-t border-[#2b3038]">
      <div className="flex h-6 shrink-0 items-center justify-between bg-[#1b1f26]">
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full items-center gap-0.5 overflow-x-auto scrollbar-thin px-1">
            {instances.map(inst => {
              const isActive = activeId === inst.id

              return (
                <div
                  key={inst.id}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isActive}
                  onClick={() => selectInstance(inst.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectInstance(inst.id)
                    }
                  }}
                  className={[
                    'group relative flex h-5 shrink-0 cursor-pointer items-center gap-2 px-2 text-[11px] outline-none transition-colors duration-75 focus-visible:bg-[#252a32]',
                    isActive
                      ? 'bg-[#252a32] text-[#d7dce5]'
                      : 'text-[#7f8794] hover:bg-[#222832] hover:text-[#c4cad4]',
                  ].join(' ')}
                >
                  {isActive && (
                    <span className="absolute left-1 right-1 bottom-0 h-[1px] bg-[#e5c07b]" />
                  )}
                  <FontAwesomeIcon icon={faTerminal} className="shrink-0 text-[10px] text-[#6f7784] w-[11px]" />
                  <span className="truncate normal-case tracking-normal font-normal">{inst.label}</span>
                  {isActive && instances.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Close ${inst.label}`}
                      onClick={closeActiveInstance}
                      className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#7f8794] hover:bg-[#343b47] hover:text-[#d7dce5]"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              title="New Terminal"
              onClick={addInstance}
              className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#828997] hover:text-[#d7dce5] hover:bg-[#252a32] transition-colors duration-100"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center shrink-0 px-1 gap-0.5">
          {onMinimize && (
            <ActionBtn title={isMinimized ? "Restore Panel" : "Minimize Panel"} onClick={onMinimize}>
              {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </ActionBtn>
          )}
          <Divider />
          {onMaximize && (
            <ActionBtn title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'} onClick={onMaximize}>
              <Maximize2 size={13} />
            </ActionBtn>
          )}
          {onClose && (
            <ActionBtn title="Close Panel" onClick={onClose}>
              <X size={14} />
            </ActionBtn>
          )}
        </div>
      </div>

      <div className={`flex-1 flex min-w-0 min-h-0 overflow-hidden bg-[#1f2329] ${isMinimized ? 'hidden' : ''}`}>
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-[#1f2329]">
          {instances.map(inst => (
              <div
                key={inst.id}
                className={`h-full w-full min-w-0 overflow-hidden ${activeId === inst.id ? 'block' : 'hidden'}`}
              >
                <Terminal id={inst.id} />
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode
  title?: string
  onClick?: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center w-5 h-5 rounded text-[#828997] hover:text-[#d7dce5] hover:bg-[#252a32] transition-colors duration-100"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-4 bg-[#2b3038] mx-0.5" />
}

function TerminalSkeleton() {
  return (
    <div className="h-full w-full bg-[#1f2329] px-3 py-2 font-mono text-[13px] text-[#5c6370]">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[#61afef]">$</span>
        <span className="h-3 w-24 bg-[#252a32]" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-3/4 bg-[#191d23]" />
        <div className="h-3 w-1/2 bg-[#191d23]" />
        <div className="h-3 w-2/3 bg-[#191d23]" />
      </div>
    </div>
  )
}
