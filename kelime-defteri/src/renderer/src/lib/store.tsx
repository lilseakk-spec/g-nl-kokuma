import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type AppInfo, type Settings } from '@shared/types'
import { api, onEvent } from './api'
import { configureSound } from './sound'
import { configureVoice } from './tts'
import { AskHost } from '../components/ui'

// ---------- yönlendirme (hash) ----------
function parseHash(): { path: string; query: URLSearchParams } {
  const h = location.hash.replace(/^#/, '') || '/'
  const [path, q] = h.split('?')
  return { path: path || '/', query: new URLSearchParams(q ?? '') }
}

export function navigate(to: string): void {
  location.hash = to
}

export function useRoute() {
  const [r, setR] = useState(parseHash)
  useEffect(() => {
    const h = () => setR(parseHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  return r
}

// ---------- uygulama durumu ----------
interface Ctx {
  settings: Settings
  info: AppInfo | null
  version: number
  saveSettings: (p: Partial<Settings>) => Promise<void>
  refreshInfo: () => Promise<void>
  toast: (msg: string, kind?: 'ok' | 'err' | 'info') => void
  quickAdd: boolean
  setQuickAdd: (v: boolean) => void
}

const AppCtx = createContext<Ctx>(null as never)
export const useApp = () => useContext(AppCtx)

function applyTheme(t: Settings['theme']) {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [version, setVersion] = useState(0)
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([])
  const [quickAdd, setQuickAdd] = useState(false)

  const apply = (s: Settings) => {
    setSettings(s)
    applyTheme(s.theme)
    configureSound(s.sound)
    configureVoice(s.voice)
  }

  const refreshInfo = useCallback(async () => setInfo(await api.info()), [])

  useEffect(() => {
    void api.getSettings().then(apply)
    void refreshInfo()
    const offs = [
      onEvent('settings-changed', (s) => apply(s as Settings)),
      onEvent('data-changed', () => setVersion((v) => v + 1)),
      onEvent('navigate', (r) => navigate(String(r)))
    ]
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onMq = () => setSettings((s) => (applyTheme(s.theme), s))
    mq.addEventListener('change', onMq)
    return () => {
      offs.forEach((o) => o())
      mq.removeEventListener('change', onMq)
    }
  }, [refreshInfo])

  const toast = useCallback((msg: string, kind: 'ok' | 'err' | 'info' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'err' ? 6000 : 3200)
  }, [])

  const saveSettings = useCallback(async (p: Partial<Settings>) => {
    apply(await api.saveSettings(p))
  }, [])

  return (
    <AppCtx.Provider value={{ settings, info, version, saveSettings, refreshInfo, toast, quickAdd, setQuickAdd }}>
      {children}
      <AskHost />
      <div className="pointer-events-none fixed right-5 bottom-5 z-[100] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-pop pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg ${
              t.kind === 'err' ? 'bg-bad text-white' : t.kind === 'info' ? 'bg-ink text-bg' : 'bg-brand text-white'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  )
}

/** Veri değişince yeniden yükleyen basit hook */
export function useData<T>(fn: () => Promise<T>, deps: unknown[] = []): [T | undefined, () => void] {
  const { version } = useApp()
  const [data, setData] = useState<T>()
  const [n, setN] = useState(0)
  useEffect(() => {
    let alive = true
    fn().then((d) => alive && setData(d))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, n, ...deps])
  return [data, () => setN((x) => x + 1)]
}
