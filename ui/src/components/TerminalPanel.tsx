'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Maximize2, ChevronDown, AlertCircle, AlertTriangle, Info, Lightbulb } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTerminal } from '@fortawesome/free-solid-svg-icons'
import dynamic from 'next/dynamic'
import { MarkerData } from './Editor'

const Terminal = dynamic(
  () => import('./Terminal').then(mod => ({ default: mod.Terminal })),
  {
    ssr: false,
    loading: () => <TerminalSkeleton />,
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
  onMinimize?: () => void
  onClose?: () => void
  isMaximized?: boolean
  markers?: MarkerData[]
  activeFilePath?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

export function TerminalPanel({ onMaximize, onMinimize, onClose, isMaximized, markers = [], activeFilePath }: TerminalPanelProps) {
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
    <div className="h-full flex flex-col bg-[#1f2329] select-none font-['Segoe_UI',system-ui,sans-serif] border-t border-[#111318]">

      {/* ── Top Tab Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-stretch justify-between bg-[#191d23] border-b border-[#111318] shrink-0 h-[35px]">

        {/* Section tabs */}
        <div className="flex items-stretch overflow-x-auto scrollbar-none pl-2">
          {sections.map(section => {
            const active = activeSection === section
            return (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={[
                  'relative px-3 h-full text-[11px] font-medium tracking-widest uppercase whitespace-nowrap transition-colors duration-100',
                  active
                    ? 'text-[#abb2bf]'
                    : 'text-[#5c6370] hover:text-[#abb2bf]',
                ].join(' ')}
              >
                {active && <span className="absolute left-3 right-3 top-0 h-[1px] bg-[#61afef]" />}
                {section}
                {section === 'PROBLEMS' && markers.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-[#303641] px-1.5 py-[1px] text-[10px] text-[#abb2bf]">{markers.length}</span>
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
          {onMinimize && (
            <ActionBtn title="Minimize Panel" onClick={onMinimize}>
              <ChevronDown size={14} />
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
      <div className="flex-1 flex overflow-hidden bg-[#1f2329]">

        {/* Terminal viewports */}
        <div className="flex-1 overflow-hidden bg-[#1f2329]">
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
      className="flex items-center justify-center w-6 h-6 text-[#828997] hover:text-[#abb2bf] hover:bg-[#252a32] transition-colors duration-100"
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

function severityOrder(s: number) {
  if (s === Severity.Error) return 0
  if (s === Severity.Warning) return 1
  if (s === Severity.Info) return 2
  return 3
}

function SeverityIcon({ severity }: { severity: number }) {
  if (severity === Severity.Error)
    return <AlertCircle size={14} className="shrink-0 text-[#e06c75]" />
  if (severity === Severity.Warning)
    return <AlertTriangle size={14} className="shrink-0 text-[#e5c07b]" />
  if (severity === Severity.Info)
    return <Info size={14} className="shrink-0 text-[#61afef]" />
  return <Lightbulb size={14} className="shrink-0 text-[#61afef]" />
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
      <div className="h-full flex items-center justify-center text-[#5c6370] text-sm px-8 text-center">
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
      <div className="flex items-center gap-2 px-3 py-[5px] bg-[#1f2329] border-b border-[#191d23] text-[#abb2bf] shrink-0">
        <span className="font-medium truncate">{fileName}</span>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-[#e06c75]">
              <AlertCircle size={11} />
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-[#e5c07b]">
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
              className="flex items-start gap-2 px-4 py-[5px] hover:bg-[#252a32] cursor-default border-b border-[#191d23]/50 group"
            >
              <SeverityIcon severity={m.severity} />
              <div className="flex-1 min-w-0">
                <span className="text-[#abb2bf] break-words leading-snug">{m.message}</span>
                {codeStr && (
                  <span className="ml-1.5 text-[#828997]">({codeStr})</span>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[#828997] text-[11px]">
                  {m.source && <span>{m.source}</span>}
                  <span className="text-[#5c6370]">·</span>
                  <span>{fileName}</span>
                  <span className="text-[#5c6370]">·</span>
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
