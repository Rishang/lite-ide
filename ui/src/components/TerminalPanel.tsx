'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Maximize2, SplitSquareHorizontal, AlertCircle, AlertTriangle, Info, Lightbulb } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTerminal } from '@fortawesome/free-solid-svg-icons'
import dynamic from 'next/dynamic'
import { MarkerData } from './Editor'

const Terminal = dynamic(
  () => import('./Terminal').then(mod => ({ default: mod.Terminal })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-[#858585] text-sm font-mono">
        Loading terminal...
      </div>
    ),
  }
)

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelSection = 'PROBLEMS' | 'TERMINAL'

interface TerminalInstance {
  id: string
  label: string   // e.g. "zsh"
  cwd?: string    // e.g. "lab-images"
  pid?: number
}

// Monaco MarkerSeverity values
const Severity = { Error: 8, Warning: 4, Info: 2, Hint: 1 } as const

interface TerminalPanelProps {
  onMaximize?: () => void
  onClose?: () => void
  isMaximized?: boolean
  markers?: MarkerData[]
  activeFilePath?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

export function TerminalPanel({ onMaximize, onClose, isMaximized, markers = [], activeFilePath }: TerminalPanelProps) {
  const [activeSection, setActiveSection] = useState<PanelSection>('TERMINAL')
  const counterRef = useRef(1)
  const [instances, setInstances] = useState<TerminalInstance[]>([
    { id: 'term-1', label: 'zsh 1' },
  ])
  const [activeId, setActiveId] = useState<string>('term-1')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const termRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  const sections: PanelSection[] = ['PROBLEMS', 'TERMINAL']

  // Auto-focus terminal when active instance changes
  useEffect(() => {
    const el = termRefs.current.get(activeId) as any
    if (el?.focusTerminal) {
      setTimeout(() => el.focusTerminal(), 50)
    }
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
    termRefs.current.delete(id)
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] select-none font-['Segoe_UI',system-ui,sans-serif]">

      {/* ── Top Tab Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-stretch justify-between bg-[#181818] border-b border-[#252526] shrink-0 h-[35px]">

        {/* Section tabs */}
        <div className="flex items-stretch overflow-x-auto scrollbar-none">
          {sections.map(section => {
            const active = activeSection === section
            return (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={[
                  'px-3 h-full text-[11px] font-medium tracking-widest uppercase whitespace-nowrap transition-colors duration-100',
                  active
                    ? 'text-white bg-[#2d2d2d]'
                    : 'text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#262626]',
                ].join(' ')}
              >
                {section}
                {section === 'PROBLEMS' && markers.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-[#8c8c8c]">{markers.length}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Right-side action buttons */}
        <div className="flex items-center shrink-0 px-1 gap-0.5">
          <ActionBtn title="New Terminal" onClick={addInstance}>
            <Plus size={14} />
          </ActionBtn>
          <Divider />
          <ActionBtn title="Split Terminal">
            <SplitSquareHorizontal size={14} />
          </ActionBtn>
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
      <div className="flex-1 flex overflow-hidden">

        {/* Terminal viewports */}
        <div className="flex-1 overflow-hidden">
          {activeSection === 'PROBLEMS' ? (
            <ProblemsPane markers={markers} activeFilePath={activeFilePath} />
          ) : (
            instances.map(inst => (
              <div
                key={inst.id}
                className={`h-full ${activeId === inst.id ? 'block' : 'hidden'}`}
                ref={el => {
                  if (el) termRefs.current.set(inst.id, el)
                }}
              >
                <Terminal />
              </div>
            ))
          )}
        </div>

        {/* ── Right instance list ──────────────────────────────────────── */}
        {activeSection === 'TERMINAL' && (
          <div className="w-[140px] shrink-0 bg-[#181818] border-l border-[#252526] flex flex-col overflow-y-auto">
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
                    'group flex items-center justify-between px-3 py-[6px] cursor-pointer text-[12px] relative transition-colors duration-75',
                    isActive
                      ? 'bg-[#37373d] text-[#cccccc]'
                      : 'text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-[#cccccc]',
                  ].join(' ')}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute left-0 inset-y-0 w-[2px] bg-[#007fd4]" />
                  )}

                  <div className="flex items-center gap-2 min-w-0">
                    {/* Shell icon */}
                    <FontAwesomeIcon icon={faTerminal} className="shrink-0 text-[10px] text-[#858585] w-[10px]" />
                    <span className="truncate">{inst.label}</span>
                  </div>

                  {/* Kill button — only show on hover or when active */}
                  {(isHovered || isActive) && instances.length > 1 && (
                    <button
                      onClick={e => removeInstance(inst.id, e)}
                      className="shrink-0 ml-1 p-0.5 rounded hover:bg-[#4a4a4a] text-[#858585] hover:text-[#cccccc] transition-colors"
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
      className="flex items-center justify-center w-6 h-6 text-[#9d9d9d] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors duration-100"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-4 bg-[#333] mx-0.5" />
}

function severityOrder(s: number) {
  if (s === Severity.Error) return 0
  if (s === Severity.Warning) return 1
  if (s === Severity.Info) return 2
  return 3
}

function SeverityIcon({ severity }: { severity: number }) {
  if (severity === Severity.Error)
    return <AlertCircle size={14} className="shrink-0 text-[#f14c4c]" />
  if (severity === Severity.Warning)
    return <AlertTriangle size={14} className="shrink-0 text-[#cca700]" />
  if (severity === Severity.Info)
    return <Info size={14} className="shrink-0 text-[#3794ff]" />
  return <Lightbulb size={14} className="shrink-0 text-[#3794ff]" />
}

function getFileName(path: string) {
  return path.split('/').pop() || path
}

function getCodeValue(code: MarkerData['code']): string | undefined {
  if (!code) return undefined
  if (typeof code === 'string') return code
  return code.value
}

function ProblemsPane({ markers, activeFilePath }: { markers: MarkerData[]; activeFilePath?: string | null }) {
  if (markers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[#858585] text-sm px-8 text-center">
        No problems have been detected in the workspace.
      </div>
    )
  }

  const fileName = activeFilePath ? getFileName(activeFilePath) : 'unknown'
  const errorCount = markers.filter(m => m.severity === Severity.Error).length
  const warnCount = markers.filter(m => m.severity === Severity.Warning).length

  const sorted = [...markers].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))

  return (
    <div className="h-full flex flex-col overflow-hidden text-[12px]">
      {/* File group header */}
      <div className="flex items-center gap-2 px-3 py-[5px] bg-[#1e1e1e] border-b border-[#252526] text-[#cccccc] shrink-0">
        <span className="font-medium truncate">{fileName}</span>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-[#f14c4c]">
              <AlertCircle size={11} />
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-[#cca700]">
              <AlertTriangle size={11} />
              {warnCount}
            </span>
          )}
        </div>
      </div>

      {/* Marker list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.map((m, i) => {
          const codeStr = getCodeValue(m.code)
          return (
            <div
              key={i}
              className="flex items-start gap-2 px-4 py-[5px] hover:bg-[#2a2d2e] cursor-default border-b border-[#252526]/50 group"
            >
              <SeverityIcon severity={m.severity} />
              <div className="flex-1 min-w-0">
                <span className="text-[#cccccc] break-words leading-snug">{m.message}</span>
                {codeStr && (
                  <span className="ml-1.5 text-[#9d9d9d]">({codeStr})</span>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[#9d9d9d] text-[11px]">
                  {m.source && <span>{m.source}</span>}
                  <span className="text-[#555]">·</span>
                  <span>{fileName}</span>
                  <span className="text-[#555]">·</span>
                  <span>Ln {m.startLineNumber}, Col {m.startColumn}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}