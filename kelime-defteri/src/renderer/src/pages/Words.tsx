import { useEffect, useMemo, useState } from 'react'
import type { Item, ItemFilter, ItemKind, ItemStatus } from '@shared/types'
import { formatInterval } from '@shared/srs'
import { api } from '../lib/api'
import { navigate, useApp, useData } from '../lib/store'
import { Icon, Modal, PageHeader, SpeakButton, StatusChip, askText } from '../components/ui'
import { ItemEditor } from '../components/ItemEditor'

function nextDue(i: Item): string {
  if (i.status !== 'learning' || !i.srs) return ''
  const d = i.srs.due - Date.now()
  return d <= 0 ? 'şimdi' : formatInterval(d)
}

function DetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { toast } = useApp()
  const [item] = useData(() => api.getItem(id), [id])
  const [edit, setEdit] = useState(false)
  if (!item) return null
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    await fn()
    toast(msg)
  }
  return (
    <Modal open onClose={onClose} wide>
      {edit ? (
        <ItemEditor item={item} onSaved={() => setEdit(false)} onCancel={() => setEdit(false)} />
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="term text-3xl font-extrabold">{item.kind === 'pattern' && item.template ? item.template : item.term}</h2>
                <SpeakButton text={item.term} size={20} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                {item.ipa && <span>{item.ipa}</span>}
                {item.pos && <span>· {item.pos}</span>}
                {item.cefr && <span className="chip">{item.cefr}</span>}
                {item.register && <span className="chip">{{ formal: 'Resmi', informal: 'Günlük', neutral: 'Nötr' }[item.register]}</span>}
                <StatusChip status={item.status} paused={item.paused} />
              </div>
            </div>
            <button className="btn" onClick={() => setEdit(true)}>
              <Icon name="edit" size={15} /> Düzenle
            </button>
          </div>
          <div className="text-xl font-semibold">{item.meanings.join(', ')}</div>
          {item.usage && <p className="text-sm text-muted">Kullanım: {item.usage}</p>}
          {item.examples.length > 0 && (
            <div className="space-y-2">
              {item.examples.map((e, k) => (
                <div key={k} className="flex items-start gap-2 rounded-xl bg-surface-2/50 p-3">
                  <SpeakButton text={e.en} size={14} />
                  <div className="selectable">
                    <div className="font-medium">{e.en}</div>
                    <div className="text-sm text-muted">{e.tr}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 text-sm md:grid-cols-3">
            {item.synonyms.length > 0 && (
              <div>
                <div className="label">Eş anlamlılar</div>
                {item.synonyms.join(', ')}
              </div>
            )}
            {item.antonyms.length > 0 && (
              <div>
                <div className="label">Zıt anlamlılar</div>
                {item.antonyms.join(', ')}
              </div>
            )}
            {item.collocations.length > 0 && (
              <div>
                <div className="label">Sık kalıplar</div>
                {item.collocations.join(', ')}
              </div>
            )}
          </div>
          {item.notes && <p className="selectable rounded-xl border border-line p-3 text-sm">{item.notes}</p>}
          {item.srs && item.status === 'learning' && (
            <p className="text-xs text-muted">
              Sonraki tekrar: {nextDue(item)} · {item.srs.reps} tekrar · {item.srs.lapses} unutma
            </p>
          )}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {item.status === 'pool' && (
              <button className="btn btn-brand" onClick={() => act(() => api.setStatus([item.id], 'learning'), 'Çalışmaya alındı')}>
                <Icon name="play" size={14} /> Çalışmaya başla
              </button>
            )}
            {item.status !== 'learned' && (
              <button className="btn" onClick={() => act(() => api.setStatus([item.id], 'learned'), 'Öğrendim olarak işaretlendi')}>
                <Icon name="check" size={15} /> Öğrendim
              </button>
            )}
            {item.status !== 'pool' && (
              <button className="btn" onClick={() => act(() => api.setStatus([item.id], 'pool'), 'Havuza geri alındı')}>
                Havuza al
              </button>
            )}
            <button className="btn" onClick={() => act(() => api.setPaused([item.id], !item.paused), item.paused ? 'Devam ediyor' : 'Duraklatıldı')}>
              <Icon name="pause" size={15} /> {item.paused ? 'Devam ettir' : 'Duraklat'}
            </button>
            <button className="btn" onClick={() => act(() => api.resetProgress([item.id]), 'İlerleme sıfırlandı')}>
              <Icon name="refresh" size={15} /> Sıfırla
            </button>
            <button
              className="btn btn-danger ml-auto"
              onClick={async () => {
                if (!confirm(`"${item.term}" silinsin mi? Bu geri alınamaz.`)) return
                await api.deleteItems([item.id])
                toast('Silindi')
                onClose()
              }}
            >
              <Icon name="trash" size={15} /> Sil
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ListsPanel({ active, onPick }: { active?: number; onPick: (id?: number) => void }) {
  const [lists] = useData(() => api.getLists())
  const [tags] = useData(() => api.allTags())
  return (
    <div className="space-y-5">
      <div>
        <div className="label px-2">Listeler</div>
        <button onClick={() => onPick(undefined)} className={`w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold ${!active ? 'bg-surface-2' : 'hover:bg-surface-2/60'}`}>
          Tümü
        </button>
        {lists?.map((l) => (
          <div key={l.id} className={`group flex items-center rounded-lg ${active === l.id ? 'bg-surface-2' : 'hover:bg-surface-2/60'}`}>
            <button onClick={() => onPick(l.id)} className="flex-1 truncate px-2 py-1.5 text-left text-sm font-semibold">
              {l.system ? '⚠️ ' : ''}
              {l.name} <span className="text-xs text-muted">{l.count}</span>
            </button>
            {!l.system && (
              <span className="hidden gap-1 pr-1 group-hover:flex">
                <button
                  className="p-1 text-muted hover:text-ink"
                  title="Yeniden adlandır"
                  onClick={async () => {
                    const n = await askText('Yeni liste adı', l.name)
                    if (n?.trim()) await api.renameList(l.id, n)
                  }}
                >
                  <Icon name="edit" size={13} />
                </button>
                <button
                  className="p-1 text-muted hover:text-bad"
                  title="Listeyi sil (kartlar silinmez)"
                  onClick={async () => {
                    if (confirm(`"${l.name}" listesi silinsin mi? Kartlar silinmez.`)) {
                      await api.deleteList(l.id)
                      if (active === l.id) onPick(undefined)
                    }
                  }}
                >
                  <Icon name="trash" size={13} />
                </button>
              </span>
            )}
          </div>
        ))}
        <button
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-brand hover:bg-surface-2/60"
          onClick={async () => {
            const n = await askText('Liste adı (ör. İş İngilizcesi)')
            if (n?.trim()) await api.createList(n)
          }}
        >
          + Yeni liste
        </button>
      </div>
      {tags && tags.length > 0 && (
        <div>
          <div className="label px-2">Etiketler</div>
          <div className="flex flex-wrap gap-1 px-2">
            {tags.map((t) => (
              <span key={t.tag} className="chip">
                #{t.tag} {t.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function WordsPage({ kind, openId }: { kind: ItemKind; openId?: number }) {
  const { toast } = useApp()
  const isPatterns = kind === 'pattern'
  const [f, setF] = useState<ItemFilter>({ sort: 'added', kind: isPatterns ? 'pattern' : undefined })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [open, setOpen] = useState<number | undefined>(openId)
  const [lists] = useData(() => api.getLists())
  const [tags] = useData(() => api.allTags())
  const [items] = useData(() => api.listItems(f), [JSON.stringify(f)])
  const [dragId, setDragId] = useState<number | null>(null)
  const [order, setOrder] = useState<Item[] | null>(null)

  useEffect(() => setF((x) => ({ ...x, kind: isPatterns ? 'pattern' : undefined })), [isPatterns])
  useEffect(() => setOpen(openId), [openId])
  useEffect(() => setOrder(null), [items])

  const shown = order ?? items ?? []
  const ids = [...selected]
  const allChecked = shown.length > 0 && shown.every((i) => selected.has(i.id))
  const userLists = useMemo(() => (lists ?? []).filter((l) => !l.system), [lists])

  const bulk = async (fn: () => Promise<unknown>, msg: string, clear = true) => {
    await fn()
    toast(msg)
    if (clear) setSelected(new Set())
  }

  const canDrag = f.sort === 'position'

  return (
    <div className="flex gap-6">
      <div className="w-48 shrink-0 pt-16">
        <ListsPanel active={f.listId} onPick={(id) => setF({ ...f, listId: id })} />
      </div>
      <div className="min-w-0 flex-1">
        <PageHeader
          title={isPatterns ? 'Kalıplarım' : 'Kelimelerim'}
          sub={isPatterns ? 'Konuşma kalıpların: şablon, anlam ve kullanım durumu.' : 'Seç, çalışmaya başlat, listele, duraklat.'}
        >
          <button className="btn" onClick={() => api.exportCsv().then((p) => p && toast('CSV kaydedildi'))}>
            <Icon name="download" size={15} /> CSV
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/add')}>
            <Icon name="plus" size={15} /> Ekle
          </button>
        </PageHeader>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Ara (kelime, anlam, not)…" value={f.search ?? ''} onChange={(e) => setF({ ...f, search: e.target.value })} />
          </div>
          <select className="input w-auto" value={f.status ?? ''} onChange={(e) => setF({ ...f, status: (e.target.value || undefined) as ItemFilter['status'] })}>
            <option value="">Tüm durumlar</option>
            <option value="pool">Havuzda</option>
            <option value="learning">Öğreniyorum</option>
            <option value="learned">Öğrendim</option>
            <option value="due">Tekrarı gelenler</option>
            <option value="paused">Duraklatılanlar</option>
          </select>
          {!isPatterns && (
            <select className="input w-auto" value={f.kind ?? ''} onChange={(e) => setF({ ...f, kind: (e.target.value || undefined) as ItemKind })}>
              <option value="">Kelime + kalıp</option>
              <option value="word">Sadece kelimeler</option>
              <option value="pattern">Sadece kalıplar</option>
            </select>
          )}
          <select className="input w-auto" value={f.tag ?? ''} onChange={(e) => setF({ ...f, tag: e.target.value || undefined })}>
            <option value="">Tüm etiketler</option>
            {tags?.map((t) => (
              <option key={t.tag} value={t.tag}>
                #{t.tag}
              </option>
            ))}
          </select>
          <select className="input w-auto" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as ItemFilter['sort'] })}>
            <option value="added">Yeni eklenen</option>
            <option value="position">Benim sıram (sürükle-bırak)</option>
            <option value="alpha">A → Z</option>
            <option value="due">Tekrar zamanı</option>
          </select>
        </div>

        {selected.size > 0 && (
          <div className="card sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 border-brand/50 p-2.5">
            <span className="px-2 text-sm font-bold">{selected.size} seçili</span>
            <button className="btn btn-brand py-1.5" onClick={() => bulk(() => api.setStatus(ids, 'learning'), `${ids.length} kart çalışmaya alındı`)}>
              <Icon name="play" size={13} /> Çalışmaya başla
            </button>
            <button className="btn py-1.5" onClick={() => bulk(() => api.setStatus(ids, 'learned'), 'Öğrendim olarak işaretlendi')}>
              Öğrendim
            </button>
            <button className="btn py-1.5" onClick={() => bulk(() => api.setStatus(ids, 'pool'), 'Havuza alındı')}>
              Havuza al
            </button>
            <button className="btn py-1.5" onClick={() => bulk(() => api.setPaused(ids, true), 'Duraklatıldı')}>
              Duraklat
            </button>
            <button className="btn py-1.5" onClick={() => bulk(() => api.setPaused(ids, false), 'Devam ettiriliyor')}>
              Devam
            </button>
            <button className="btn py-1.5" onClick={() => confirm('Seçili kartların ilerlemesi sıfırlansın mı?') && bulk(() => api.resetProgress(ids), 'Sıfırlandı')}>
              Sıfırla
            </button>
            <select
              className="input w-auto py-1.5 text-sm"
              value=""
              onChange={async (e) => {
                const v = e.target.value
                if (!v) return
                if (v === 'new') {
                  const n = await askText('Yeni liste adı')
                  if (!n?.trim()) return
                  const l = await api.createList(n)
                  await bulk(() => api.addToList(ids, l.id), `"${l.name}" listesine eklendi`, false)
                } else if (v.startsWith('rm:')) await bulk(() => api.removeFromList(ids, Number(v.slice(3))), 'Listeden çıkarıldı', false)
                else await bulk(() => api.addToList(ids, Number(v)), 'Listeye eklendi', false)
              }}
            >
              <option value="">Listeye ekle…</option>
              {userLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              <option value="new">+ Yeni liste</option>
              {f.listId && <option value={`rm:${f.listId}`}>Bu listeden çıkar</option>}
            </select>
            <button
              className="btn py-1.5"
              onClick={async () => {
                const t = await askText('Eklenecek etiket')
                if (t?.trim()) void bulk(() => api.addTag(ids, t), `#${t.trim()} etiketi eklendi`, false)
              }}
            >
              <Icon name="tag" size={13} /> Etiket
            </button>
            <button
              className="btn btn-danger py-1.5"
              onClick={() => confirm(`${ids.length} kart kalıcı olarak silinsin mi?`) && bulk(() => api.deleteItems(ids), 'Silindi')}
            >
              <Icon name="trash" size={13} /> Sil
            </button>
            <button className="btn btn-ghost ml-auto py-1.5" onClick={() => setSelected(new Set())}>
              Seçimi temizle
            </button>
          </div>
        )}

        {canDrag && <p className="mb-2 text-xs text-muted">Satırları sürükleyerek sırala. "Havuzdan her gün X kelime al" ayarı "Benim sıram" seçiliyse bu sırayı kullanır.</p>}

        {items && items.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-lg font-bold">{f.search || f.status || f.listId || f.tag ? 'Bu filtreyle kart yok.' : isPatterns ? 'Henüz kalıp eklemedin.' : 'Henüz kelime eklemedin.'}</div>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/add')}>
              <Icon name="plus" size={15} /> {isPatterns ? 'Kalıp ekle' : 'Kelime ekle'}
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="w-10 p-3">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => setSelected(allChecked ? new Set() : new Set(shown.map((i) => i.id)))}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  {canDrag && <th className="w-6"></th>}
                  <th className="p-3">{isPatterns ? 'Kalıp' : 'Kelime'}</th>
                  <th className="p-3">Anlam</th>
                  {isPatterns && <th className="p-3">Kullanım</th>}
                  <th className="p-3">Durum</th>
                  <th className="p-3">Tekrar</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <tr
                    key={i.id}
                    draggable={canDrag}
                    onDragStart={() => setDragId(i.id)}
                    onDragOver={(e) => {
                      if (!canDrag || dragId === null || dragId === i.id) return
                      e.preventDefault()
                      const arr = [...shown]
                      const from = arr.findIndex((x) => x.id === dragId)
                      const to = arr.findIndex((x) => x.id === i.id)
                      arr.splice(to, 0, arr.splice(from, 1)[0])
                      setOrder(arr)
                    }}
                    onDragEnd={async () => {
                      if (order && items) {
                        // Filtreliyken de genel sırayı koru: görünen kartları kendi yerlerinde yeniden sırala
                        const all = await api.listItems({ sort: 'position' })
                        const shownIds = new Set(order.map((x) => x.id))
                        const queue = [...order]
                        const merged = all.map((x) => (shownIds.has(x.id) ? queue.shift()! : x))
                        await api.reorder(merged.map((x) => x.id))
                      }
                      setDragId(null)
                    }}
                    onClick={() => setOpen(i.id)}
                    className={`cursor-pointer border-t border-line transition hover:bg-surface-2/40 ${selected.has(i.id) ? 'bg-brand-soft/50' : ''} ${dragId === i.id ? 'opacity-40' : ''}`}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(i.id)}
                        onChange={() => {
                          const s = new Set(selected)
                          s.has(i.id) ? s.delete(i.id) : s.add(i.id)
                          setSelected(s)
                        }}
                      />
                    </td>
                    {canDrag && (
                      <td className="cursor-grab text-muted">
                        <Icon name="grip" size={16} />
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <span className="term font-bold">{isPatterns && i.template ? i.template : i.term}</span>
                        <SpeakButton text={i.term} size={13} />
                        {i.kind === 'pattern' && !isPatterns && <span className="chip">kalıp</span>}
                      </div>
                      {(i.tags.length > 0 || i.ipa) && (
                        <div className="text-xs text-muted">
                          {i.ipa} {i.tags.map((t) => `#${t}`).join(' ')}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[260px] truncate p-3 text-muted">{i.meanings.join(', ')}</td>
                    {isPatterns && <td className="max-w-[220px] truncate p-3 text-xs text-muted">{i.usage}</td>}
                    <td className="p-3">
                      <StatusChip status={i.status as ItemStatus} paused={i.paused} />
                    </td>
                    <td className="p-3 text-xs text-muted">{nextDue(i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <DetailModal id={open} onClose={() => (setOpen(undefined), navigate(isPatterns ? '/patterns' : '/words'))} />}
    </div>
  )
}
