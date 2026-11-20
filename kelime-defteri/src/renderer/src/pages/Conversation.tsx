import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage, ConversationSummary, Item } from '@shared/types'
import { SCENARIOS, usedTargets } from '@shared/prompts'
import { BADGES } from '@shared/gamification'
import { api } from '../lib/api'
import { navigate, useApp, useData } from '../lib/store'
import { speak, stopSpeaking } from '../lib/tts'
import { Icon, PageHeader, SpeakButton, Spinner, Toggle } from '../components/ui'

// Web Speech API ses tanıma (Electron'da çoğu zaman çalışmaz; çalışmazsa yazılı devam edilir)
type Recog = { start: () => void; stop: () => void; lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onerror: (e: { error: string }) => void; onend: () => void }
const RecogCtor = (window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition

function Setup({ onStart }: { onStart: (scenario: string, targets: Item[]) => void }) {
  const [learning] = useData(() => api.listItems({ status: 'learning', sort: 'due' }))
  const [learned] = useData(() => api.listItems({ status: 'learned' }))
  const [scenario, setScenario] = useState('restaurant')
  const [custom, setCustom] = useState('')
  const [sel, setSel] = useState<Set<number> | null>(null)
  const candidates = useMemo(() => [...(learning ?? []), ...(learned ?? [])].filter((i) => !i.paused), [learning, learned])
  const selected = sel ?? new Set((learning ?? []).slice(0, 10).map((i) => i.id))

  if (learning && learned && candidates.length === 0)
    return (
      <div className="card p-10 text-center">
        <div className="text-xl font-extrabold">Önce birkaç kelimeyi çalışmaya başlat</div>
        <p className="mt-2 text-muted">Konuşma pratiği sadece senin "Öğreniyorum" (veya "Öğrendim") listendeki kelime ve kalıplarla yapılır.</p>
        <button className="btn btn-primary mt-5" onClick={() => navigate('/words')}>
          Kelimelerime git
        </button>
      </div>
    )

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="card p-6">
        <div className="label">Senaryo</div>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s) => (
            <button key={s.id} className={`btn justify-start ${scenario === s.id ? 'border-ink bg-ink text-bg hover:bg-ink' : ''}`} onClick={() => setScenario(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="label mt-4">veya kendi senaryon (İngilizce/Türkçe)</div>
        <input className="input" placeholder="ör. bir arkadaşla film hakkında konuşmak" value={custom} onChange={(e) => setCustom(e.target.value)} />
      </div>
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="label mb-0">Kullanılacak kelimelerin ({selected.size})</div>
          <div className="flex gap-2 text-xs font-semibold">
            <button className="text-brand" onClick={() => setSel(new Set(candidates.map((i) => i.id)))}>
              Hepsi
            </button>
            <button className="text-muted" onClick={() => setSel(new Set())}>
              Hiçbiri
            </button>
          </div>
        </div>
        <div className="mt-3 flex max-h-72 flex-wrap gap-1.5 overflow-y-auto">
          {candidates.map((i) => {
            const on = selected.has(i.id)
            return (
              <button
                key={i.id}
                onClick={() => {
                  const s = new Set(selected)
                  on ? s.delete(i.id) : s.add(i.id)
                  setSel(s)
                }}
                className={`chip cursor-pointer border px-2.5 py-1 text-xs ${on ? 'border-brand bg-brand text-white' : 'border-line'}`}
                title={i.meanings.join(', ')}
              >
                {i.kind === 'pattern' ? '🧩 ' : ''}
                {i.term}
              </button>
            )
          })}
        </div>
        <button
          className="btn btn-primary mt-5 w-full py-3"
          disabled={selected.size === 0}
          onClick={() => onStart(custom.trim() || scenario, candidates.filter((i) => selected.has(i.id)))}
        >
          <Icon name="chat" size={16} /> Konuşmayı başlat
        </button>
        <p className="mt-2 text-xs text-muted">Yapay zekâ bu kelimeleri kullanır ve seni de kullanmaya yönlendirir. Gerektiğinde sadece en basit kelimeleri kullanır; yeni kelime öğretmez ve kartına eklemez.</p>
      </div>
    </div>
  )
}

function Highlight({ text, targets }: { text: string; targets: Item[] }) {
  const words = targets.map((t) => (t.kind === 'pattern' && t.template ? t.template : t.term).replace(/_{2,}|\.\.\.|…/g, '').trim()).filter((w) => w.length > 1)
  if (!words.length) return <>{text}</>
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return (
    <>
      {text.split(re).map((part, k) =>
        k % 2 ? (
          <mark key={k} className="rounded bg-accent-soft px-0.5 text-accent">
            {part}
          </mark>
        ) : (
          <span key={k}>{part}</span>
        )
      )}
    </>
  )
}

function Chat({ scenario, targets, onExit }: { scenario: string; targets: Item[]; onExit: () => void }) {
  const { toast } = useApp()
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [voice, setVoice] = useState(true)
  const [listening, setListening] = useState(false)
  const [micOk, setMicOk] = useState(!!RecogCtor)
  const [summary, setSummary] = useState<ConversationSummary | null>(null)
  const recog = useRef<Recog | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const ids = targets.map((t) => t.id)
  const label = SCENARIOS.find((s) => s.id === scenario)?.label ?? scenario

  const send = async (history: ChatMessage[]) => {
    setBusy(true)
    try {
      const reply = await api.aiChat(scenario, ids, history)
      const next = [...history, { role: 'assistant' as const, content: reply }]
      setMsgs(next)
      if (voice) void speak(reply)
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void send([])
    return () => stopSpeaking()
  }, [])
  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, busy, summary])

  const submit = () => {
    if (!text.trim() || busy) return
    stopSpeaking()
    const h = [...msgs, { role: 'user' as const, content: text.trim() }]
    setMsgs(h)
    setText('')
    void send(h)
  }

  const mic = () => {
    if (!RecogCtor) return
    if (listening) return recog.current?.stop()
    const r = new RecogCtor()
    r.lang = 'en-US'
    r.interimResults = false
    r.onresult = (e) => setText((t) => (t ? t + ' ' : '') + e.results[0][0].transcript)
    r.onerror = (e) => {
      setMicOk(false)
      toast(`Mikrofon kullanılamıyor (${e.error}). Yazarak devam edebilirsin.`, 'err')
    }
    r.onend = () => setListening(false)
    recog.current = r
    try {
      r.start()
      setListening(true)
    } catch {
      setMicOk(false)
    }
  }

  const finish = async () => {
    stopSpeaking()
    setBusy(true)
    try {
      const s = await api.aiSummarize(ids, msgs)
      const local = usedTargets(targets, msgs.filter((m) => m.role === 'user').map((m) => m.content))
      const used = [...new Set([...s.used, ...local.used])]
      setSummary({ ...s, used, unused: targets.map((t) => t.term).filter((t) => !used.includes(t)) })
      const badges = await api.recordEvent('conversation')
      badges.forEach((b) => {
        const d = BADGES.find((x) => x.id === b)
        if (d) toast(`${d.icon} Yeni rozet: ${d.name}`, 'info')
      })
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const live = usedTargets(targets, msgs.filter((m) => m.role === 'user').map((m) => m.content))

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className="card flex h-[calc(100vh-180px)] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="font-bold">💬 {label}</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted">
              Sesli oku <Toggle checked={voice} onChange={setVoice} label="Sesli oku" />
            </span>
            {!summary && (
              <button className="btn py-1.5" disabled={busy || msgs.filter((m) => m.role === 'user').length === 0} onClick={finish}>
                Bitir ve özetle
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {msgs.map((m, k) => (
            <div key={k} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`selectable max-w-[80%] rounded-2xl px-4 py-2.5 ${m.role === 'user' ? 'bg-ink text-bg' : 'bg-surface-2'}`}>
                <Highlight text={m.content} targets={targets} />
                {m.role === 'assistant' && <SpeakButton text={m.content} size={13} className="ml-1 align-middle" />}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner /> düşünüyor…
            </div>
          )}
          {summary && (
            <div className="animate-pop space-y-4 rounded-2xl border-2 border-brand/40 bg-brand-soft/50 p-5">
              <h3 className="text-lg font-extrabold">Özet</h3>
              <p className="selectable">{summary.summaryTr}</p>
              {summary.mistakes.length > 0 && (
                <div>
                  <div className="label">Hataların</div>
                  <div className="space-y-2">
                    {summary.mistakes.map((m, k) => (
                      <div key={k} className="selectable rounded-xl bg-surface p-3 text-sm">
                        <div className="text-bad line-through">{m.original}</div>
                        <div className="font-semibold text-good">{m.corrected}</div>
                        <div className="mt-1 text-muted">{m.explanationTr}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="label">Kullandığın kelimelerin ✓</div>
                  <div className="flex flex-wrap gap-1">{summary.used.length ? summary.used.map((t) => <span key={t} className="chip bg-good-soft text-good">{t}</span>) : <span className="text-sm text-muted">—</span>}</div>
                </div>
                <div>
                  <div className="label">Kullanamadıkların</div>
                  <div className="flex flex-wrap gap-1">{summary.unused.length ? summary.unused.map((t) => <span key={t} className="chip bg-bad-soft text-bad">{t}</span>) : <span className="text-sm text-muted">Hepsini kullandın! 🎉</span>}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={onExit}>
                  Yeni konuşma
                </button>
                <button className="btn" onClick={() => navigate('/study')}>
                  Kartlarımı çalış
                </button>
              </div>
            </div>
          )}
          <div ref={bottom} />
        </div>
        {!summary && (
          <form
            className="flex items-end gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {micOk && (
              <button type="button" className={`btn p-3 ${listening ? 'border-bad bg-bad text-white' : ''}`} onClick={mic} title="Sesli giriş">
                <Icon name="mic" />
              </button>
            )}
            <textarea
              className="input min-h-[48px] flex-1 resize-none"
              rows={1}
              placeholder="İngilizce cevabını yaz… (Enter gönderir)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submit())}
              autoFocus
            />
            <button className="btn btn-primary px-5 py-3" disabled={busy || !text.trim()}>
              Gönder
            </button>
          </form>
        )}
      </div>
      <div className="card h-fit p-5">
        <div className="label">Hedef kelimelerin</div>
        <div className="space-y-1.5">
          {targets.map((t) => {
            const used = live.used.includes(t.term)
            return (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${used ? 'bg-good text-white' : 'bg-surface-2 text-muted'}`}>{used ? '✓' : ''}</span>
                <span className={`term font-semibold ${used ? 'text-good' : ''}`}>{t.kind === 'pattern' && t.template ? t.template : t.term}</span>
              </div>
            )
          })}
        </div>
        <button className="btn btn-ghost mt-4 w-full text-sm" onClick={onExit}>
          Senaryoyu değiştir
        </button>
      </div>
    </div>
  )
}

export function ConversationPage() {
  const { info } = useApp()
  const [session, setSession] = useState<{ scenario: string; targets: Item[] } | null>(null)
  return (
    <div>
      <PageHeader title="Konuşma pratiği" sub="Seçtiğin senaryoda, sadece kendi kelime ve kalıplarınla sohbet." />
      {!info?.hasApiKey ? (
        <div className="card p-10 text-center">
          <div className="text-xl font-extrabold">Bu özellik için yapay zekâ bağlantısı gerekiyor</div>
          <p className="mt-2 text-muted">Konuşma pratiği yapay zekâ ile çalışır. Uygulamanın geri kalanı anahtarsız da tam çalışır.</p>
          <button className="btn btn-primary mt-5" onClick={() => navigate('/settings')}>
            Ayarlar → Yapay zekâ (Claude hesabım)
          </button>
        </div>
      ) : session ? (
        <Chat key={session.scenario + session.targets.length} scenario={session.scenario} targets={session.targets} onExit={() => setSession(null)} />
      ) : (
        <Setup onStart={(scenario, targets) => setSession({ scenario, targets })} />
      )}
    </div>
  )
}
