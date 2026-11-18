import { BADGES } from '@shared/gamification'
import { api } from '../lib/api'
import { useData } from '../lib/store'
import { Icon, PageHeader } from '../components/ui'

const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const dateOf = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number)
  return new Date(y, m - 1, dd)
}

function Stat({ label, value, sub, cls = '' }: { label: string; value: string | number; sub?: string; cls?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-bold tracking-wider text-muted uppercase">{label}</div>
      <div className={`term mt-2 text-4xl font-extrabold ${cls}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function StatsPage() {
  const [s] = useData(() => api.stats())
  if (!s) return null
  const maxHeat = Math.max(1, ...s.heatmap.map((h) => h.count))
  const maxFc = Math.max(1, ...s.forecast.map((f) => f.count))
  const owned = new Map(s.badges.map((b) => [b.id, b.earnedAt]))
  // Isı haritası: haftanın gününe göre hizala
  const firstDow = dateOf(s.heatmap[0].day).getDay()
  const cells: ({ day: string; count: number } | null)[] = [...Array(firstDow).fill(null), ...s.heatmap]

  return (
    <div className="space-y-6">
      <PageHeader title="İstatistikler" sub="Sadece senin kartların ve çalışmaların." />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Havuzda" value={s.counts.pool} cls="text-muted" />
        <Stat label="Öğreniyorum" value={s.counts.learning} cls="text-accent" sub={s.counts.paused ? `${s.counts.paused} duraklatıldı` : undefined} />
        <Stat label="Öğrendim" value={s.counts.learned} cls="text-good" />
        <Stat label="Doğruluk" value={`%${Math.round(s.accuracy30 * 100)}`} sub={`son 30 gün · genel %${Math.round(s.accuracy * 100)}`} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Seviye" value={s.level} sub={`${s.xp} XP · sonraki seviyeye ${s.levelNext - s.levelProgress} XP`} />
        <Stat label="Seri" value={`${s.streak} gün`} sub={`en iyi: ${s.bestStreak} gün`} cls="text-accent" />
        <Stat label="Bugün" value={s.reviewsToday} sub={s.goalDoneToday ? 'günlük hedef tamam 🎯' : 'tekrar'} />
        <Stat label="Şu an bekleyen" value={s.dueNow} sub="tekrar" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-extrabold">Son 30 gün</h2>
          <div className="mt-4 flex gap-3">
            <div className="grid grid-rows-7 gap-1 pt-0.5 text-[10px] text-muted">
              {DAYS.map((d) => (
                <div key={d} className="h-6 leading-6">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-1">
              {cells.map((c, k) =>
                c ? (
                  <div
                    key={k}
                    title={`${dateOf(c.day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}: ${c.count} tekrar`}
                    className="h-6 w-6 rounded-md"
                    style={{
                      background: c.count ? `color-mix(in srgb, var(--brand) ${25 + (c.count / maxHeat) * 75}%, var(--surface-2))` : 'var(--surface-2)'
                    }}
                  />
                ) : (
                  <div key={k} className="h-6 w-6" />
                )
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-muted">
            Az
            {[0, 0.33, 0.66, 1].map((p) => (
              <span key={p} className="h-3 w-3 rounded" style={{ background: p ? `color-mix(in srgb, var(--brand) ${25 + p * 75}%, var(--surface-2))` : 'var(--surface-2)' }} />
            ))}
            Çok
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-extrabold">Gelecek 7 günün tekrarları</h2>
          <div className="mt-4 flex items-end gap-3">
            {s.forecast.map((f, k) => (
              <div key={f.day} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-bold tabular-nums">{f.count}</span>
                <div className="flex h-28 w-full items-end">
                  <div className="w-full rounded-t-md bg-accent" style={{ height: `${(f.count / maxFc) * 100}%`, minHeight: f.count ? 4 : 2, opacity: f.count ? 1 : 0.25 }} />
                </div>
                <span className="text-[11px] text-muted">{k === 0 ? 'Bugün' : DAYS[dateOf(f.day).getDay()]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-extrabold">Listelere göre ilerleme</h2>
        {s.lists.filter((l) => l.total > 0).length === 0 ? (
          <p className="mt-2 text-sm text-muted">Henüz listelere kart eklemedin.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {s.lists
              .filter((l) => l.total > 0)
              .map((l) => (
                <div key={l.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{l.name}</span>
                    <span className="text-muted tabular-nums">
                      {l.learned} öğrenildi · {l.learning} öğreniliyor · {l.total} kart
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="bg-good" style={{ width: `${(l.learned / l.total) * 100}%` }} />
                    <div className="bg-accent" style={{ width: `${(l.learning / l.total) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="flex items-center gap-2 font-extrabold">
          <Icon name="star" /> Rozetler ({owned.size}/{BADGES.length})
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {BADGES.map((b) => {
            const got = owned.get(b.id)
            return (
              <div key={b.id} className={`rounded-xl border p-3 text-center ${got ? 'border-accent/40 bg-accent-soft/50' : 'border-line opacity-45 grayscale'}`}>
                <div className="text-3xl">{b.icon}</div>
                <div className="mt-1 text-sm font-bold">{b.name}</div>
                <div className="text-[11px] text-muted">{b.desc}</div>
                {got && <div className="mt-1 text-[10px] font-semibold text-accent">{new Date(got).toLocaleDateString('tr-TR')}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
