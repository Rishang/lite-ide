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

type PanelSection = 'TERMINAL'

interface TerminalInstance {
  id: string
  label: string   // e.g. "zsh"
  cwd?: string    // e.g. "lab-images"
  pid?: number
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
  const [activeSection, setActiveSection] = useState<PanelSection>('TERMINAL')
  const counterRef = useRef(1)
  const [instances, setInstances] = useState<TerminalInstance[]>([
    { id: 'term-1', label: 'zsh 1' },
  ])
  const [activeId, setActiveId] = useState<string>('term-1')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const sections: PanelSection[] = ['TERMINAL']

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
    setInstances(prev => [...prev, { id, label: `zsh ${num}` }])
    setActiveId(id)
    setActiveSection('TERMINAL')
  }

  const removeInstance = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (instances.length === 1) return
    const next = instances.filter(i => i.id !== id)
    setInstances(next)
    if (activeId === id) setActiveId(next[next.length - 1].id)
  }

  return (
    <div className="h-full flex flex-col bg-[#1f2329] select-none font-['Segoe_UI',system-ui,sans-serif] border-t border-[#111318]">

      {/* ── Top Tab Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-stretch justify-between bg-[#191d23] border-b border-[#1a1d23] shrink-0 h-[26px]">

        {/* Section tabs */}
        <div className="flex items-stretch overflow-x-auto scrollbar-none pl-2">
        </div>

        {/* Right-side action buttons */}
        <div className="flex items-center shrink-0 px-1 gap-0.5">
          <ActionBtn title="New Terminal" onClick={addInstance}>
            <Plus size={14} />
          </ActionBtn>
          <Divider />
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

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex overflow-hidden bg-[#1f2329] ${isMinimized ? 'hidden' : ''}`}>

        {/* Terminal viewports */}
        <div className="flex-1 overflow-hidden bg-[#1f2329]">
          {instances.map(inst => (
              <div
                key={inst.id}
                className={`h-full ${activeId === inst.id ? 'block' : 'hidden'}`}
              >
                <Terminal id={inst.id} />
              </div>
            ))
          }
        </div>

        {/* ── Right instance list ──────────────────────────────────────── */}
        {activeSection === 'TERMINAL' && (
          <div className="w-[172px] shrink-0 bg-[#191d23] border-l border-[#111318] flex flex-col overflow-y-auto py-1">
            {instances.map(inst => {
              const isActive = activeId === inst.id
              const isHovered = hoveredId === inst.id
              return (
                <div
                  key={inst.id}
                  onClick={() => setActiveId(inst.id)}
                  onMouseEnter={() => setHoveredId(inst.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={[
                    'group flex h-[28px] items-center justify-between px-3 cursor-pointer text-[12px] relative transition-colors duration-75',
                    isActive
                      ? 'bg-[#252a32] text-[#abb2bf]'
                      : 'text-[#828997] hover:bg-[#252a32] hover:text-[#abb2bf]',
                  ].join(' ')}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute left-0 inset-y-0 w-[2px] bg-[#61afef]" />
                  )}

                  <div className="flex items-center gap-2 min-w-0">
                    {/* Shell icon */}
                    <FontAwesomeIcon icon={faTerminal} className="shrink-0 text-[10px] text-[#5c6370] w-[11px]" />
                    <span className="truncate">{inst.label}</span>
                  </div>

                  {/* Kill button — only show on hover or when active */}
                  {(isHovered || isActive) && instances.length > 1 && (
                    <button
                      onClick={e => removeInstance(inst.id, e)}
                      className="shrink-0 ml-1 flex h-5 w-5 items-center justify-center hover:bg-[#343b47] text-[#5c6370] hover:text-[#abb2bf] transition-colors"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
      className="flex items-center justify-center w-5 h-5 text-[#828997] hover:text-[#abb2bf] hover:bg-[#252a32] transition-colors duration-100"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-4 bg-[#191d23] mx-0.5" />
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


