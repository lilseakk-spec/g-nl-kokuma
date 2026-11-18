import { useState } from 'react'
import type { ItemDraft } from '@shared/types'
import { parseBulkLines, splitMeanings, normalizeTerm } from '@shared/text'
import { api } from '../lib/api'
import { navigate, useApp } from '../lib/store'
import { Icon, PageHeader, SpeakButton, Spinner, TagInput } from '../components/ui'
import { ItemEditor, ListPicker, emptyDraft } from '../components/ItemEditor'

interface Row {
  key: number
  include: boolean
  draft: ItemDraft
  meaningStr: string
  duplicate: boolean
  state: 'idle' | 'loading' | 'done' | 'error'
  error?: string
}

function BulkPreview({ initial, onDone }: { initial: Row[]; onDone: () => void }) {
  const { info, toast } = useApp()
  const [rows, setRows] = useState<Row[]>(initial)
  const [listIds, setListIds] = useState<number[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [startLearning, setStartLearning] = useState(false)
  const [busy, setBusy] = useState(false)
  const hasAi = !!info?.hasApiKey

  const upd = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))

  const fillAll = async () => {
    setBusy(true)
    const queue = rows.filter((r) => r.include && !r.duplicate && r.state !== 'done')
    let idx = 0
    const worker = async () => {
      while (idx < queue.length) {
        const r = queue[idx++]
        upd(r.key, { state: 'loading' })
        try {
          const meaning = splitMeanings(r.meaningStr)[0]
          const e = await api.aiEnrich(r.draft.term, meaning)
          upd(r.key, { state: 'done', draft: { ...r.draft, ...e }, meaningStr: e.meanings.join(', ') })
        } catch (err) {
          upd(r.key, { state: 'error', error: (err as Error).message })
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setBusy(false)
  }

  const commit = async () => {
    const chosen = rows.filter((r) => r.include && !r.duplicate)
    const missing = chosen.filter((r) => !splitMeanings(r.meaningStr).length)
    if (missing.length) return toast(`${missing.length} satırda Türkçe anlam eksik. Doldurun veya satırı çıkarın.`, 'err')
    setBusy(true)
    try {
      const drafts = chosen.map((r) => ({
        ...r.draft,
        meanings: splitMeanings(r.meaningStr),
        listIds: [...new Set([...(r.draft.listIds ?? []), ...listIds])],
        tags: [...new Set([...(r.draft.tags ?? []), ...tags])],
        status: startLearning ? ('learning' as const) : ('pool' as const)
      }))
      const added = await api.addMany(drafts)
      toast(`${added.length} kart eklendi${startLearning ? ' ve çalışmaya alındı' : ' (havuza)'}`)
      onDone()
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const included = rows.filter((r) => r.include && !r.duplicate).length
  const needsAi = rows.filter((r) => r.include && !r.duplicate && r.state !== 'done').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {hasAi ? (
          <button className="btn btn-brand" disabled={busy || needsAi === 0} onClick={fillAll}>
            {busy ? <Spinner /> : <Icon name="sparkles" size={16} />} Eksikleri yapay zekâ ile doldur ({needsAi})
          </button>
        ) : (
          <span className="text-sm text-muted">Yapay zekâ kapalı — anlamları tabloda kendin yazabilirsin.</span>
        )}
        <span className="ml-auto text-sm text-muted">
          {included} / {rows.length} satır eklenecek
        </span>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/60 text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="w-10 p-3"></th>
              <th className="p-3">Kelime / kalıp</th>
              <th className="p-3">Türkçe anlam</th>
              <th className="p-3">Örnek</th>
              <th className="w-28 p-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={`border-t border-line align-top ${!r.include || r.duplicate ? 'opacity-50' : ''}`}>
                <td className="p-3">
                  <input type="checkbox" checked={r.include && !r.duplicate} disabled={r.duplicate} onChange={(e) => upd(r.key, { include: e.target.checked })} />
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <input
                      className="input term py-1 font-bold"
                      value={r.draft.term}
                      onChange={(e) => upd(r.key, { draft: { ...r.draft, term: e.target.value } })}
                    />
                    <SpeakButton text={r.draft.term} size={14} />
                  </div>
                  {r.draft.ipa && <div className="mt-1 pl-1 text-xs text-muted">{r.draft.ipa} · {r.draft.pos} · {r.draft.cefr}</div>}
                </td>
                <td className="p-2">
                  <input className="input py-1" value={r.meaningStr} placeholder="anlam *" onChange={(e) => upd(r.key, { meaningStr: e.target.value })} />
                </td>
                <td className="p-2 text-xs text-muted">
                  {r.draft.examples[0] ? (
                    <>
                      <div className="text-ink">{r.draft.examples[0].en}</div>
                      <div>{r.draft.examples[0].tr}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3 text-xs">
                  {r.duplicate ? (
                    <span className="font-semibold text-warn">Zaten var</span>
                  ) : r.state === 'loading' ? (
                    <Spinner className="text-brand" />
                  ) : r.state === 'done' ? (
                    <span className="font-semibold text-good">✓ Hazır</span>
                  ) : r.state === 'error' ? (
                    <span className="text-bad" title={r.error}>
                      Hata
                    </span>
                  ) : (
                    <span className="text-muted">Yeni</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card grid gap-4 p-4 md:grid-cols-2">
        <div>
          <label className="label">Hepsini şu listelere ekle</label>
          <ListPicker value={listIds} onChange={setListIds} />
        </div>
        <div>
          <label className="label">Hepsine etiket</label>
          <TagInput value={tags} onChange={setTags} placeholder="etiket (Enter)" />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={startLearning} onChange={(e) => setStartLearning(e.target.checked)} />
          Eklenince hemen çalışmaya başla (işaretlemezsen havuza girer)
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy || included === 0} onClick={commit}>
          <Icon name="check" size={16} /> Onayla ve {included} kartı ekle
        </button>
        <button className="btn btn-ghost" onClick={onDone}>
          Vazgeç
        </button>
      </div>
    </div>
  )
}

async function makeRows(items: { term: string; meaning: string; example?: string; exampleTr?: string; tags?: string[] }[]): Promise<Row[]> {
  const dups = await api.findDuplicates(items.map((i) => i.term))
  const seen = new Set<string>()
  return items.map((it, k) => {
    const norm = normalizeTerm(it.term)
    const inBatchDup = seen.has(norm)
    seen.add(norm)
    const draft: ItemDraft = {
      ...emptyDraft(/\s/.test(it.term.trim()) && /\b(i|you|would|could|let's|how|what)\b/i.test(it.term) ? 'pattern' : 'word'),
      term: it.term,
      examples: it.example ? [{ en: it.example, tr: it.exampleTr ?? '' }] : [],
      tags: it.tags ?? []
    }
    return { key: k, include: true, draft, meaningStr: it.meaning, duplicate: dups[k] || inBatchDup, state: 'idle' }
  })
}

function BulkTab() {
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  if (rows) return <BulkPreview initial={rows} onDone={() => (setRows(null), setText(''))} />
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Her satıra bir kelime veya kalıp yaz. İstersen anlamını da ekle: <code className="chip">take for granted - hafife almak</code>{' '}
        <code className="chip">commute: işe gidip gelmek</code>
      </p>
      <textarea
        className="input term min-h-[260px] font-medium"
        placeholder={'resilient\ntake for granted - hafife almak\nI was wondering if\ncommute: işe gidip gelmek'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="btn btn-primary"
        disabled={!text.trim()}
        onClick={async () => setRows(await makeRows(parseBulkLines(text).map((p) => ({ term: p.term, meaning: p.meaning }))))}
      >
        Satırları ayrıştır ({parseBulkLines(text).length})
      </button>
    </div>
  )
}

function ImportTab() {
  const { toast } = useApp()
  const [rows, setRows] = useState<Row[] | null>(null)
  if (rows) return <BulkPreview initial={rows} onDone={() => setRows(null)} />
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-bold">CSV veya Anki dosyasından içe aktar</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>CSV: ilk sütun kelime, ikinci sütun anlam. Başlık satırı varsa (term, meaning, example, example_tr, tags) otomatik tanınır.</li>
          <li>Anki: Dosya → Dışa aktar → "Notes in Plain Text (.txt)". Ön yüz kelime, arka yüz anlam olmalı.</li>
          <li>Önce önizleme tablosu açılır; onaylamadan hiçbir şey eklenmez.</li>
        </ul>
        <button
          className="btn btn-primary mt-4"
          onClick={async () => {
            const r = await api.pickImportFile()
            if (!r) return
            if (!r.rows.length) return toast('Dosyada satır bulunamadı.', 'err')
            setRows(await makeRows(r.rows))
          }}
        >
          <Icon name="upload" size={16} /> Dosya seç
        </button>
      </div>
      <div className="card p-5">
        <h3 className="font-bold">Yedekleme</h3>
        <p className="mt-1 text-sm text-muted">Tam yedek (JSON) alma ve geri yükleme Ayarlar ekranındadır.</p>
        <button className="btn mt-3" onClick={() => navigate('/settings')}>
          Ayarlar → Yedekleme
        </button>
      </div>
    </div>
  )
}

export function AddPage({ tab }: { tab: string }) {
  const tabs = [
    ['single', 'Tek tek'],
    ['bulk', 'Toplu ekle'],
    ['import', 'CSV / Anki']
  ]
  return (
    <div>
      <PageHeader title="Kelime ekle" sub="Eklediğin her kart önce havuza girer; ne zaman çalışacağına sen karar verirsin." />
      <div className="mb-5 flex gap-1 rounded-xl bg-surface-2/70 p-1 text-sm font-semibold" style={{ width: 'fit-content' }}>
        {tabs.map(([id, l]) => (
          <button
            key={id}
            onClick={() => navigate(`/add?tab=${id}`)}
            className={`rounded-lg px-4 py-1.5 ${tab === id ? 'bg-surface shadow' : 'text-muted hover:text-ink'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === 'bulk' ? (
        <BulkTab />
      ) : tab === 'import' ? (
        <ImportTab />
      ) : (
        <div className="card p-6">
          <ItemEditor autoFocus />
        </div>
      )}
    </div>
  )
}
