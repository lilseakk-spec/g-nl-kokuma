import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item, Rating, ReviewResult, StudyMode } from '@shared/types'
import { buildChoice, clozeFor, meaningText, MODE_LABELS, modesFor, orderSentenceFor, pickMode, shuffle } from '@shared/quiz'
import { checkAnswer, diffChars, normalizeTerm, tokenizeSentence } from '@shared/text'
import { formatInterval, previewIntervals } from '@shared/srs'
import { BADGES } from '@shared/gamification'
import { api } from '../lib/api'
import { navigate, useApp, useData } from '../lib/store'
import { sounds } from '../lib/sound'
import { speak } from '../lib/tts'
import { Icon, PageHeader, SpeakButton, Spinner } from '../components/ui'

type Answer = (rating: Rating, info?: { correct: boolean }) => void

const RATINGS: { r: Rating; label: string; cls: string }[] = [
  { r: 1, label: 'Bilmiyorum', cls: 'border-bad/50 text-bad hover:bg-bad-soft' },
  { r: 2, label: 'Zor', cls: 'border-warn/50 text-warn hover:bg-warn/10' },
  { r: 3, label: 'İyi', cls: 'border-good/50 text-good hover:bg-good-soft' },
  { r: 4, label: 'Kolay', cls: 'border-brand/50 text-brand hover:bg-brand-soft' }
]

function useKeys(handler: (e: KeyboardEvent) => void, deps: unknown[]) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      handler(e)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

const typingTarget = (e: KeyboardEvent) => (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA'

function RatingBar({ item, onRate }: { item: Item; onRate: (r: Rating) => void }) {
  const iv = useMemo(() => (item.srs && item.status === 'learning' ? previewIntervals(item.srs, Date.now()) : null), [item])
  useKeys(
    (e) => {
      if (typingTarget(e)) return
      if (['1', '2', '3', '4'].includes(e.key)) onRate(Number(e.key) as Rating)
    },
    [onRate]
  )
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATINGS.map(({ r, label, cls }) => (
        <button key={r} className={`btn flex-col gap-0 border-2 py-2.5 ${cls}`} onClick={() => onRate(r)}>
          <span>
            {label} <span className="kbd ml-1">{r}</span>
          </span>
          {iv && <span className="text-[11px] font-medium opacity-70">{formatInterval(iv[r])}</span>}
        </button>
      ))}
    </div>
  )
}

function ItemBack({ item }: { item: Item }) {
  return (
    <div className="space-y-3">
      <div className="text-2xl font-bold">{meaningText(item)}</div>
      {item.usage && <div className="text-sm text-muted">Kullanım: {item.usage}</div>}
      {item.examples.slice(0, 2).map((e, k) => (
        <div key={k} className="flex items-start gap-2 text-left">
          <SpeakButton text={e.en} size={14} />
          <div>
            <div className="font-medium">{e.en}</div>
            <div className="text-sm text-muted">{e.tr}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Continue({ correct, onNext, children }: { correct: boolean; onNext: () => void; children?: React.ReactNode }) {
  useKeys((e) => e.key === 'Enter' && (e.preventDefault(), onNext()), [onNext])
  return (
    <div className={`animate-pop mt-6 rounded-2xl border-2 p-4 ${correct ? 'border-good/50 bg-good-soft' : 'border-bad/50 bg-bad-soft'}`}>
      <div className={`mb-2 font-extrabold ${correct ? 'text-good' : 'text-bad'}`}>{correct ? '✓ Doğru!' : '✗ Yanlış'}</div>
      {children}
      <button className="btn btn-primary mt-3" autoFocus onClick={onNext}>
        Devam <span className="kbd border-white/40 text-white/80">Enter</span>
      </button>
    </div>
  )
}

// ---------- modlar ----------
function Flashcard({ item, onAnswer }: { item: Item; onAnswer: Answer }) {
  const [flipped, setFlipped] = useState(false)
  useEffect(() => void speak(item.term), [item.id])
  useKeys(
    (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key.toLowerCase() === 'r') void speak(item.term)
    },
    [item.id]
  )
  return (
    <div>
      <div className="flip h-80 cursor-pointer" onClick={() => setFlipped((f) => !f)}>
        <div className={`flip-inner h-full ${flipped ? 'flipped' : ''}`}>
          <div className="flip-face card flex flex-col items-center justify-center p-8 text-center">
            <div className="term text-5xl font-extrabold">{item.kind === 'pattern' && item.template ? item.template : item.term}</div>
            <div className="mt-2 flex items-center gap-2 text-muted">
              {item.ipa} <SpeakButton text={item.term} />
            </div>
            <div className="mt-8 text-sm text-muted">
              Çevirmek için tıkla veya <span className="kbd">Boşluk</span>
            </div>
          </div>
          <div className="flip-face flip-back card flex flex-col items-center justify-center overflow-y-auto p-8 text-center">
            <div className="term mb-3 text-xl font-bold text-muted">{item.term}</div>
            <ItemBack item={item} />
          </div>
        </div>
      </div>
      <div className="mt-5">{flipped ? <RatingBar item={item} onRate={(r) => onAnswer(r)} /> : <button className="btn w-full py-3" onClick={() => setFlipped(true)}>Cevabı göster</button>}</div>
    </div>
  )
}

function Choice({ item, all, onAnswer }: { item: Item; all: Item[]; onAnswer: Answer }) {
  const q = useMemo(() => buildChoice(item, all, Math.random() < 0.5 ? 'en-tr' : 'tr-en'), [item.id])
  const [picked, setPicked] = useState<number | null>(null)
  const done = picked !== null
  const correct = picked === q.answerId
  const pick = (id: number) => {
    if (done) return
    setPicked(id)
    id === q.answerId ? sounds.correct() : sounds.wrong()
  }
  useEffect(() => {
    if (q.direction === 'en-tr') void speak(item.term)
  }, [item.id])
  useKeys(
    (e) => {
      const n = Number(e.key)
      if (!done && n >= 1 && n <= q.options.length) pick(q.options[n - 1].itemId)
      if (e.key.toLowerCase() === 'r') void speak(item.term)
    },
    [done, q]
  )
  return (
    <div>
      <div className="card p-8 text-center">
        <div className="text-xs font-bold text-muted uppercase">{q.direction === 'en-tr' ? 'Türkçe anlamı hangisi?' : 'İngilizcesi hangisi?'}</div>
        <div className={`mt-3 ${q.direction === 'en-tr' ? 'term text-4xl' : 'text-2xl'} font-extrabold`}>{q.prompt}</div>
        {q.direction === 'en-tr' && <SpeakButton text={item.term} className="mt-2" />}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {q.options.map((o, k) => {
          const isAns = o.itemId === q.answerId
          const cls = !done ? 'hover:border-brand' : isAns ? 'border-good bg-good-soft text-good' : picked === o.itemId ? 'border-bad bg-bad-soft text-bad' : 'opacity-60'
          return (
            <button key={o.itemId} className={`card flex items-center gap-3 border-2 p-4 text-left font-semibold ${cls}`} onClick={() => pick(o.itemId)}>
              <span className="kbd">{k + 1}</span>
              <span className={q.direction === 'tr-en' ? 'term text-lg' : ''}>{o.text}</span>
            </button>
          )
        })}
      </div>
      {done && (
        <Continue correct={correct} onNext={() => onAnswer(correct ? 3 : 1, { correct })}>
          <div className="term font-bold">
            {item.term} — <span className="font-normal">{meaningText(item)}</span>
          </div>
        </Continue>
      )}
    </div>
  )
}

function TypeAnswer({
  item,
  prompt,
  expected,
  onAnswer,
  autoSpeak
}: {
  item: Item
  prompt: React.ReactNode
  expected: string
  onAnswer: Answer
  autoSpeak?: boolean
}) {
  const [text, setText] = useState('')
  const [verdict, setVerdict] = useState<null | 'exact' | 'typo' | 'wrong'>(null)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    if (autoSpeak) void speak(item.term)
  }, [item.id])
  useKeys((e) => !typingTarget(e) && e.key.toLowerCase() === 'r' && void speak(item.term), [item.id])
  const submit = () => {
    if (verdict) return
    const v = checkAnswer(text, expected)
    setVerdict(v)
    v === 'wrong' ? sounds.wrong() : sounds.correct()
  }
  const ok = verdict === 'exact' || verdict === 'typo'
  return (
    <div>
      <div className="card p-8 text-center">{prompt}</div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          ref={ref}
          className={`input term py-3 text-xl font-semibold ${verdict === 'wrong' ? 'animate-shake border-bad' : ''}`}
          placeholder="Cevabını yaz…"
          value={text}
          disabled={!!verdict}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btn-primary px-6" disabled={!!verdict || !text.trim()}>
          Kontrol et
        </button>
      </form>
      <button className="mt-2 text-xs font-semibold text-muted hover:text-ink" onClick={() => !verdict && (setVerdict('wrong'), sounds.wrong())}>
        Bilmiyorum, cevabı göster
      </button>
      {verdict && (
        <Continue correct={ok} onNext={() => onAnswer(verdict === 'exact' ? 3 : verdict === 'typo' ? 2 : 1, { correct: ok })}>
          {verdict === 'typo' && <div className="mb-1 text-sm font-semibold text-warn">Küçük bir yazım hatası var — doğru sayıldı.</div>}
          {verdict !== 'exact' && (
            <div className="term text-2xl font-bold tracking-wide">
              {diffChars(text, expected).map((p, k) => (
                <span key={k} className={p.ok ? '' : 'rounded bg-bad/20 text-bad underline decoration-2'}>
                  {p.ch}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1 text-sm">
            <b>{item.term}</b> — {meaningText(item)}
          </div>
        </Continue>
      )}
    </div>
  )
}

function Cloze({ item, onAnswer }: { item: Item; onAnswer: Answer }) {
  const c = clozeFor(item)!
  return (
    <TypeAnswer
      item={item}
      expected={c.answer}
      onAnswer={onAnswer}
      prompt={
        <>
          <div className="text-xs font-bold text-muted uppercase">Boşluğu doldur</div>
          <div className="mt-4 text-2xl leading-relaxed font-semibold">
            {c.before}
            <span className="mx-1 inline-block min-w-[4ch] border-b-4 border-accent text-accent">{c.answer[0]}…</span>
            {c.after}
          </div>
          {c.tr && <div className="mt-3 text-muted">{c.tr}</div>}
          <div className="mt-2 text-sm text-muted">İpucu: {meaningText(item)}</div>
        </>
      }
    />
  )
}

function Order({ item, onAnswer }: { item: Item; onAnswer: Answer }) {
  const data = orderSentenceFor(item)!
  const tokens = useMemo(() => tokenizeSentence(data.sentence), [item.id])
  const [pool, setPool] = useState(() => {
    let s = shuffle(tokens.map((t, i) => ({ t, i })))
    for (let k = 0; k < 5 && s.every((x, j) => x.i === j); k++) s = shuffle(s)
    return s
  })
  const [built, setBuilt] = useState<{ t: string; i: number }[]>([])
  const [result, setResult] = useState<null | boolean>(null)
  const check = () => {
    const ok = normalizeTerm(built.map((b) => b.t).join(' ')) === normalizeTerm(data.sentence)
    setResult(ok)
    ok ? sounds.correct() : sounds.wrong()
  }
  return (
    <div>
      <div className="card p-6 text-center">
        <div className="text-xs font-bold text-muted uppercase">Kelimeleri sıraya koy</div>
        <div className="mt-2 text-lg text-muted">{data.tr}</div>
        <div className="mt-5 flex min-h-[56px] flex-wrap justify-center gap-2 rounded-xl border-2 border-dashed border-line p-3">
          {built.map((b, k) => (
            <button
              key={b.i}
              className="term rounded-lg bg-ink px-3 py-1.5 font-semibold text-bg"
              disabled={result !== null}
              onClick={() => {
                setBuilt(built.filter((_, j) => j !== k))
                setPool([...pool, b])
              }}
            >
              {b.t}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {pool.map((p, k) => (
            <button
              key={p.i}
              className="term rounded-lg border border-line bg-surface px-3 py-1.5 font-semibold hover:border-brand"
              onClick={() => {
                setPool(pool.filter((_, j) => j !== k))
                setBuilt([...built, p])
              }}
            >
              {p.t}
            </button>
          ))}
        </div>
      </div>
      {result === null ? (
        <button className="btn btn-primary mt-4 w-full py-3" disabled={pool.length > 0} onClick={check}>
          Kontrol et
        </button>
      ) : (
        <Continue correct={result} onNext={() => onAnswer(result ? 3 : 1, { correct: result })}>
          <div className="flex items-center gap-2 font-medium">
            <SpeakButton text={data.sentence} size={14} /> {data.sentence}
          </div>
        </Continue>
      )}
    </div>
  )
}

function PatternPractice({ item, onAnswer }: { item: Item; onAnswer: Answer }) {
  const { info, toast } = useApp()
  const hasAi = !!info?.hasApiKey
  const [situation, setSituation] = useState<string | null>(hasAi ? null : item.usage || 'Bu kalıbı kullanarak kendi hayatından bir cümle kur.')
  const [answer, setAnswer] = useState('')
  const [fb, setFb] = useState<Awaited<ReturnType<typeof api.aiPatternCheck>> | null>(null)
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!hasAi) return
    api
      .aiPatternSituation(item.id)
      .then(setSituation)
      .catch((e) => {
        toast((e as Error).message, 'err')
        setSituation(item.usage || 'Bu kalıbı kullanarak kendi hayatından bir cümle kur.')
      })
  }, [item.id])

  const check = async () => {
    if (!answer.trim()) return
    if (!hasAi) return setRevealed(true)
    setBusy(true)
    try {
      const r = await api.aiPatternCheck(item.id, situation ?? '', answer)
      setFb(r)
      r.correct && r.usedPattern ? sounds.correct() : sounds.wrong()
    } catch (e) {
      toast((e as Error).message, 'err')
      setRevealed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="card p-6">
        <div className="text-xs font-bold text-muted uppercase">Kalıp pratiği</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="term text-2xl font-extrabold">{item.template || item.term}</span>
          <SpeakButton text={item.term} />
        </div>
        <div className="text-muted">{meaningText(item)}</div>
        <div className="mt-4 rounded-xl bg-accent-soft p-4">
          <div className="text-xs font-bold text-accent uppercase">Durum</div>
          <div className="mt-1 font-semibold">{situation ?? <Spinner />}</div>
        </div>
      </div>
      <textarea
        className="input term mt-4 min-h-[90px] text-lg"
        placeholder="Bu durumda kalıbını kullanarak bir cümle yaz…"
        value={answer}
        disabled={!!fb || revealed}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), check())}
      />
      {!fb && !revealed && (
        <button className="btn btn-primary mt-3" disabled={busy || !answer.trim() || !situation} onClick={check}>
          {busy ? <Spinner /> : null} {hasAi ? 'Yapay zekâ ile kontrol et' : 'Örneklerle karşılaştır'}
        </button>
      )}
      {fb && (
        <Continue correct={fb.correct && fb.usedPattern} onNext={() => onAnswer(fb.correct && fb.usedPattern ? 3 : fb.usedPattern ? 2 : 1, { correct: fb.correct })}>
          <div className="selectable space-y-1">
            {!fb.usedPattern && <div className="text-sm font-semibold text-warn">Kalıbını kullanmadın.</div>}
            <div className="flex items-center gap-2 font-semibold">
              <SpeakButton text={fb.corrected} size={14} /> {fb.corrected}
            </div>
            <div className="text-sm">{fb.explanationTr}</div>
          </div>
        </Continue>
      )}
      {revealed && !fb && (
        <div className="animate-pop mt-5 space-y-3">
          <div className="card p-4">
            <div className="label">Senin örneklerin</div>
            <ItemBack item={item} />
          </div>
          <div className="text-sm font-semibold">Cümleni karşılaştır ve kendini puanla:</div>
          <RatingBar item={item} onRate={(r) => onAnswer(r)} />
        </div>
      )}
    </div>
  )
}

// ---------- oturum ----------
interface Card {
  item: Item
  mode: StudyMode
  repeat: number
}

function Session({ queue, all, preferred, onEnd }: { queue: Item[]; all: Item[]; preferred: StudyMode | 'mixed'; onEnd: () => void }) {
  const { toast } = useApp()
  const make = (item: Item, repeat = 0): Card => ({ item, mode: pickMode(modesFor(item, all), preferred), repeat })
  const [cards, setCards] = useState<Card[]>(() => queue.map((i) => make(i)))
  const [idx, setIdx] = useState(0)
  const [stats, setStats] = useState({ done: 0, correct: 0, xp: 0, wrong: 0 })
  const [finished, setFinished] = useState(false)
  const card = cards[idx]

  const answer: Answer = async (rating, info) => {
    const correct = info?.correct ?? rating > 1
    let res: ReviewResult | null = null
    try {
      res = await api.review(card.item.id, rating, card.mode)
    } catch (e) {
      toast((e as Error).message, 'err')
    }
    if (res) {
      if (res.levelUp) {
        sounds.levelUp()
        toast(`🎉 Seviye atladın!`, 'info')
      } else if (res.goalReached) {
        sounds.goal()
        toast('🎯 Günlük hedef tamamlandı!', 'info')
      } else if (res.streakExtended && res.streak > 1) {
        sounds.streak()
        toast(`🔥 ${res.streak} günlük seri!`, 'info')
      }
      for (const b of res.newBadges) {
        const def = BADGES.find((x) => x.id === b)
        if (def) toast(`${def.icon} Yeni rozet: ${def.name}`, 'info')
      }
      if (res.item.status === 'learned' && card.item.status === 'learning') toast(`🎓 "${res.item.term}" artık Öğrendim listende`, 'ok')
    }
    const next = [...cards]
    if (rating === 1 && card.repeat < 2 && res?.item.status === 'learning') next.push(make(res.item, card.repeat + 1))
    setCards(next)
    const s = { done: stats.done + 1, correct: stats.correct + (correct ? 1 : 0), xp: stats.xp + (res?.xpGained ?? 0), wrong: stats.wrong + (correct ? 0 : 1) }
    setStats(s)
    if (idx + 1 >= next.length) {
      setFinished(true)
      if (s.done >= 10 && s.wrong === 0) {
        const b = await api.recordEvent('perfect')
        b.forEach((id) => toast(`${BADGES.find((x) => x.id === id)?.icon} Yeni rozet: ${BADGES.find((x) => x.id === id)?.name}`, 'info'))
      }
    } else setIdx(idx + 1)
  }

  if (finished || !card) {
    const acc = stats.done ? Math.round((stats.correct / stats.done) * 100) : 0
    return (
      <div className="card animate-pop mx-auto max-w-lg p-10 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-3 text-2xl font-extrabold">Oturum tamamlandı</h2>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div>
            <div className="term text-3xl font-extrabold">{stats.done}</div>
            <div className="text-xs text-muted">kart</div>
          </div>
          <div>
            <div className="term text-3xl font-extrabold text-good">%{acc}</div>
            <div className="text-xs text-muted">doğru</div>
          </div>
          <div>
            <div className="term text-3xl font-extrabold text-accent">+{stats.xp}</div>
            <div className="text-xs text-muted">XP</div>
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-2">
          <button className="btn btn-primary" onClick={onEnd}>
            Yeni oturum
          </button>
          <button className="btn" onClick={() => navigate('/')}>
            Ana sayfa
          </button>
        </div>
      </div>
    )
  }

  const renderMode = () => {
    switch (card.mode) {
      case 'choice':
        return <Choice item={card.item} all={all} onAnswer={answer} />
      case 'typing':
        return (
          <TypeAnswer
            item={card.item}
            expected={card.item.term}
            onAnswer={answer}
            prompt={
              <>
                <div className="text-xs font-bold text-muted uppercase">İngilizcesini yaz</div>
                <div className="mt-3 text-3xl font-extrabold">{meaningText(card.item)}</div>
                {card.item.pos && <div className="mt-1 text-sm text-muted">{card.item.pos}</div>}
              </>
            }
          />
        )
      case 'listening':
        return (
          <TypeAnswer
            item={card.item}
            expected={card.item.term}
            onAnswer={answer}
            autoSpeak
            prompt={
              <>
                <div className="text-xs font-bold text-muted uppercase">Dinle ve yaz</div>
                <button className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:scale-105" onClick={() => speak(card.item.term)}>
                  <Icon name="speaker" size={34} />
                </button>
                <div className="mt-3 flex justify-center gap-3 text-sm text-muted">
                  <button className="font-semibold hover:text-ink" onClick={() => speak(card.item.term, { rate: 0.6 })}>
                    🐢 Yavaş
                  </button>
                  <span>
                    <span className="kbd">R</span> tekrar dinle
                  </span>
                </div>
              </>
            }
          />
        )
      case 'cloze':
        return <Cloze item={card.item} onAnswer={answer} />
      case 'order':
        return <Order item={card.item} onAnswer={answer} />
      case 'pattern':
        return <PatternPractice item={card.item} onAnswer={answer} />
      default:
        return <Flashcard item={card.item} onAnswer={answer} />
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <button className="btn btn-ghost px-2" onClick={onEnd} title="Oturumu bitir">
          <Icon name="x" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(idx / cards.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-muted tabular-nums">
          {idx + 1}/{cards.length}
        </span>
        <span className="chip">{MODE_LABELS[card.mode]}</span>
      </div>
      <div key={`${card.item.id}-${idx}`} className="animate-pop">
        {renderMode()}
      </div>
      <div className="mt-6 text-center text-xs text-muted">
        <span className="kbd">Boşluk</span> çevir · <span className="kbd">1-4</span> puanla · <span className="kbd">R</span> tekrar dinle ·{' '}
        <span className="kbd">Enter</span> devam
      </div>
    </div>
  )
}

export function StudyPage() {
  const { toast } = useApp()
  const [lists] = useData(() => api.getLists())
  const [tags] = useData(() => api.allTags())
  const [listId, setListId] = useState<number | undefined>()
  const [tag, setTag] = useState<string | undefined>()
  const [kind, setKind] = useState<'word' | 'pattern' | undefined>()
  const [mode, setMode] = useState<StudyMode | 'mixed'>('flashcard')
  const [limit, setLimit] = useState(20)
  const [due] = useData(() => api.studyQueue({ listId, tag, kind, limit: 500 }), [listId, tag, kind])
  const [ahead] = useData(() => api.studyQueue({ listId, tag, kind, limit: 500, ahead: true }), [listId, tag, kind])
  const [session, setSession] = useState<{ queue: Item[]; all: Item[] } | null>(null)

  const start = async (aheadMode = false) => {
    const queue = await api.studyQueue({ listId, tag, kind, limit, ahead: aheadMode })
    if (!queue.length) return toast('Bu seçimde çalışılacak kart yok.', 'err')
    const all = await api.listItems({})
    setSession({ queue, all })
  }

  if (session) return <Session queue={session.queue} all={session.all} preferred={mode} onEnd={() => setSession(null)} />

  const modes: (StudyMode | 'mixed')[] = ['flashcard', 'choice', 'typing', 'listening', 'cloze', 'order', 'pattern', 'mixed']
  const learningTotal = ahead?.length ?? 0

  return (
    <div>
      <PageHeader title="Çalış" sub="Sadece senin 'Öğreniyorum' listendeki kartlar, FSRS aralıklı tekrar ile." />
      {learningTotal === 0 && due !== undefined ? (
        <div className="card p-10 text-center">
          <div className="text-xl font-extrabold">Çalışma sırasında kart yok</div>
          <p className="mt-2 text-muted">Kelimelerim ekranında çalışmak istediğin kartları seçip "Çalışmaya başla" de.</p>
          <button className="btn btn-primary mt-5" onClick={() => navigate('/words')}>
            Kelimelerime git
          </button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="card space-y-6 p-6">
            <div>
              <div className="label">Ne çalışayım?</div>
              <div className="grid gap-2 md:grid-cols-3">
                <select className="input" value={listId ?? ''} onChange={(e) => setListId(Number(e.target.value) || undefined)}>
                  <option value="">Tüm listeler</option>
                  {lists?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.count})
                    </option>
                  ))}
                </select>
                <select className="input" value={tag ?? ''} onChange={(e) => setTag(e.target.value || undefined)}>
                  <option value="">Tüm etiketler</option>
                  {tags?.map((t) => (
                    <option key={t.tag} value={t.tag}>
                      #{t.tag}
                    </option>
                  ))}
                </select>
                <select className="input" value={kind ?? ''} onChange={(e) => setKind((e.target.value || undefined) as 'word' | 'pattern')}>
                  <option value="">Kelime + kalıp</option>
                  <option value="word">Sadece kelimeler</option>
                  <option value="pattern">Sadece kalıplar</option>
                </select>
              </div>
            </div>
            <div>
              <div className="label">Çalışma modu</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {modes.map((m) => (
                  <button key={m} className={`btn justify-start py-2.5 ${mode === m ? 'border-ink bg-ink text-bg hover:bg-ink' : ''}`} onClick={() => setMode(m)}>
                    {m === 'mixed' ? '🎲 Karışık' : MODE_LABELS[m]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Bir kart seçilen moda uygun değilse (ör. örnek cümlesi yoksa boşluk doldurma) kart çevirme ile sorulur. Çoktan seçmeli şıklar da senin kartlarından gelir.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="label mb-0">Oturum boyutu</span>
              {[10, 20, 50].map((n) => (
                <button key={n} className={`btn py-1 ${limit === n ? 'border-brand text-brand' : ''}`} onClick={() => setLimit(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="card flex flex-col p-6">
            <div className="text-xs font-bold tracking-wider text-muted uppercase">Seçime göre</div>
            <div className="term mt-2 text-6xl font-extrabold text-accent">{due?.length ?? '…'}</div>
            <div className="font-semibold text-muted">kartın tekrar zamanı geldi</div>
            <button className="btn btn-primary mt-6 py-3 text-base" disabled={!due?.length} onClick={() => start(false)}>
              <Icon name="play" size={16} /> Başla
            </button>
            {due?.length === 0 && learningTotal > 0 && (
              <button className="btn mt-2" onClick={() => start(true)}>
                Zamanı gelmeyenleri de çalış ({learningTotal})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
