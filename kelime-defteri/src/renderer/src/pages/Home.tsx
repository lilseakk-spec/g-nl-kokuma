import { useState } from 'react'
import { api } from '../lib/api'
import { navigate, useApp, useData } from '../lib/store'
import { Icon, Modal, SpeakButton, StatusChip } from '../components/ui'
import { ItemEditor, emptyDraft } from '../components/ItemEditor'

function BigAdd({ onSubmit }: { onSubmit: (term: string) => void }) {
  const [term, setTerm] = useState('')
  return (
    <form
      className="card flex items-center gap-3 p-3 pl-5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(term.trim())
        setTerm('')
      }}
    >
      <Icon name="plus" size={26} className="text-accent" />
      <input
        className="term min-w-0 flex-1 bg-transparent py-3 text-2xl font-bold outline-none placeholder:text-muted/60"
        placeholder="Yeni bir kelime ya da kalıp yaz…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        autoFocus
      />
      <button className="btn btn-primary px-5 py-3 text-base" type="submit">
        Kelime ekle
      </button>
    </form>
  )
}

export function HomePage() {
  const { info } = useApp()
  const [stats] = useData(() => api.stats())
  const [task] = useData(() => api.todayTask())
  const [recent] = useData(() => api.listItems({ sort: 'added' }))
  const [adding, setAdding] = useState<string | null>(null)

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'
  const total = stats?.counts.total ?? 0
  const todo = task ? task.due + task.fresh : 0

  const addModal = (
    <Modal open={adding !== null} onClose={() => setAdding(null)} title="Kelime ekle">
      {adding !== null && (
        <ItemEditor key={adding} autoFocus compact initial={{ ...emptyDraft(), term: adding }} onCancel={() => setAdding(null)} />
      )}
    </Modal>
  )

  if (stats && total === 0) {
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Defterin boş — ilk kelimeni ekle.</h1>
        <p className="mt-3 text-lg text-muted">
          Burada hazır liste yok. Sadece senin eklediğin kelime ve kalıplar çalışılır; neyi ne zaman çalışacağına sen karar verirsin.
        </p>
        <div className="mt-8">
          <BigAdd onSubmit={(t) => setAdding(t)} />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <button className="card p-4 text-left hover:border-brand" onClick={() => navigate('/add?tab=bulk')}>
            <div className="font-bold">📋 Toplu ekle</div>
            <div className="mt-1 text-sm text-muted">Alt alta bir liste yapıştır.</div>
          </button>
          <button className="card p-4 text-left hover:border-brand" onClick={() => navigate('/add?tab=import')}>
            <div className="font-bold">📥 CSV / Anki</div>
            <div className="mt-1 text-sm text-muted">Mevcut kartlarını içe aktar.</div>
          </button>
          <button className="card p-4 text-left hover:border-brand" onClick={() => navigate('/add?tab=single')}>
            <div className="font-bold">🧩 Konuşma kalıbı</div>
            <div className="mt-1 text-sm text-muted">"I'm looking forward to ___" gibi.</div>
          </button>
        </div>
        {!info?.hasApiKey && (
          <p className="mt-6 text-sm text-muted">
            İpucu: Ayarlar'dan Anthropic API anahtarı eklersen anlam, telaffuz ve örnek cümleleri yapay zekâ doldurur. Anahtarsız da her şey çalışır.
          </p>
        )}
        {addModal}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{greet}!</h1>
          <p className="mt-1 text-muted">
            {stats?.streak ? `🔥 ${stats.streak} günlük seri. ` : ''}Bugün {stats?.reviewsToday ?? 0} tekrar yaptın.
          </p>
        </div>
      </div>

      <BigAdd onSubmit={(t) => setAdding(t)} />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="card relative overflow-hidden p-6">
          <div className="text-xs font-bold tracking-wider text-muted uppercase">Bugünkü görev</div>
          {todo > 0 ? (
            <>
              <div className="mt-3 flex items-baseline gap-6">
                <div>
                  <div className="term text-5xl font-extrabold">{task!.due}</div>
                  <div className="text-sm font-semibold text-muted">tekrar</div>
                </div>
                <div>
                  <div className="term text-5xl font-extrabold text-accent">{task!.fresh}</div>
                  <div className="text-sm font-semibold text-muted">yeni</div>
                </div>
              </div>
              <button className="btn btn-primary mt-6 px-6 py-3 text-base" onClick={() => navigate('/study')}>
                <Icon name="play" size={16} /> Çalışmaya başla
              </button>
            </>
          ) : stats && stats.counts.learning > 0 ? (
            <div className="mt-3">
              <div className="text-2xl font-extrabold">Bugünlük bu kadar 🎉</div>
              <p className="mt-1 text-sm text-muted">Bir sonraki tekrarın zamanı gelince haber vereceğim.</p>
            </div>
          ) : (
            <div className="mt-3">
              <div className="text-xl font-extrabold">Çalışma sıran boş</div>
              <p className="mt-1 text-sm text-muted">
                Havuzunda {stats?.counts.pool ?? 0} kelime var. Kelimelerim ekranından istediklerini seçip "Çalışmaya başla" de.
              </p>
              <button className="btn mt-4" onClick={() => navigate('/words')}>
                Kelimelerime git
              </button>
            </div>
          )}
          {task && (
            <div className="mt-6">
              <div className="flex justify-between text-xs font-semibold text-muted">
                <span>Günlük hedef</span>
                <span>
                  {Math.min(task.reviewsToday, task.goal)} / {task.goal}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.min(100, (task.reviewsToday / task.goal) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="text-xs font-bold tracking-wider text-muted uppercase">Defterim</div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ['Havuzda', stats?.counts.pool, 'text-muted'],
              ['Öğreniyorum', stats?.counts.learning, 'text-accent'],
              ['Öğrendim', stats?.counts.learned, 'text-good']
            ].map(([l, n, c]) => (
              <div key={l as string} className="rounded-xl bg-surface-2/60 p-3">
                <div className={`term text-3xl font-extrabold ${c}`}>{n ?? 0}</div>
                <div className="text-xs font-semibold text-muted">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <button className="btn flex-1" onClick={() => navigate('/talk')}>
              <Icon name="chat" size={15} /> Konuşma pratiği
            </button>
            <button className="btn flex-1" onClick={() => navigate('/stats')}>
              <Icon name="chart" size={15} /> İstatistikler
            </button>
          </div>
        </div>
      </div>

      {recent && recent.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">Son eklediklerin</h2>
            <button className="text-sm font-semibold text-brand" onClick={() => navigate('/words')}>
              Tümü →
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recent.slice(0, 6).map((i) => (
              <div
                key={i.id}
                role="button"
                tabIndex={0}
                className="card flex cursor-pointer items-start gap-2 p-4 text-left hover:border-brand"
                onClick={() => navigate(`/${i.kind === 'pattern' ? 'patterns' : 'words'}?open=${i.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="term truncate text-lg font-bold">{i.term}</span>
                    <SpeakButton text={i.term} size={14} />
                  </div>
                  <div className="truncate text-sm text-muted">{i.meanings.join(', ')}</div>
                </div>
                <StatusChip status={i.status} paused={i.paused} />
              </div>
            ))}
          </div>
        </div>
      )}
      {addModal}
    </div>
  )
}
