import { useEffect, type ReactNode } from 'react'
import { navigate, useApp, useData, useRoute } from './lib/store'
import { api } from './lib/api'
import { Icon, Modal } from './components/ui'
import { ItemEditor } from './components/ItemEditor'
import { HomePage } from './pages/Home'
import { AddPage } from './pages/Add'
import { WordsPage } from './pages/Words'
import { StudyPage } from './pages/Study'
import { ConversationPage } from './pages/Conversation'
import { GrammarListPage, GrammarTopicPage } from './pages/Grammar'
import { StatsPage } from './pages/Stats'
import { SettingsPage } from './pages/Settings'
import { AlarmPage } from './pages/Alarm'
import { MiniPage } from './pages/Mini'
import { FocusWidget } from './components/Focus'

const NAV = [
  { to: '/', label: 'Ana sayfa', icon: 'home' },
  { to: '/add', label: 'Kelime ekle', icon: 'plus' },
  { to: '/words', label: 'Kelimelerim', icon: 'list' },
  { to: '/patterns', label: 'Kalıplarım', icon: 'pattern' },
  { to: '/study', label: 'Çalış', icon: 'cards' },
  { to: '/talk', label: 'Konuşma pratiği', icon: 'chat' },
  { to: '/grammar', label: 'Konu tekrarı', icon: 'book' },
  { to: '/stats', label: 'İstatistikler', icon: 'chart' },
  { to: '/settings', label: 'Ayarlar', icon: 'settings' }
]

function Sidebar({ path }: { path: string }) {
  const [task] = useData(() => api.todayTask())
  const [stats] = useData(() => api.stats())
  const due = task ? task.due + task.fresh : 0
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface/60 px-3 py-5">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <img src="./icon.png" alt="" className="h-9 w-9 rounded-xl" />
        <div>
          <div className="text-[15px] leading-tight font-extrabold">Kelime Defterim</div>
          <div className="text-[11px] text-muted">sadece senin kelimelerin</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => {
          const active = n.to === '/' ? path === '/' : path.startsWith(n.to)
          return (
            <button
              key={n.to}
              onClick={() => navigate(n.to)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                active ? 'bg-ink text-bg' : 'text-ink/80 hover:bg-surface-2'
              }`}
            >
              <Icon name={n.icon} size={17} />
              <span className="flex-1">{n.label}</span>
              {n.to === '/study' && due > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-accent text-white' : 'bg-accent-soft text-accent'}`}>{due}</span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto space-y-3 px-1">
        <FocusWidget />
        {stats && (
          <div className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Seviye {stats.level}</span>
              <span className="flex items-center gap-1 text-accent">
                <Icon name="flame" size={14} /> {stats.streak} gün
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(stats.levelProgress / stats.levelNext) * 100}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-muted">
              {stats.levelProgress} / {stats.levelNext} XP
            </div>
          </div>
        )}
        <div className="px-1 text-[11px] text-muted">
          <span className="kbd">{window.bridge.platform === 'darwin' ? '⌘' : 'Ctrl'}+N</span> hızlı ekle
        </div>
      </div>
    </aside>
  )
}

function Shell({ children, path }: { children: ReactNode; path: string }) {
  const { quickAdd, setQuickAdd } = useApp()
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setQuickAdd(true)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setQuickAdd])
  return (
    <div className="flex h-full">
      <Sidebar path={path} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
      <Modal open={quickAdd} onClose={() => setQuickAdd(false)} title="Hızlı ekle">
        <ItemEditor autoFocus compact onSaved={() => undefined} onCancel={() => setQuickAdd(false)} />
      </Modal>
    </div>
  )
}

export function App() {
  const { path, query } = useRoute()
  const { setQuickAdd } = useApp()

  useEffect(() => {
    if (query.get('add') === '1') {
      setQuickAdd(true)
      navigate(path)
    }
  }, [query, path, setQuickAdd])

  // Açılır pencereler (alarm, mini tekrar) kenar çubuğu olmadan
  if (path.startsWith('/alarm')) return <AlarmPage type={query.get('type') ?? 'morning'} />
  if (path.startsWith('/mini/')) return <MiniPage id={Number(path.split('/')[2])} reveal={query.get('reveal') === '1'} speakNow={query.get('speak') === '1'} />

  let page: ReactNode
  if (path === '/') page = <HomePage />
  else if (path.startsWith('/add')) page = <AddPage tab={query.get('tab') ?? 'single'} />
  else if (path.startsWith('/words')) page = <WordsPage kind="word" openId={Number(query.get('open')) || undefined} />
  else if (path.startsWith('/patterns')) page = <WordsPage kind="pattern" openId={Number(query.get('open')) || undefined} />
  else if (path.startsWith('/study')) page = <StudyPage />
  else if (path.startsWith('/talk')) page = <ConversationPage />
  else if (path.startsWith('/grammar/')) page = <GrammarTopicPage key={path} id={decodeURIComponent(path.split('/')[2])} />
  else if (path.startsWith('/grammar')) page = <GrammarListPage />
  else if (path.startsWith('/stats')) page = <StatsPage />
  else if (path.startsWith('/settings')) page = <SettingsPage />
  else page = <HomePage />

  return <Shell path={path}>{page}</Shell>
}
