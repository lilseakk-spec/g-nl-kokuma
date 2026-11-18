import { useEffect, useState } from 'react'
import { api, onEvent } from '../lib/api'
import { useApp } from '../lib/store'
import { Icon } from './ui'

/** Odak modu: süre ana süreçte tutulur; pencere gizli olsa da bitince alarm çalar */
export function FocusWidget() {
  const { settings } = useApp()
  const [end, setEnd] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const load = () => void api.focusEndsAt().then(setEnd)
    load()
    const off = onEvent('focus-changed', load)
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      off()
      clearInterval(t)
    }
  }, [])

  if (!end || end < now)
    return (
      <button className="btn w-full justify-start text-xs" onClick={async () => setEnd(await api.startFocus(settings.focusMinutes))}>
        <Icon name="target" size={15} /> Odak modu · {settings.focusMinutes} dk
      </button>
    )
  const left = Math.max(0, end - now)
  const mm = String(Math.floor(left / 60000)).padStart(2, '0')
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0')
  const pct = 100 - (left / (settings.focusMinutes * 60000)) * 100
  return (
    <div className="rounded-xl border border-brand/40 bg-brand-soft p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-brand">🎯 Odak</span>
        <button className="text-xs font-semibold text-muted hover:text-bad" onClick={() => api.stopFocus()}>
          Durdur
        </button>
      </div>
      <div className="term mt-1 text-2xl font-extrabold tabular-nums">
        {mm}:{ss}
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
        <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
