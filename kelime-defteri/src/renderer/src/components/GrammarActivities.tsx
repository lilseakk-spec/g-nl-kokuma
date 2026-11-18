import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ChoiceQ, GapQ, OrderQ, TfQ } from '@shared/grammar'
import { shuffle } from '@shared/quiz'
import { checkAnswer, normalizeTerm, tokenizeSentence } from '@shared/text'
import { sounds } from '../lib/sound'
import { SpeakButton } from './ui'

export interface Mistake {
  q: string
  your: string
  right: string
  explain?: string
}
export type Done = (correct: number, total: number, mistakes: Mistake[]) => void

function useEnter(fn: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const h = (e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), fn())
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fn, active])
}

function Progress({ i, n }: { i: number; n: number }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(i / n) * 100}%` }} />
      </div>
      <span className="text-sm font-semibold text-muted tabular-nums">
        {Math.min(i + 1, n)}/{n}
      </span>
    </div>
  )
}

function Feedback({ ok, children, onNext }: { ok: boolean; children?: ReactNode; onNext: () => void }) {
  useEnter(onNext, true)
  return (
    <div className={`animate-pop mt-5 rounded-2xl border-2 p-4 ${ok ? 'border-good/50 bg-good-soft' : 'border-bad/50 bg-bad-soft'}`}>
      <div className={`font-extrabold ${ok ? 'text-good' : 'text-bad'}`}>{ok ? '✓ Doğru!' : '✗ Yanlış'}</div>
      <div className="selectable mt-1 space-y-1 text-sm">{children}</div>
      <button className="btn btn-primary mt-3" onClick={onNext}>
        Devam <span className="kbd border-white/40 text-white/80">Enter</span>
      </button>
    </div>
  )
}

function Sentence({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <SpeakButton text={text} size={13} /> <span className="font-semibold">{text}</span>
    </span>
  )
}

// ---------- Test: çoktan seçmeli + doğru/yanlış ----------
export function RunTest({ questions, onDone }: { questions: (ChoiceQ | TfQ)[]; onDone: Done }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const mistakes = useRef<Mistake[]>([])
  const q = questions[i]
  const options = q.type === 'choice' ? q.options : ['Doğru ✓', 'Yanlış ✗']
  const answer = q.type === 'choice' ? q.answer : q.correct ? 0 : 1
  const done = picked !== null
  const ok = picked === answer

  const pick = (k: number) => {
    if (done) return
    setPicked(k)
    if (k === answer) {
      setScore((s) => s + 1)
      sounds.correct()
    } else {
      sounds.wrong()
      mistakes.current.push(
        q.type === 'choice'
          ? { q: q.prompt, your: q.options[k], right: q.options[q.answer], explain: q.explain }
          : { q: q.sentence, your: k === 0 ? 'Doğru' : 'Yanlış', right: q.correct ? 'Doğru' : `Yanlış → ${q.fix ?? ''}`, explain: q.explain }
      )
    }
  }
  const next = () => {
    if (i + 1 >= questions.length) onDone(score, questions.length, mistakes.current)
    else {
      setI(i + 1)
      setPicked(null)
    }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (!done && n >= 1 && n <= options.length) pick(n - 1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  return (
    <div>
      <Progress i={i} n={questions.length} />
      <div className="card p-6 text-center">
        <div className="text-xs font-bold text-muted uppercase">{q.type === 'choice' ? 'Doğru seçeneği bul' : 'Bu cümle doğru mu?'}</div>
        <div className="mt-3 text-2xl font-bold">{q.type === 'choice' ? q.prompt : q.sentence}</div>
      </div>
      <div className={`mt-4 grid gap-2 ${options.length > 2 ? 'md:grid-cols-2' : 'grid-cols-2'}`}>
        {options.map((o, k) => {
          const cls = !done ? 'hover:border-brand' : k === answer ? 'border-good bg-good-soft text-good' : picked === k ? 'border-bad bg-bad-soft text-bad' : 'opacity-60'
          return (
            <button key={k} className={`card flex items-center gap-3 border-2 p-4 text-left font-semibold ${cls}`} onClick={() => pick(k)}>
              <span className="kbd">{k + 1}</span> {o}
            </button>
          )
        })}
      </div>
      {done && (
        <Feedback ok={ok} onNext={next}>
          {q.type === 'choice' && <Sentence text={q.prompt.replace('___', q.options[q.answer])} />}
          {q.type === 'tf' && !q.correct && q.fix && (
            <div>
              Doğrusu: <Sentence text={q.fix} />
            </div>
          )}
          {q.explain && <div className="text-muted">{q.explain}</div>}
        </Feedback>
      )}
    </div>
  )
}

// ---------- Boşluk doldurma ----------
export function RunGap({ questions, onDone }: { questions: GapQ[]; onDone: Done }) {
  const [i, setI] = useState(0)
  const [text, setText] = useState('')
  const [verdict, setVerdict] = useState<null | 'exact' | 'typo' | 'wrong'>(null)
  const [score, setScore] = useState(0)
  const mistakes = useRef<Mistake[]>([])
  const ref = useRef<HTMLInputElement>(null)
  const q = questions[i]
  const [before, after] = q.sentence.split('___')
  useEffect(() => ref.current?.focus(), [i])

  const check = () => {
    if (verdict || !text.trim()) return
    let best: 'exact' | 'typo' | 'wrong' = 'wrong'
    for (const a of q.answers) {
      const v = checkAnswer(text.replace(/[’']/g, "'"), a.replace(/[’']/g, "'"))
      if (v === 'exact') {
        best = 'exact'
        break
      }
      if (v === 'typo') best = 'typo'
    }
    setVerdict(best)
    if (best === 'wrong') {
      sounds.wrong()
      mistakes.current.push({ q: q.sentence, your: text, right: q.answers[0], explain: q.explain })
    } else {
      sounds.correct()
      setScore((s) => s + 1)
    }
  }
  const next = () => {
    if (i + 1 >= questions.length) onDone(score, questions.length, mistakes.current)
    else {
      setI(i + 1)
      setText('')
      setVerdict(null)
    }
  }
  const ok = verdict === 'exact' || verdict === 'typo'
  return (
    <div>
      <Progress i={i} n={questions.length} />
      <div className="card p-6 text-center">
        <div className="text-xs font-bold text-muted uppercase">Boşluğu doldur</div>
        <div className="mt-4 text-2xl leading-relaxed font-semibold">
          {before}
          <span className="mx-1 inline-block min-w-[5ch] border-b-4 border-accent text-accent">{verdict ? q.answers[0] : ' '}</span>
          {after}
        </div>
        {q.hint && <div className="mt-2 text-sm text-muted">İpucu: {q.hint}</div>}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <input
          ref={ref}
          className={`input term py-3 text-xl font-semibold ${verdict === 'wrong' ? 'animate-shake border-bad' : ''}`}
          placeholder="Eksik kısmı yaz…"
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
      {verdict && (
        <Feedback ok={ok} onNext={next}>
          {verdict === 'typo' && <div className="font-semibold text-warn">Küçük bir yazım hatası var — doğru sayıldı.</div>}
          <Sentence text={q.sentence.replace('___', q.answers[0])} />
          {q.answers.length > 1 && <div className="text-muted">Kabul edilen: {q.answers.join(' / ')}</div>}
          {q.explain && <div className="text-muted">{q.explain}</div>}
        </Feedback>
      )}
    </div>
  )
}

// ---------- Cümle kurma ----------
export function RunOrder({ questions, onDone }: { questions: OrderQ[]; onDone: Done }) {
  const [i, setI] = useState(0)
  const q = questions[i]
  const tokens = useMemo(() => tokenizeSentence(q.sentence), [q.sentence])
  const [pool, setPool] = useState<{ t: string; i: number }[]>([])
  const [built, setBuilt] = useState<{ t: string; i: number }[]>([])
  const [result, setResult] = useState<null | boolean>(null)
  const [score, setScore] = useState(0)
  const mistakes = useRef<Mistake[]>([])

  useEffect(() => {
    let s = shuffle(tokens.map((t, k) => ({ t, i: k })))
    for (let k = 0; k < 5 && s.every((x, j) => x.i === j); k++) s = shuffle(s)
    setPool(s)
    setBuilt([])
    setResult(null)
  }, [tokens])

  const check = () => {
    const mine = built.map((b) => b.t).join(' ')
    const ok = normalizeTerm(mine) === normalizeTerm(q.sentence)
    setResult(ok)
    if (ok) {
      sounds.correct()
      setScore((s) => s + 1)
    } else {
      sounds.wrong()
      mistakes.current.push({ q: q.tr, your: mine, right: q.sentence })
    }
  }
  const next = () => {
    if (i + 1 >= questions.length) onDone(score, questions.length, mistakes.current)
    else setI(i + 1)
  }
  return (
    <div>
      <Progress i={i} n={questions.length} />
      <div className="card p-6 text-center">
        <div className="text-xs font-bold text-muted uppercase">Kelimeleri sıraya koy</div>
        <div className="mt-2 text-lg text-muted">{q.tr}</div>
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
        <Feedback ok={result} onNext={next}>
          <Sentence text={q.sentence} />
        </Feedback>
      )}
    </div>
  )
}

// ---------- Eşleştirme oyunu ----------
export function MatchGame({ pairs, onDone }: { pairs: { left: string; right: string }[]; onDone: Done }) {
  const set = useMemo(() => shuffle(pairs).slice(0, 8), [pairs])
  const lefts = useMemo(() => shuffle(set.map((p, i) => ({ text: p.left, id: i }))), [set])
  const rights = useMemo(() => shuffle(set.map((p, i) => ({ text: p.right, id: i }))), [set])
  const [sel, setSel] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<number | null>(null)
  const [misses, setMisses] = useState(0)
  const [start] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const mistakes = useRef<Mistake[]>([])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const pickRight = (id: number) => {
    if (sel === null || matched.has(id)) return
    if (id === sel) {
      sounds.correct()
      const m = new Set(matched).add(id)
      setMatched(m)
      setSel(null)
      if (m.size === set.length) {
        sounds.goal()
        const total = set.length
        setTimeout(() => onDone(Math.max(0, total - misses), total, mistakes.current), 600)
      }
    } else {
      sounds.wrong()
      setMisses((x) => x + 1)
      mistakes.current.push({ q: set[sel].left, your: set[id].right, right: set[sel].right })
      setWrong(id)
      setTimeout(() => setWrong(null), 400)
    }
  }
  const secs = Math.floor((now - start) / 1000)
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm font-semibold text-muted">
        <span>Soldan birini, sonra eşini seç</span>
        <span className="tabular-nums">
          ⏱ {secs} sn · ✗ {misses}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {lefts.map((l) => (
            <button
              key={l.id}
              disabled={matched.has(l.id)}
              onClick={() => setSel(l.id)}
              className={`card w-full border-2 p-3 text-left font-semibold transition ${matched.has(l.id) ? 'border-good/40 bg-good-soft text-good opacity-60' : sel === l.id ? 'border-brand bg-brand-soft' : 'hover:border-brand'}`}
            >
              {l.text}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rights.map((r) => (
            <button
              key={r.id}
              disabled={matched.has(r.id)}
              onClick={() => pickRight(r.id)}
              className={`card w-full border-2 p-3 text-left font-semibold transition ${matched.has(r.id) ? 'border-good/40 bg-good-soft text-good opacity-60' : wrong === r.id ? 'animate-shake border-bad bg-bad-soft' : 'hover:border-brand'}`}
            >
              {r.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Hız turu: 60 saniye doğru/yanlış ----------
export function SpeedRound({ pool, onDone }: { pool: TfQ[]; onDone: Done }) {
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [flash, setFlash] = useState<null | boolean>(null)
  const [end] = useState(Date.now() + 60_000)
  const [now, setNow] = useState(Date.now())
  const mistakes = useRef<Mistake[]>([])
  const finished = useRef(false)
  const q = pool[i % pool.length]

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (now >= end && !finished.current) {
      finished.current = true
      onDone(score, Math.max(answered, 1), mistakes.current)
    }
  }, [now, end, score, answered, onDone])

  const say = (v: boolean) => {
    if (finished.current) return
    const ok = q.correct === v
    setAnswered((a) => a + 1)
    if (ok) {
      setScore((s) => s + 1)
      sounds.click()
    } else {
      sounds.wrong()
      mistakes.current.push({ q: q.sentence, your: v ? 'Doğru' : 'Yanlış', right: q.correct ? 'Doğru' : `Yanlış → ${q.fix ?? ''}` })
    }
    setFlash(ok)
    setTimeout(() => setFlash(null), 250)
    setI((x) => x + 1)
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'd') say(true)
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'y') say(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
  const left = Math.max(0, Math.ceil((end - now) / 1000))
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="term text-3xl font-extrabold tabular-nums text-accent">{left} sn</span>
        <span className="text-lg font-bold">
          ✓ {score} <span className="text-muted">/ {answered}</span>
        </span>
      </div>
      <div className={`card p-10 text-center transition ${flash === true ? 'border-good bg-good-soft' : flash === false ? 'border-bad bg-bad-soft' : ''}`}>
        <div className="text-xs font-bold text-muted uppercase">Doğru mu, yanlış mı?</div>
        <div className="mt-4 text-2xl font-bold">{q.sentence}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="btn border-2 border-good/50 py-4 text-lg text-good hover:bg-good-soft" onClick={() => say(true)}>
          ✓ Doğru <span className="kbd">←</span>
        </button>
        <button className="btn border-2 border-bad/50 py-4 text-lg text-bad hover:bg-bad-soft" onClick={() => say(false)}>
          ✗ Yanlış <span className="kbd">→</span>
        </button>
      </div>
    </div>
  )
}
