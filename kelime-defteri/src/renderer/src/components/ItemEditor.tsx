import { useEffect, useRef, useState } from 'react'
import type { Example, Item, ItemDraft, ItemKind, WordList } from '@shared/types'
import { api } from '../lib/api'
import { navigate, useApp, useData } from '../lib/store'
import { Icon, SpeakButton, Spinner, TagInput } from './ui'
import { normalizeTerm, splitMeanings } from '@shared/text'

export function emptyDraft(kind: ItemKind = 'word'): ItemDraft {
  return {
    kind,
    term: '',
    ipa: '',
    pos: '',
    meanings: [],
    examples: [],
    synonyms: [],
    antonyms: [],
    collocations: [],
    cefr: '',
    notes: '',
    register: '',
    template: '',
    usage: '',
    listIds: [],
    tags: []
  }
}

export function itemToDraft(i: Item): ItemDraft {
  const { id: _id, status: _s, paused: _p, position: _pos, createdAt: _c, updatedAt: _u, srs: _srs, ...rest } = i
  return rest
}

const list2str = (xs: string[]) => xs.join(', ')
const str2list = (s: string) => splitMeanings(s)

export function ListPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [lists, reload] = useData(() => api.getLists())
  const [name, setName] = useState('')
  const userLists = (lists ?? []).filter((l: WordList) => !l.system)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {userLists.map((l) => {
        const on = value.includes(l.id)
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== l.id) : [...value, l.id])}
            className={`chip cursor-pointer border ${on ? 'border-brand bg-brand text-white' : 'border-line'}`}
          >
            {on && '✓ '}
            {l.name}
          </button>
        )
      })}
      <input
        className="input w-40 py-1 text-xs"
        placeholder="+ Yeni liste (Enter)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && name.trim()) {
            e.preventDefault()
            const l = await api.createList(name.trim())
            setName('')
            reload()
            onChange([...value, l.id])
          }
        }}
      />
    </div>
  )
}

interface Props {
  initial?: ItemDraft
  item?: Item
  autoFocus?: boolean
  onSaved?: (item: Item) => void
  onCancel?: () => void
  compact?: boolean
}

export function ItemEditor({ initial, item, autoFocus, onSaved, onCancel, compact }: Props) {
  const { info, toast } = useApp()
  const [d, setD] = useState<ItemDraft>(initial ?? (item ? itemToDraft(item) : emptyDraft()))
  const [meaningStr, setMeaningStr] = useState(list2str(d.meanings))
  const [loading, setLoading] = useState(false)
  const [filled, setFilled] = useState(!!item)
  const [dup, setDup] = useState<Item | null>(null)
  const [saving, setSaving] = useState(false)
  const termRef = useRef<HTMLInputElement>(null)
  const hasAi = !!info?.hasApiKey
  const set = (p: Partial<ItemDraft>) => setD((x) => ({ ...x, ...p }))

  useEffect(() => {
    if (autoFocus) termRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const t = setTimeout(async () => {
      setDup(d.term.trim() ? await api.findDuplicate(d.term, item?.id) : null)
    }, 250)
    return () => clearTimeout(t)
  }, [d.term, item?.id])

  // ---- otomatik doldurma: yazmayı bırakınca yapay zekâ alanları kendiliğinden doldurur ----
  const [filledFor, setFilledFor] = useState<string | null>(item ? normalizeTerm(item.term) : null)
  const snapshot = useRef('')
  const reqId = useRef(0)
  const detailsJson = (x: ItemDraft) => JSON.stringify([x.ipa, x.pos, x.cefr, x.examples, x.synonyms, x.antonyms, x.collocations, x.template, x.usage])

  const aiFill = async (): Promise<ItemDraft | null> => {
    if (!d.term.trim()) return null
    const my = ++reqId.current
    const term = d.term.trim()
    setLoading(true)
    try {
      const firstMeaning = str2list(meaningStr)[0]
      const r = await api.aiEnrich(term, firstMeaning)
      if (my !== reqId.current) return null // daha yeni bir istek var
      const mergeInto = (x: ItemDraft): ItemDraft => ({
        ...x,
        ...r,
        kind: x.kind === 'pattern' ? 'pattern' : r.kind,
        term: x.term,
        listIds: x.listIds,
        tags: x.tags,
        notes: x.notes
      })
      const merged = mergeInto(d)
      snapshot.current = detailsJson(merged)
      setD(mergeInto)
      setMeaningStr(list2str(r.meanings))
      setFilledFor(normalizeTerm(term))
      setFilled(true)
      return { ...merged, meanings: r.meanings }
    } catch (e) {
      if (my === reqId.current) {
        toast((e as Error).message, 'err')
        setFilled(true)
      }
      return null
    } finally {
      if (my === reqId.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasAi || item) return
    const term = normalizeTerm(d.term)
    if (term.length < 2 || term === filledFor) return
    // kullanıcı ayrıntıları elle değiştirdiyse üzerine yazma
    if (filledFor && detailsJson(d) !== snapshot.current) return
    const t = setTimeout(() => void aiFill(), 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.term, hasAi])

  const save = async (startLearning = false) => {
    let draft: ItemDraft = { ...d, meanings: str2list(meaningStr) }
    // Anlam yazılmadıysa ve yapay zekâ açıksa önce doldurmayı bekle
    if (!item && hasAi && !draft.meanings.length && draft.term.trim()) {
      const r = await aiFill()
      if (r) draft = { ...r, meanings: r.meanings }
    }
    if (!draft.term.trim()) return toast('Kelimeyi/kalıbı yazın.', 'err')
    if (!draft.meanings.length) return toast('Türkçe anlam zorunludur.', 'err')
    setSaving(true)
    try {
      let saved: Item
      if (item) saved = await api.updateItem(item.id, draft)
      else {
        saved = await api.addItem({ ...draft, status: startLearning ? 'learning' : 'pool' })
      }
      toast(item ? 'Kaydedildi' : startLearning ? `"${saved.term}" eklendi ve çalışmaya alındı` : `"${saved.term}" havuza eklendi`)
      onSaved?.(saved)
      if (!item) {
        setD({ ...emptyDraft(d.kind), listIds: d.listIds, tags: d.tags })
        setMeaningStr('')
        setFilled(false)
        setFilledFor(null)
        reqId.current++
        setLoading(false)
        termRef.current?.focus()
      }
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const setExample = (i: number, p: Partial<Example>) => {
    const ex = [...d.examples]
    ex[i] = { ...(ex[i] ?? { en: '', tr: '' }), ...p }
    set({ examples: ex })
  }

  const showDetails = filled || loading || !!item || !hasAi
  const isPattern = d.kind === 'pattern'

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['word', 'pattern'] as ItemKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => set({ kind: k })}
            className={`btn py-1.5 text-xs ${d.kind === k ? 'border-ink bg-ink text-bg hover:bg-ink' : ''}`}
          >
            {k === 'word' ? 'Kelime / deyim' : 'Konuşma kalıbı'}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div>
          <label className="label">{isPattern ? 'Kalıp (İngilizce)' : 'Kelime (İngilizce)'}</label>
          <div className="flex items-center gap-2">
            <input
              ref={termRef}
              className={`input term ${compact ? 'text-lg' : 'text-xl'} font-bold`}
              placeholder={isPattern ? "I'm looking forward to…" : 'resilient'}
              value={d.term}
              onChange={(e) => set({ term: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void save()
                }
              }}
            />
            {d.term && <SpeakButton text={d.term} />}
          </div>
        </div>
        <div>
          <label className="label">Türkçe anlam {hasAi && !filled ? '(isteğe bağlı)' : '*'}</label>
          <input
            className="input"
            placeholder="dayanıklı, dirençli"
            value={meaningStr}
            onChange={(e) => setMeaningStr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), save())}
          />
        </div>
      </div>

      {dup && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm">
          <span>
            ⚠️ <b>{dup.term}</b> zaten defterinde var ({dup.meanings.join(', ')}).
          </span>
          <button className="btn py-1 text-xs" onClick={() => navigate(`/words?open=${dup.id}`)}>
            Göster
          </button>
        </div>
      )}

      {hasAi && !item && (
        <div className="flex min-h-[28px] items-center gap-3 text-sm">
          {loading ? (
            <span className="flex items-center gap-2 font-semibold text-brand">
              <Spinner /> {info?.aiMode === 'claude' ? 'Claude' : 'Yapay zekâ'} telaffuz, tür, seviye ve örnek cümleleri dolduruyor… (birkaç saniye)
            </span>
          ) : filled && filledFor ? (
            <>
              <span className="font-semibold text-good">✓ Otomatik dolduruldu — kaydetmeden önce düzenleyebilirsin.</span>
              <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => void aiFill()}>
                <Icon name="refresh" size={12} className="mr-1 inline" />
                Yeniden doldur
              </button>
            </>
          ) : (
            <span className="text-xs text-muted">
              Kelimeyi yaz, gerisini yapay zekâ otomatik doldurur. <span className="kbd">Enter</span> ile hemen kaydedebilirsin; eksikler arka planda tamamlanır.
            </span>
          )}
        </div>
      )}
      {!hasAi && !item && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
          <div>
            <div className="font-bold">Otomatik doldurma kapalı — yapay zekâ bağlı değil</div>
            <div className="text-xs text-muted">
              Telaffuz, tür, seviye ve örnek cümlelerin kendiliğinden gelmesi için Ayarlar → Yapay zekâ'dan "Claude hesabım"ı seç. Şimdilik
              sadece kelime + anlam yazıp kaydedebilirsin; bağladıktan sonra Kelimelerim → "Eksikleri doldur" ile tamamlanır.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary shrink-0 py-1.5"
            onClick={() => {
              onCancel?.()
              navigate('/settings')
            }}
          >
            Yapay zekâyı bağla
          </button>
        </div>
      )}

      {showDetails && (
        <div className="animate-pop space-y-4 rounded-2xl border border-line bg-bg/50 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="label">Telaffuz (IPA)</label>
              <input className="input" value={d.ipa} placeholder={hasAi ? "otomatik dolacak" : "ör. /tent/"} onChange={(e) => set({ ipa: e.target.value })} />
            </div>
            <div>
              <label className="label">Tür</label>
              <input className="input" value={d.pos} placeholder={hasAi ? "otomatik dolacak" : "ör. isim"} onChange={(e) => set({ pos: e.target.value })} />
            </div>
            <div>
              <label className="label">Seviye</label>
              <select className="input" value={d.cefr} onChange={(e) => set({ cefr: e.target.value })}>
                <option value="">—</option>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            {isPattern && (
              <div>
                <label className="label">Kullanım</label>
                <select className="input" value={d.register} onChange={(e) => set({ register: e.target.value as ItemDraft['register'] })}>
                  <option value="">—</option>
                  <option value="informal">Günlük</option>
                  <option value="neutral">Nötr</option>
                  <option value="formal">Resmi</option>
                </select>
              </div>
            )}
          </div>

          {isPattern && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="label">Boşluklu şablon</label>
                <input
                  className="input"
                  value={d.template}
                  placeholder="I'm looking forward to ___"
                  onChange={(e) => set({ template: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Kullanım durumu</label>
                <input
                  className="input"
                  value={d.usage}
                  placeholder="Bir şeyi heyecanla beklediğini söylerken"
                  onChange={(e) => set({ usage: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Örnek cümleler</label>
            <div className="space-y-2">
              {[...d.examples, { en: '', tr: '' }].slice(0, Math.max(2, d.examples.length + 1)).map((ex, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-center gap-1">
                    <input className="input" placeholder="English sentence" value={ex.en} onChange={(e) => setExample(i, { en: e.target.value })} />
                    {ex.en && <SpeakButton text={ex.en} size={14} />}
                  </div>
                  <input className="input" placeholder="Türkçe çevirisi" value={ex.tr} onChange={(e) => setExample(i, { tr: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          {!compact && (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="label">Eş anlamlılar</label>
                <input className="input" value={list2str(d.synonyms)} onChange={(e) => set({ synonyms: str2list(e.target.value) })} />
              </div>
              <div>
                <label className="label">Zıt anlamlılar</label>
                <input className="input" value={list2str(d.antonyms)} onChange={(e) => set({ antonyms: str2list(e.target.value) })} />
              </div>
              <div>
                <label className="label">Sık kalıplar</label>
                <input className="input" value={list2str(d.collocations)} onChange={(e) => set({ collocations: str2list(e.target.value) })} />
              </div>
            </div>
          )}
          {!compact && (d.synonyms.length > 0 || d.antonyms.length > 0) && (
            <p className="-mt-2 text-xs text-muted">Eş/zıt anlamlılar sadece bilgi içindir; ayrı kart olarak eklenmez.</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label">Listeler</label>
              <ListPicker value={d.listIds ?? []} onChange={(v) => set({ listIds: v })} />
            </div>
            <div>
              <label className="label">Etiketler</label>
              <TagInput value={d.tags ?? []} onChange={(v) => set({ tags: v })} placeholder="iş, dizi… (Enter)" />
            </div>
          </div>
          {!compact && (
            <div>
              <label className="label">Not</label>
              <textarea className="input min-h-[60px]" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          )}
        </div>
      )}

      {showDetails && (
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" disabled={saving} onClick={() => save(false)}>
            <Icon name="check" size={16} /> {item ? 'Kaydet' : 'Havuza ekle'}
          </button>
          {!item && (
            <button className="btn btn-brand" disabled={saving} onClick={() => save(true)}>
              <Icon name="play" size={14} /> Ekle ve çalışmaya başla
            </button>
          )}
          {onCancel && (
            <button className="btn btn-ghost" onClick={onCancel}>
              Vazgeç
            </button>
          )}
        </div>
      )}
    </div>
  )
}
