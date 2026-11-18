import { useEffect, useState, type ReactNode } from 'react'
import type { ItemStatus } from '@shared/types'
import { speak } from '../lib/tts'

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  pattern: 'M4 5h16v10H8l-4 4zM8 9h8M8 12h5',
  cards: 'M7 4h11a2 2 0 0 1 2 2v11M4 8h11a2 2 0 0 1 2 2v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  speaker: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4v16l13-8z',
  refresh: 'M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  flame: 'M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  upload: 'M12 3v12M7 8l5-5 5 5M4 21h16',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM8 7h8M8 11h6',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z'
}

export function Icon({ name, size = 18, className = '' }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}

export function SpeakButton({ text, size = 16, className = '' }: { text: string; size?: number; className?: string }) {
  const [on, setOn] = useState(false)
  return (
    <button
      type="button"
      title="Dinle"
      aria-label="Dinle"
      onClick={async (e) => {
        e.stopPropagation()
        setOn(true)
        await speak(text)
        setOn(false)
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-brand transition hover:bg-brand-soft ${on ? 'bg-brand-soft' : ''} ${className}`}
    >
      <Icon name="speaker" size={size} />
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className={`card animate-pop mt-10 w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} p-6`} onMouseDown={(e) => e.stopPropagation()}>
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{title}</h2>
            <button className="btn btn-ghost p-1.5" onClick={onClose} aria-label="Kapat">
              <Icon name="x" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export const STATUS_LABEL: Record<ItemStatus, string> = { pool: 'Havuzda', learning: 'Öğreniyorum', learned: 'Öğrendim' }

export function StatusChip({ status, paused }: { status: ItemStatus; paused?: boolean }) {
  if (paused) return <span className="chip">⏸ Duraklatıldı</span>
  const cls =
    status === 'learning' ? 'bg-accent-soft text-accent' : status === 'learned' ? 'bg-good-soft text-good' : 'bg-surface-2 text-muted'
  return <span className={`chip ${cls}`}>{STATUS_LABEL[status]}</span>
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState('')
  const add = () => {
    const parts = text
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    if (parts.length) onChange([...new Set([...value, ...parts])])
    setText('')
  }
  return (
    <div className="input flex flex-wrap items-center gap-1.5 py-1.5">
      {value.map((t) => (
        <span key={t} className="chip bg-brand-soft text-brand">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`${t} kaldır`}>
            ×
          </button>
        </span>
      ))}
      <input
        className="min-w-[8rem] flex-1 bg-transparent py-0.5 outline-none"
        value={text}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={add}
      />
    </div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
}

// ---------- metin sorma diyaloğu (Electron'da window.prompt yoktur) ----------
type Ask = { title: string; value: string; resolve: (v: string | null) => void }
let pushAsk: ((a: Ask) => void) | null = null

export function askText(title: string, value = ''): Promise<string | null> {
  return new Promise((resolve) => (pushAsk ? pushAsk({ title, value, resolve }) : resolve(null)))
}

export function AskHost() {
  const [a, setA] = useState<Ask | null>(null)
  const [v, setV] = useState('')
  useEffect(() => {
    pushAsk = (x) => {
      setA(x)
      setV(x.value)
    }
    return () => {
      pushAsk = null
    }
  }, [])
  if (!a) return null
  const done = (val: string | null) => {
    a.resolve(val)
    setA(null)
  }
  return (
    <Modal open onClose={() => done(null)} title={a.title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          done(v.trim() || null)
        }}
        className="space-y-4"
      >
        <input className="input" autoFocus value={v} onChange={(e) => setV(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => done(null)}>
            Vazgeç
          </button>
          <button type="submit" className="btn btn-primary">
            Tamam
          </button>
        </div>
      </form>
    </Modal>
  )
}
