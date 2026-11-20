import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ACTIVITY_LABELS,
  ofType,
  speedPool,
  testRound,
  type GActivity,
  type GQuestion,
  type GrammarProgress,
  type GrammarTopic
} from '@shared/grammar'
import { shuffle } from '@shared/quiz'
import { BADGES } from '@shared/gamification'
import { api } from '../lib/api'
import { navigate, useApp, useData } from '../lib/store'
import { sounds } from '../lib/sound'
import { Icon, PageHeader, SpeakButton, Spinner, askText } from '../components/ui'
import { MatchGame, RunGap, RunOrder, RunTest, SpeedRound, type Mistake } from '../components/GrammarActivities'

const ACTIVITIES: GActivity[] = ['test', 'gap', 'order', 'match', 'speed', 'homework']

// Yapay zekâ soruları arka planda önceden hazırlanır (sen anlatımı okurken)
type AiKind = 'test' | 'gap' | 'order'
const prefetch = new Map<string, Promise<GQuestion[]>>()
function prefetchQuestions(topicId: string, kind: AiKind) {
  const k = `${topicId}:${kind}`
  if (!prefetch.has(k)) {
    const p = api.aiGrammarExercises(topicId, kind)
    p.catch(() => prefetch.delete(k))
    prefetch.set(k, p)
  }
}
function takePrefetched(topicId: string, kind: AiKind): Promise<GQuestion[]> {
  const k = `${topicId}:${kind}`
  const p = prefetch.get(k) ?? api.aiGrammarExercises(topicId, kind)
  prefetch.delete(k)
  // bir sonraki tur için hemen yenisini hazırlamaya başla
  void p.then(() => prefetchQuestions(topicId, kind)).catch(() => undefined)
  return p
}
const ICONS: Record<GActivity, string> = { test: '📝', gap: '✍️', order: '🧱', match: '🎴', speed: '⚡', homework: '📓' }

function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return <>{parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : <span key={i}>{p}</span>))}</>
}

function bestFor(progress: GrammarProgress[] | undefined, topicId: string) {
  const rows = (progress ?? []).filter((p) => p.topicId === topicId)
  return {
    rows,
    done: rows.length,
    avg: rows.length ? Math.round(rows.reduce((a, r) => a + r.best, 0) / rows.length) : 0,
    last: rows.reduce((a, r) => Math.max(a, r.lastAt), 0)
  }
}

// ---------- konu listesi ----------
export function GrammarListPage() {
  const { info, toast } = useApp()
  const [topics] = useData(() => api.grammarTopics())
  const [progress] = useData(() => api.grammarProgress())
  const [creating, setCreating] = useState(false)

  const addTopic = async () => {
    const title = await askText('Yeni konu adı (ör. Relative clauses, Passive voice, Sıfatlarda karşılaştırma)')
    if (!title) return
    setCreating(true)
    try {
      const t = await api.aiCreateTopic(title)
      toast(`"${t.title}" konusu hazırlandı`)
      navigate(`/grammar/${t.id}`)
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <PageHeader title="Konu tekrarı" sub="Dilbilgisi konuları: anlatım, test, boşluk doldurma, cümle kurma, oyunlar ve ödev. İstediğin zaman gir, çalış.">
        {info?.hasApiKey && (
          <button className="btn btn-primary" disabled={creating} onClick={addTopic}>
            {creating ? <Spinner /> : <Icon name="plus" size={15} />} {creating ? 'Konu hazırlanıyor…' : 'Yeni konu ekle'}
          </button>
        )}
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topics?.map((t, idx) => {
          const b = bestFor(progress, t.id)
          return (
            <button key={t.id} className="card group flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-brand" onClick={() => navigate(`/grammar/${t.id}`)}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-2xl">{t.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-muted">
                    {t.custom ? 'Senin konun' : `${idx + 1}. konu`} · {t.level}
                  </div>
                  <div className="font-extrabold leading-tight">{t.title}</div>
                  <div className="text-xs text-muted">{t.subtitle}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted">{t.summary}</p>
              <div className="mt-auto pt-4">
                <div className="flex justify-between text-[11px] font-semibold text-muted">
                  <span>
                    {b.done}/{ACTIVITIES.length} etkinlik
                  </span>
                  <span>{b.done ? `ort. %${b.avg}` : 'başlanmadı'}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(b.done / ACTIVITIES.length) * 100}%` }} />
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {!info?.hasApiKey && (
        <p className="mt-6 text-sm text-muted">
          Tüm konular ve hazır alıştırmalar anahtarsız çalışır. Ayarlar → Yapay zekâ bölümünden Claude hesabını bağlarsan her turda yeni sorular üretilir, ödevlerin kontrol edilir ve kendi konularını ekleyebilirsin.
        </p>
      )}
    </div>
  )
}

// ---------- konu sayfası ----------
interface Result {
  activity: GActivity
  correct: number
  total: number
  mistakes: Mistake[]
  xp: number
  newBest: boolean
}

function ResultCard({ r, onAgain, onBack }: { r: Result; onAgain: () => void; onBack: () => void }) {
  const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0
  return (
    <div className="card animate-pop p-8">
      <div className="text-center">
        <div className="text-5xl">{pct >= 90 ? '🏆' : pct >= 60 ? '👏' : '💪'}</div>
        <h2 className="mt-2 text-2xl font-extrabold">
          {r.correct}/{r.total} doğru · %{pct}
        </h2>
        <p className="mt-1 text-muted">
          +{r.xp} XP{r.newBest ? ' · yeni rekor!' : ''} {pct < 60 ? '— konu anlatımına tekrar göz atmak iyi olabilir.' : ''}
        </p>
      </div>
      {r.mistakes.length > 0 && (
        <div className="mt-6">
          <div className="label">Hatalarını gözden geçir</div>
          <div className="space-y-2">
            {r.mistakes.map((m, k) => (
              <div key={k} className="selectable rounded-xl bg-surface-2/60 p-3 text-sm">
                <div className="font-semibold">{m.q}</div>
                <div className="text-bad">Senin cevabın: {m.your || '—'}</div>
                <div className="text-good">Doğrusu: {m.right}</div>
                {m.explain && <div className="text-muted">{m.explain}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn btn-primary" onClick={onAgain}>
          <Icon name="refresh" size={15} /> Tekrar oyna
        </button>
        <button className="btn" onClick={onBack}>
          Etkinliklere dön
        </button>
      </div>
    </div>
  )
}

function Homework({ topic, onDone }: { topic: GrammarTopic; onDone: (pct: number) => void }) {
  const { info, toast } = useApp()
  const [k, setK] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [fb, setFb] = useState<Awaited<ReturnType<typeof api.aiGrammarCheck>> | null>(null)
  const [showSample, setShowSample] = useState(false)
  const hw = topic.homework[k % Math.max(1, topic.homework.length)]
  if (!hw) return <p className="text-muted">Bu konuda ödev yok.</p>

  const check = async () => {
    setBusy(true)
    try {
      const r = await api.aiGrammarCheck(topic.id, hw.task, text)
      setFb(r)
      r.score >= 70 ? sounds.correct() : sounds.wrong()
      onDone(Math.round(r.score))
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="label mb-0">Ödev {topic.homework.length > 1 ? `${(k % topic.homework.length) + 1}/${topic.homework.length}` : ''}</div>
          {topic.homework.length > 1 && (
            <button
              className="text-xs font-semibold text-brand"
              onClick={() => {
                setK(k + 1)
                setText('')
                setFb(null)
                setShowSample(false)
              }}
            >
              Başka ödev →
            </button>
          )}
        </div>
        <p className="mt-2 text-lg font-semibold">{hw.task}</p>
      </div>
      <textarea className="input term min-h-[160px] text-base" placeholder="İngilizce cevabını buraya yaz…" value={text} onChange={(e) => setText(e.target.value)} disabled={!!fb} />
      <div className="flex flex-wrap gap-2">
        {info?.hasApiKey ? (
          <button className="btn btn-primary" disabled={busy || text.trim().length < 10 || !!fb} onClick={check}>
            {busy ? <Spinner /> : <Icon name="sparkles" size={15} />} Yapay zekâ kontrol etsin
          </button>
        ) : (
          <span className="self-center text-sm text-muted">Yapay zekâ bağlanınca ödevin kontrol edilir; şimdilik örnek cevapla karşılaştırabilirsin.</span>
        )}
        <button className="btn" onClick={() => setShowSample((v) => !v)}>
          {showSample ? 'Örnek cevabı gizle' : 'Örnek cevabı göster'}
        </button>
        {!info?.hasApiKey && text.trim().length >= 10 && (
          <button className="btn btn-brand" onClick={() => onDone(100)}>
            Tamamladım
          </button>
        )}
      </div>
      {showSample && (
        <div className="card selectable p-4 text-sm">
          <div className="label">Örnek cevap</div>
          <div className="flex items-start gap-2">
            <SpeakButton text={hw.sample} size={14} /> {hw.sample}
          </div>
        </div>
      )}
      {fb && (
        <div className="card animate-pop space-y-3 p-5">
          <div className="flex items-center gap-3">
            <span className={`term text-4xl font-extrabold ${fb.score >= 70 ? 'text-good' : 'text-warn'}`}>{Math.round(fb.score)}</span>
            <span className="text-muted">/ 100</span>
          </div>
          <p className="selectable">{fb.feedbackTr}</p>
          {fb.mistakes.length > 0 && (
            <div className="space-y-2">
              {fb.mistakes.map((m, i) => (
                <div key={i} className="selectable rounded-xl bg-surface-2/60 p-3 text-sm">
                  <div className="text-bad line-through">{m.original}</div>
                  <div className="font-semibold text-good">{m.corrected}</div>
                  <div className="text-muted">{m.explanationTr}</div>
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="label">Düzeltilmiş hali</div>
            <div className="selectable flex items-start gap-2">
              <SpeakButton text={fb.corrected} size={14} /> {fb.corrected}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function GrammarTopicPage({ id }: { id: string }) {
  const { info, toast } = useApp()
  const [topics] = useData(() => api.grammarTopics())
  const [progress] = useData(() => api.grammarProgress())
  const topic = topics?.find((t) => t.id === id)
  const [tab, setTab] = useState<'lesson' | GActivity>('lesson')
  const [round, setRound] = useState<{ key: number; questions?: GQuestion[] } | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const best = useMemo(() => bestFor(progress, id), [progress, id])
  useEffect(() => {
    if (!info?.hasApiKey) return
    prefetchQuestions(id, 'test')
  }, [id, info?.hasApiKey])
  useEffect(() => {
    if (info?.hasApiKey && (tab === 'gap' || tab === 'order')) prefetchQuestions(id, tab)
  }, [id, tab, info?.hasApiKey])

  if (!topics) return null
  if (!topic)
    return (
      <div className="card p-10 text-center">
        Konu bulunamadı.{' '}
        <button className="btn ml-2" onClick={() => navigate('/grammar')}>
          Konulara dön
        </button>
      </div>
    )

  const record = async (activity: GActivity, correct: number, total: number, mistakes: Mistake[]) => {
    const r = await api.grammarRecord(topic.id, activity, correct, total)
    if (r.levelUp) {
      sounds.levelUp()
      toast('🎉 Seviye atladın!', 'info')
    } else if (r.pct >= 80) sounds.goal()
    if (r.streakExtended && r.streak > 1) toast(`🔥 ${r.streak} günlük seri!`, 'info')
    for (const b of r.newBadges) {
      const d = BADGES.find((x) => x.id === b)
      if (d) toast(`${d.icon} Yeni rozet: ${d.name}`, 'info')
    }
    setResult({ activity, correct, total, mistakes, xp: r.xp, newBest: r.newBest })
    setRound(null)
  }

  const start = async (useAi: boolean) => {
    setResult(null)
    if (useAi && (tab === 'test' || tab === 'gap' || tab === 'order')) {
      setLoadingAi(true)
      try {
        const qs = await takePrefetched(topic.id, tab)
        if (!qs.length) throw new Error('Yeni soru üretilemedi; hazır sorularla devam edebilirsin.')
        setRound({ key: Date.now(), questions: qs })
      } catch (e) {
        toast((e as Error).message, 'err')
      } finally {
        setLoadingAi(false)
      }
      return
    }
    setRound({ key: Date.now() })
  }

  const runner = (): ReactNode => {
    if (!round || tab === 'lesson') return null
    const done = (c: number, t: number, m: Mistake[]) => void record(tab, c, t, m)
    switch (tab) {
      case 'test':
        return <RunTest key={round.key} questions={(round.questions as never) ?? testRound(topic, 10)} onDone={done} />
      case 'gap':
        return <RunGap key={round.key} questions={(round.questions as never) ?? shuffle(ofType(topic.questions, 'gap')).slice(0, 8)} onDone={done} />
      case 'order':
        return <RunOrder key={round.key} questions={(round.questions as never) ?? shuffle(ofType(topic.questions, 'order')).slice(0, 5)} onDone={done} />
      case 'match':
        return <MatchGame key={round.key} pairs={topic.pairs} onDone={done} />
      case 'speed':
        return <SpeedRound key={round.key} pool={speedPool(topic)} onDone={done} />
      default:
        return null
    }
  }

  const counts: Record<GActivity, number> = {
    test: ofType(topic.questions, 'choice').length + ofType(topic.questions, 'tf').length,
    gap: ofType(topic.questions, 'gap').length,
    order: ofType(topic.questions, 'order').length,
    match: topic.pairs.length,
    speed: speedPool(topic).length,
    homework: topic.homework.length
  }

  return (
    <div>
      <button className="mb-3 text-sm font-semibold text-muted hover:text-ink" onClick={() => navigate('/grammar')}>
        ← Tüm konular
      </button>
      <div className="mb-5 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-3xl">{topic.emoji}</span>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{topic.title}</h1>
          <div className="text-sm text-muted">
            {topic.subtitle} · {topic.level}
          </div>
          <p className="mt-1 text-muted">{topic.summary}</p>
        </div>
        {topic.custom && (
          <button
            className="btn btn-danger py-1.5 text-xs"
            onClick={async () => {
              if (!confirm(`"${topic.title}" konusu silinsin mi?`)) return
              await api.deleteCustomTopic(topic.id)
              navigate('/grammar')
            }}
          >
            <Icon name="trash" size={13} /> Konuyu sil
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-surface-2/70 p-1 text-sm font-semibold">
        {(['lesson', ...ACTIVITIES] as const).map((t) => {
          const b = t === 'lesson' ? null : best.rows.find((r) => r.activity === t)
          return (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setRound(null)
                setResult(null)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${tab === t ? 'bg-surface shadow' : 'text-muted hover:text-ink'}`}
            >
              {t === 'lesson' ? '📖 Konu anlatımı' : `${ICONS[t]} ${ACTIVITY_LABELS[t]}`}
              {b && <span className="rounded bg-good-soft px-1 text-[10px] text-good">%{b.best}</span>}
            </button>
          )
        })}
      </div>

      {tab === 'lesson' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            {topic.sections.map((s, i) => (
              <div key={i} className="card p-6">
                <h2 className="text-lg font-extrabold">{s.heading}</h2>
                <div className="selectable mt-3 space-y-1.5 leading-relaxed">
                  {s.body.map((line, k) =>
                    line.startsWith('• ') ? (
                      <div key={k} className="flex gap-2">
                        <span className="text-accent">•</span>
                        <span>
                          <Rich text={line.slice(2)} />
                        </span>
                      </div>
                    ) : (
                      <p key={k}>
                        <Rich text={line} />
                      </p>
                    )
                  )}
                </div>
                {s.examples && s.examples.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {s.examples.map((e, k) => (
                      <div key={k} className="flex items-start gap-2 rounded-xl bg-surface-2/50 p-3">
                        <SpeakButton text={e.en} size={14} />
                        <div className="selectable">
                          <div className="font-semibold">{e.en}</div>
                          <div className="text-sm text-muted">{e.tr}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="card p-5">
              <div className="label">Formül</div>
              <div className="space-y-2">
                {topic.formula.map((f, i) => (
                  <div key={i} className="term rounded-lg bg-brand-soft px-3 py-2 text-sm font-bold text-brand">
                    {f}
                  </div>
                ))}
              </div>
            </div>
            {topic.tips.length > 0 && (
              <div className="card p-5">
                <div className="label">İpuçları</div>
                <ul className="space-y-2 text-sm">
                  {topic.tips.map((t, i) => (
                    <li key={i}>💡 {t}</li>
                  ))}
                </ul>
              </div>
            )}
            <button className="btn btn-primary w-full py-3" onClick={() => setTab('test')}>
              Teste geç →
            </button>
          </div>
        </div>
      ) : result ? (
        <ResultCard r={result} onAgain={() => void start(false)} onBack={() => setResult(null)} />
      ) : round ? (
        <div className="mx-auto max-w-2xl">
          <button className="mb-2 text-sm font-semibold text-muted hover:text-ink" onClick={() => setRound(null)}>
            ✕ Turu bitir
          </button>
          {runner()}
        </div>
      ) : tab === 'homework' ? (
        <div className="mx-auto max-w-2xl">
          <Homework key={topic.id} topic={topic} onDone={(pct) => void api.grammarRecord(topic.id, 'homework', pct, 100)} />
        </div>
      ) : (
        <div className="card mx-auto max-w-xl p-8 text-center">
          <div className="text-4xl">{ICONS[tab]}</div>
          <h2 className="mt-2 text-xl font-extrabold">{ACTIVITY_LABELS[tab]}</h2>
          <p className="mt-1 text-sm text-muted">
            {
              {
                test: 'Çoktan seçmeli ve doğru/yanlış sorularla 10 soruluk tur.',
                gap: 'Cümledeki boşluğa doğru biçimi yaz. Küçük yazım hataları tolere edilir.',
                order: 'Karışık kelimeleri doğru sıraya koyarak cümle kur.',
                match: 'Eşleri olabildiğince hızlı ve hatasız bul.',
                speed: '60 saniyede olabildiğince çok cümleyi “doğru / yanlış” olarak işaretle.',
                homework: ''
              }[tab]
            }
          </p>
          <p className="mt-1 text-xs text-muted">Hazır havuzda {counts[tab]} öğe var.</p>
          {best.rows.find((r) => r.activity === tab) && (
            <p className="mt-2 text-sm font-semibold text-good">En iyi skorun: %{best.rows.find((r) => r.activity === tab)!.best}</p>
          )}
          <div className="mt-5 flex flex-col items-center gap-2">
            <button className="btn btn-primary px-8 py-3 text-base" onClick={() => void start(false)} disabled={counts[tab] === 0}>
              <Icon name="play" size={15} /> Başla
            </button>
            {info?.hasApiKey && (tab === 'test' || tab === 'gap' || tab === 'order') && (
              <button className="btn btn-brand" disabled={loadingAi} onClick={() => void start(true)}>
                {loadingAi ? <Spinner /> : <Icon name="sparkles" size={15} />} {loadingAi ? (info?.aiMode === 'claude' ? 'Claude soruları hazırlıyor (~10 sn)…' : 'Yeni sorular hazırlanıyor…') : 'Yapay zekâ ile yeni sorular'}
              </button>
            )}
            {info?.hasApiKey && (tab === 'test' || tab === 'gap' || tab === 'order') && (
              <p className="max-w-sm text-xs text-muted">Yeni sorularda mümkünse senin kelimelerin, değilse en basit kelimeler kullanılır; hiçbir kelime kartlarına eklenmez.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
