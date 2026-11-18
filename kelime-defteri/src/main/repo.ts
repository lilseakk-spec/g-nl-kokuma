// SQLite veri katmanı. Veritabanı BOŞ başlar; hazır kelime listesi yoktur.
import type Database from 'better-sqlite3'
import {
  DEFAULT_SETTINGS,
  type Item,
  type ItemDraft,
  type ItemFields,
  type ItemFilter,
  type ItemStatus,
  type Rating,
  type ReviewResult,
  type Settings,
  type SrsState,
  type Stats,
  type WordList
} from '@shared/types'
import { newSrs, reviewSrs } from '@shared/srs'
import { normalizeTerm } from '@shared/text'
import { addDays, bestStreak, computeStreak, dayKey, startOfDay, DAY } from '@shared/schedule'
import { levelFromXp, newlyEarned, xpForRating, XP, type BadgeContext } from '@shared/gamification'

export const HARD_LIST = 'Zor kelimeler'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL DEFAULT 'word',
  term TEXT NOT NULL,
  term_norm TEXT NOT NULL,
  ipa TEXT NOT NULL DEFAULT '',
  pos TEXT NOT NULL DEFAULT '',
  meanings TEXT NOT NULL DEFAULT '[]',
  examples TEXT NOT NULL DEFAULT '[]',
  synonyms TEXT NOT NULL DEFAULT '[]',
  antonyms TEXT NOT NULL DEFAULT '[]',
  collocations TEXT NOT NULL DEFAULT '[]',
  cefr TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  register TEXT NOT NULL DEFAULT '',
  template TEXT NOT NULL DEFAULT '',
  usage TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pool',
  paused INTEGER NOT NULL DEFAULT 0,
  position REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  srs TEXT,
  due INTEGER,
  last_notified INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_norm ON items(term_norm);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status, paused, due);
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  system INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS item_lists (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, list_id)
);
CREATE TABLE IF NOT EXISTS item_tags (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  ts INTEGER NOT NULL,
  mode TEXT NOT NULL,
  rating INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_ts ON reviews(ts);
CREATE TABLE IF NOT EXISTS activity (
  day TEXT PRIMARY KEY,
  reviews INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  added INTEGER NOT NULL DEFAULT 0,
  learned INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  earned_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

interface Row {
  id: number
  kind: string
  term: string
  term_norm: string
  ipa: string
  pos: string
  meanings: string
  examples: string
  synonyms: string
  antonyms: string
  collocations: string
  cefr: string
  notes: string
  register: string
  template: string
  usage: string
  status: string
  paused: number
  position: number
  created_at: number
  updated_at: number
  srs: string | null
  due: number | null
  last_notified: number
}

const arr = (s: string) => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function cleanList(xs: unknown): string[] {
  if (!Array.isArray(xs)) return []
  return xs.map((x) => String(x ?? '').trim()).filter(Boolean)
}

function deepMerge<T>(base: T, over: unknown): T {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return (over ?? base) as T
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  if (over && typeof over === 'object') {
    for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
      if (k in out) out[k] = deepMerge(out[k], v)
    }
  }
  return out as T
}

export class Repo {
  constructor(public db: Database.Database) {
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.exec(SCHEMA)
    this.ensureHardList()
  }

  // ---------- kv / ayarlar ----------
  kvGet<T>(key: string, fallback: T): T {
    const r = this.db.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined
    if (!r) return fallback
    try {
      return JSON.parse(r.value) as T
    } catch {
      return fallback
    }
  }

  kvSet(key: string, value: unknown): void {
    this.db
      .prepare('INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, JSON.stringify(value))
  }

  getSettings(): Settings {
    return deepMerge(DEFAULT_SETTINGS, this.kvGet('settings', {}))
  }

  saveSettings(patch: Partial<Settings>): Settings {
    const next = deepMerge(this.getSettings(), patch)
    this.kvSet('settings', next)
    return next
  }

  // ---------- satır dönüşümü ----------
  private toItem(r: Row, lists: Map<number, number[]>, tags: Map<number, string[]>): Item {
    return {
      id: r.id,
      kind: r.kind === 'pattern' ? 'pattern' : 'word',
      term: r.term,
      ipa: r.ipa,
      pos: r.pos,
      meanings: arr(r.meanings),
      examples: arr(r.examples),
      synonyms: arr(r.synonyms),
      antonyms: arr(r.antonyms),
      collocations: arr(r.collocations),
      cefr: r.cefr,
      notes: r.notes,
      register: r.register as Item['register'],
      template: r.template,
      usage: r.usage,
      status: r.status as ItemStatus,
      paused: !!r.paused,
      position: r.position,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      srs: r.srs ? (JSON.parse(r.srs) as SrsState) : null,
      listIds: lists.get(r.id) ?? [],
      tags: tags.get(r.id) ?? []
    }
  }

  private hydrate(rows: Row[]): Item[] {
    if (!rows.length) return []
    const ids = rows.map((r) => r.id)
    const lists = new Map<number, number[]>()
    const tags = new Map<number, string[]>()
    const ph = ids.map(() => '?').join(',')
    for (const l of this.db.prepare(`SELECT item_id, list_id FROM item_lists WHERE item_id IN (${ph})`).all(...ids) as {
      item_id: number
      list_id: number
    }[]) {
      if (!lists.has(l.item_id)) lists.set(l.item_id, [])
      lists.get(l.item_id)!.push(l.list_id)
    }
    for (const t of this.db.prepare(`SELECT item_id, tag FROM item_tags WHERE item_id IN (${ph})`).all(...ids) as {
      item_id: number
      tag: string
    }[]) {
      if (!tags.has(t.item_id)) tags.set(t.item_id, [])
      tags.get(t.item_id)!.push(t.tag)
    }
    return rows.map((r) => this.toItem(r, lists, tags))
  }

  // ---------- kartlar ----------
  listItems(f: ItemFilter = {}, now = Date.now()): Item[] {
    const where: string[] = []
    const params: unknown[] = []
    if (f.kind) {
      where.push('i.kind = ?')
      params.push(f.kind)
    }
    if (f.status === 'paused') where.push('i.paused = 1')
    else if (f.status === 'due') {
      where.push("i.status = 'learning' AND i.paused = 0 AND i.due <= ?")
      params.push(now)
    } else if (f.status) {
      where.push('i.status = ?')
      params.push(f.status)
    }
    if (f.listId) {
      where.push('EXISTS (SELECT 1 FROM item_lists il WHERE il.item_id = i.id AND il.list_id = ?)')
      params.push(f.listId)
    }
    if (f.tag) {
      where.push('EXISTS (SELECT 1 FROM item_tags it WHERE it.item_id = i.id AND it.tag = ?)')
      params.push(f.tag)
    }
    if (f.search?.trim()) {
      const q = `%${f.search.trim().toLowerCase()}%`
      where.push('(i.term_norm LIKE ? OR lower(i.meanings) LIKE ? OR lower(i.notes) LIKE ?)')
      params.push(q, q, q)
    }
    const order =
      f.sort === 'alpha'
        ? 'i.term_norm ASC'
        : f.sort === 'position'
          ? 'i.position ASC, i.id ASC'
          : f.sort === 'due'
            ? 'i.due IS NULL, i.due ASC'
            : 'i.created_at DESC, i.id DESC'
    const sql = `SELECT * FROM items i ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`
    return this.hydrate(this.db.prepare(sql).all(...params) as Row[])
  }

  getItem(id: number): Item | null {
    const r = this.db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Row | undefined
    return r ? this.hydrate([r])[0] : null
  }

  getItems(ids: number[]): Item[] {
    if (!ids.length) return []
    const rows = this.db.prepare(`SELECT * FROM items WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as Row[]
    return this.hydrate(rows)
  }

  allTerms(): Set<string> {
    return new Set((this.db.prepare('SELECT term_norm FROM items').all() as { term_norm: string }[]).map((r) => r.term_norm))
  }

  findDuplicate(term: string, excludeId?: number): Item | null {
    const r = this.db
      .prepare('SELECT * FROM items WHERE term_norm = ? AND id != ? LIMIT 1')
      .get(normalizeTerm(term), excludeId ?? -1) as Row | undefined
    return r ? this.hydrate([r])[0] : null
  }

  private fieldValues(d: Partial<ItemFields>) {
    return {
      kind: d.kind === 'pattern' ? 'pattern' : 'word',
      term: (d.term ?? '').trim(),
      ipa: (d.ipa ?? '').trim(),
      pos: (d.pos ?? '').trim(),
      meanings: JSON.stringify(cleanList(d.meanings)),
      examples: JSON.stringify(
        (d.examples ?? [])
          .map((e) => ({ en: String(e?.en ?? '').trim(), tr: String(e?.tr ?? '').trim() }))
          .filter((e) => e.en)
      ),
      synonyms: JSON.stringify(cleanList(d.synonyms)),
      antonyms: JSON.stringify(cleanList(d.antonyms)),
      collocations: JSON.stringify(cleanList(d.collocations)),
      cefr: (d.cefr ?? '').trim().toUpperCase().slice(0, 2),
      notes: (d.notes ?? '').trim(),
      register: ['formal', 'informal', 'neutral'].includes(d.register ?? '') ? d.register! : '',
      template: (d.template ?? '').trim(),
      usage: (d.usage ?? '').trim()
    }
  }

  addItem(d: ItemDraft, now = Date.now()): Item {
    const v = this.fieldValues(d)
    if (!v.term) throw new Error('Kelime/kalıp boş olamaz.')
    if (JSON.parse(v.meanings).length === 0) throw new Error('Türkçe anlam zorunludur.')
    const maxPos = (this.db.prepare('SELECT COALESCE(MAX(position), 0) AS p FROM items').get() as { p: number }).p
    const status: ItemStatus = d.status ?? 'pool'
    const srs = status === 'learning' ? newSrs(now) : null
    const info = this.db
      .prepare(
        `INSERT INTO items (kind, term, term_norm, ipa, pos, meanings, examples, synonyms, antonyms, collocations, cefr, notes,
          register, template, usage, status, paused, position, created_at, updated_at, srs, due)
         VALUES (@kind, @term, @term_norm, @ipa, @pos, @meanings, @examples, @synonyms, @antonyms, @collocations, @cefr, @notes,
          @register, @template, @usage, @status, 0, @position, @now, @now, @srs, @due)`
      )
      .run({
        ...v,
        term_norm: normalizeTerm(v.term),
        status,
        position: maxPos + 1,
        now,
        srs: srs ? JSON.stringify(srs) : null,
        due: srs?.due ?? null
      })
    const id = Number(info.lastInsertRowid)
    for (const l of d.listIds ?? []) this.db.prepare('INSERT OR IGNORE INTO item_lists VALUES (?, ?)').run(id, l)
    for (const t of d.tags ?? []) {
      const tag = t.trim()
      if (tag) this.db.prepare('INSERT OR IGNORE INTO item_tags VALUES (?, ?)').run(id, tag)
    }
    this.bumpActivity(now, { added: 1, xp: XP.addItem })
    return this.getItem(id)!
  }

  addMany(drafts: ItemDraft[], now = Date.now()): Item[] {
    return this.db.transaction(() => drafts.map((d, i) => this.addItem(d, now + i)))()
  }

  updateItem(id: number, d: Partial<ItemDraft>, now = Date.now()): Item {
    const cur = this.getItem(id)
    if (!cur) throw new Error('Kart bulunamadı.')
    const v = this.fieldValues({ ...cur, ...d })
    if (!v.term) throw new Error('Kelime/kalıp boş olamaz.')
    if (JSON.parse(v.meanings).length === 0) throw new Error('Türkçe anlam zorunludur.')
    this.db
      .prepare(
        `UPDATE items SET kind=@kind, term=@term, term_norm=@term_norm, ipa=@ipa, pos=@pos, meanings=@meanings, examples=@examples,
          synonyms=@synonyms, antonyms=@antonyms, collocations=@collocations, cefr=@cefr, notes=@notes, register=@register,
          template=@template, usage=@usage, updated_at=@now WHERE id=@id`
      )
      .run({ ...v, term_norm: normalizeTerm(v.term), now, id })
    if (d.listIds) {
      this.db.prepare('DELETE FROM item_lists WHERE item_id = ?').run(id)
      for (const l of d.listIds) this.db.prepare('INSERT OR IGNORE INTO item_lists VALUES (?, ?)').run(id, l)
    }
    if (d.tags) {
      this.db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(id)
      for (const t of d.tags) if (t.trim()) this.db.prepare('INSERT OR IGNORE INTO item_tags VALUES (?, ?)').run(id, t.trim())
    }
    if (d.status && d.status !== cur.status) this.setStatus([id], d.status, now)
    return this.getItem(id)!
  }

  deleteItems(ids: number[]): void {
    const st = this.db.prepare('DELETE FROM items WHERE id = ?')
    this.db.transaction(() => ids.forEach((id) => st.run(id)))()
  }

  /** Havuzda → Öğreniyorum → Öğrendim. Öğrenmeye alınınca FSRS kartı oluşturulur. */
  setStatus(ids: number[], status: ItemStatus, now = Date.now()): void {
    const tx = this.db.transaction(() => {
      for (const it of this.getItems(ids)) {
        if (it.status === status) continue
        let srs: SrsState | null = it.srs
        if (status === 'learning' && (!srs || it.status === 'pool')) srs = newSrs(now)
        if (status === 'pool') srs = null
        this.db
          .prepare('UPDATE items SET status = ?, srs = ?, due = ?, paused = 0, updated_at = ? WHERE id = ?')
          .run(status, srs ? JSON.stringify(srs) : null, status === 'learning' ? (srs?.due ?? now) : null, now, it.id)
        if (status === 'learned') this.bumpActivity(now, { learned: 1 })
      }
    })
    tx()
  }

  setPaused(ids: number[], paused: boolean, now = Date.now()): void {
    const st = this.db.prepare('UPDATE items SET paused = ?, updated_at = ? WHERE id = ?')
    this.db.transaction(() => ids.forEach((id) => st.run(paused ? 1 : 0, now, id)))()
  }

  /** İlerlemeyi sıfırla: yeni bir FSRS kartıyla "Öğreniyorum"a döner */
  resetProgress(ids: number[], now = Date.now()): void {
    const srs = newSrs(now)
    const st = this.db.prepare("UPDATE items SET status = 'learning', srs = ?, due = ?, paused = 0, updated_at = ? WHERE id = ?")
    this.db.transaction(() => ids.forEach((id) => st.run(JSON.stringify(srs), srs.due, now, id)))()
  }

  /** Sürükle-bırak sırası */
  reorder(orderedIds: number[]): void {
    const st = this.db.prepare('UPDATE items SET position = ? WHERE id = ?')
    this.db.transaction(() => orderedIds.forEach((id, i) => st.run(i + 1, id)))()
  }

  // ---------- listeler ve etiketler ----------
  private ensureHardList(): void {
    this.db.prepare('INSERT OR IGNORE INTO lists (name, system, created_at) VALUES (?, 1, ?)').run(HARD_LIST, Date.now())
  }

  hardListId(): number {
    return (this.db.prepare('SELECT id FROM lists WHERE name = ? AND system = 1').get(HARD_LIST) as { id: number }).id
  }

  getLists(): WordList[] {
    return (
      this.db
        .prepare(
          `SELECT l.id, l.name, l.system, (SELECT COUNT(*) FROM item_lists il WHERE il.list_id = l.id) AS count
           FROM lists l ORDER BY l.system DESC, l.name COLLATE NOCASE`
        )
        .all() as { id: number; name: string; system: number; count: number }[]
    ).map((l) => ({ ...l, system: !!l.system }))
  }

  createList(name: string): WordList {
    const n = name.trim()
    if (!n) throw new Error('Liste adı boş olamaz.')
    const ex = this.db.prepare('SELECT id FROM lists WHERE name = ?').get(n) as { id: number } | undefined
    const id = ex ? ex.id : Number(this.db.prepare('INSERT INTO lists (name, system, created_at) VALUES (?, 0, ?)').run(n, Date.now()).lastInsertRowid)
    return this.getLists().find((l) => l.id === id)!
  }

  renameList(id: number, name: string): void {
    this.db.prepare('UPDATE lists SET name = ? WHERE id = ? AND system = 0').run(name.trim(), id)
  }

  deleteList(id: number): void {
    this.db.prepare('DELETE FROM lists WHERE id = ? AND system = 0').run(id)
  }

  addToList(ids: number[], listId: number): void {
    const st = this.db.prepare('INSERT OR IGNORE INTO item_lists VALUES (?, ?)')
    this.db.transaction(() => ids.forEach((id) => st.run(id, listId)))()
  }

  removeFromList(ids: number[], listId: number): void {
    const st = this.db.prepare('DELETE FROM item_lists WHERE item_id = ? AND list_id = ?')
    this.db.transaction(() => ids.forEach((id) => st.run(id, listId)))()
  }

  allTags(): { tag: string; count: number }[] {
    return this.db.prepare('SELECT tag, COUNT(*) AS count FROM item_tags GROUP BY tag ORDER BY tag COLLATE NOCASE').all() as {
      tag: string
      count: number
    }[]
  }

  addTag(ids: number[], tag: string): void {
    const t = tag.trim()
    if (!t) return
    const st = this.db.prepare('INSERT OR IGNORE INTO item_tags VALUES (?, ?)')
    this.db.transaction(() => ids.forEach((id) => st.run(id, t)))()
  }

  removeTag(ids: number[], tag: string): void {
    const st = this.db.prepare('DELETE FROM item_tags WHERE item_id = ? AND tag = ?')
    this.db.transaction(() => ids.forEach((id) => st.run(id, tag)))()
  }

  // ---------- çalışma ----------
  /** Tekrarı gelmiş "Öğreniyorum" kartları (duraklatılmamış), en eskisi önce */
  studyQueue(opts: { listId?: number; tag?: string; kind?: 'word' | 'pattern'; limit?: number; ahead?: boolean } = {}, now = Date.now()): Item[] {
    const base = this.listItems({ status: 'learning', listId: opts.listId, tag: opts.tag, kind: opts.kind, sort: 'due' }, now).filter(
      (i) => !i.paused
    )
    const due = opts.ahead ? base : base.filter((i) => (i.srs?.due ?? 0) <= now)
    return due.slice(0, opts.limit ?? 50)
  }

  dueCount(now = Date.now()): number {
    return (
      this.db.prepare("SELECT COUNT(*) AS c FROM items WHERE status = 'learning' AND paused = 0 AND due <= ?").get(now) as { c: number }
    ).c
  }

  learningCount(): number {
    return (this.db.prepare("SELECT COUNT(*) AS c FROM items WHERE status = 'learning' AND paused = 0").get() as { c: number }).c
  }

  review(id: number, rating: Rating, mode: string, now = Date.now()): ReviewResult {
    const item = this.getItem(id)
    if (!item) throw new Error('Kart bulunamadı.')
    const settings = this.getSettings()
    const before = this.activityFor(dayKey(now))
    const xpBefore = this.kvGet('xp', 0)
    const tx = this.db.transaction(() => {
      if (item.status === 'learning') {
        const { srs, graduated } = reviewSrs(item.srs ?? newSrs(now), rating, now)
        this.db
          .prepare('UPDATE items SET srs = ?, due = ?, status = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(srs), srs.due, graduated ? 'learned' : 'learning', now, id)
        if (graduated) {
          this.bumpActivity(now, { learned: 1 })
          this.removeFromList([id], this.hardListId())
        }
      }
      if (rating === 1) this.addToList([id], this.hardListId())
      this.db.prepare('INSERT INTO reviews (item_id, ts, mode, rating) VALUES (?, ?, ?, ?)').run(id, now, mode, rating)
      let gained = xpForRating(rating)
      const goalReached = before.reviews + 1 === settings.dailyGoal
      if (goalReached) gained += XP.goalBonus
      this.bumpActivity(now, { reviews: 1, correct: rating > 1 ? 1 : 0, xp: gained })
      return { gained, goalReached }
    })
    const { gained, goalReached } = tx()
    const xpAfter = this.kvGet('xp', 0)
    const levelUp = levelFromXp(xpAfter).level > levelFromXp(xpBefore).level
    const streak = this.streak(now)
    return {
      item: this.getItem(id)!,
      xpGained: gained,
      levelUp,
      newBadges: this.checkBadges(now),
      goalReached,
      streak,
      streakExtended: before.reviews === 0
    }
  }

  /** Havuzdan sırayla (eklenme veya kullanıcı sırası) N kart al — asla rastgele değil */
  dailyIntake(count: number, order: 'added' | 'manual', now = Date.now()): number[] {
    const sql =
      order === 'manual'
        ? "SELECT id FROM items WHERE status = 'pool' AND paused = 0 ORDER BY position ASC, id ASC LIMIT ?"
        : "SELECT id FROM items WHERE status = 'pool' AND paused = 0 ORDER BY created_at ASC, id ASC LIMIT ?"
    const ids = (this.db.prepare(sql).all(Math.max(0, count)) as { id: number }[]).map((r) => r.id)
    this.setStatus(ids, 'learning', now)
    return ids
  }

  /** Mini tekrar bildirimi için: SADECE "Öğreniyorum" listesinden, en uzun süredir gösterilmeyen */
  pickMiniItem(now = Date.now()): Item | null {
    const r = this.db
      .prepare(
        "SELECT * FROM items WHERE status = 'learning' AND paused = 0 ORDER BY last_notified ASC, due ASC, id ASC LIMIT 1"
      )
      .get() as Row | undefined
    if (!r) return null
    this.db.prepare('UPDATE items SET last_notified = ? WHERE id = ?').run(now, r.id)
    return this.hydrate([r])[0]
  }

  // ---------- aktivite / oyunlaştırma ----------
  private activityFor(day: string): { reviews: number; correct: number; xp: number; added: number; learned: number } {
    return (
      (this.db.prepare('SELECT reviews, correct, xp, added, learned FROM activity WHERE day = ?').get(day) as
        | { reviews: number; correct: number; xp: number; added: number; learned: number }
        | undefined) ?? { reviews: 0, correct: 0, xp: 0, added: 0, learned: 0 }
    )
  }

  private bumpActivity(now: number, d: Partial<{ reviews: number; correct: number; xp: number; added: number; learned: number }>): void {
    this.db
      .prepare(
        `INSERT INTO activity (day, reviews, correct, xp, added, learned) VALUES (@day, @reviews, @correct, @xp, @added, @learned)
         ON CONFLICT(day) DO UPDATE SET reviews = reviews + @reviews, correct = correct + @correct, xp = xp + @xp,
           added = added + @added, learned = learned + @learned`
      )
      .run({ day: dayKey(now), reviews: 0, correct: 0, xp: 0, added: 0, learned: 0, ...d })
    if (d.xp) this.kvSet('xp', this.kvGet('xp', 0) + d.xp)
  }

  studiedDays(): Set<string> {
    return new Set((this.db.prepare('SELECT day FROM activity WHERE reviews > 0').all() as { day: string }[]).map((r) => r.day))
  }

  streak(now = Date.now()): number {
    return computeStreak(this.studiedDays(), now)
  }

  studiedToday(now = Date.now()): boolean {
    return this.activityFor(dayKey(now)).reviews > 0
  }

  recordEvent(kind: 'conversation' | 'focus' | 'perfect', now = Date.now()): string[] {
    const key = { conversation: 'conversations', focus: 'focusSessions', perfect: 'perfectSessions' }[kind]
    this.kvSet(key, this.kvGet(key, 0) + 1)
    if (kind === 'focus') this.bumpActivity(now, { xp: 15 })
    return this.checkBadges(now)
  }

  private badgeContext(now: number): BadgeContext {
    const c = this.counts()
    return {
      totalItems: c.total,
      patterns: c.patterns,
      learned: c.learned,
      streak: this.streak(now),
      totalReviews: (this.db.prepare('SELECT COUNT(*) AS c FROM reviews').get() as { c: number }).c,
      conversations: this.kvGet('conversations', 0),
      focusSessions: this.kvGet('focusSessions', 0),
      perfectSession: this.kvGet('perfectSessions', 0) > 0
    }
  }

  checkBadges(now = Date.now()): string[] {
    const owned = new Set((this.db.prepare('SELECT id FROM badges').all() as { id: string }[]).map((r) => r.id))
    const earned = newlyEarned(this.badgeContext(now), owned)
    const st = this.db.prepare('INSERT OR IGNORE INTO badges (id, earned_at) VALUES (?, ?)')
    for (const b of earned) st.run(b, now)
    return earned
  }

  counts(): Stats['counts'] {
    const r = this.db
      .prepare(
        `SELECT
          SUM(status = 'pool') AS pool, SUM(status = 'learning') AS learning, SUM(status = 'learned') AS learned,
          SUM(paused = 1) AS paused, COUNT(*) AS total, SUM(kind = 'pattern') AS patterns FROM items`
      )
      .get() as Record<string, number | null>
    return {
      pool: r.pool ?? 0,
      learning: r.learning ?? 0,
      learned: r.learned ?? 0,
      paused: r.paused ?? 0,
      total: r.total ?? 0,
      patterns: r.patterns ?? 0
    }
  }

  stats(now = Date.now()): Stats {
    const counts = this.counts()
    const xp = this.kvGet('xp', 0)
    const lv = levelFromXp(xp)
    const today = this.activityFor(dayKey(now))
    const totals = this.db.prepare('SELECT COALESCE(SUM(reviews),0) AS r, COALESCE(SUM(correct),0) AS c FROM activity').get() as {
      r: number
      c: number
    }
    const since30 = dayKey(addDays(now, -29))
    const t30 = this.db
      .prepare('SELECT COALESCE(SUM(reviews),0) AS r, COALESCE(SUM(correct),0) AS c FROM activity WHERE day >= ?')
      .get(since30) as { r: number; c: number }
    const actMap = new Map(
      (this.db.prepare('SELECT day, reviews FROM activity WHERE day >= ?').all(since30) as { day: string; reviews: number }[]).map((r) => [
        r.day,
        r.reviews
      ])
    )
    const heatmap = Array.from({ length: 30 }, (_, i) => {
      const day = dayKey(addDays(now, i - 29))
      return { day, count: actMap.get(day) ?? 0 }
    })
    const dueRows = this.db
      .prepare("SELECT due FROM items WHERE status = 'learning' AND paused = 0 AND due IS NOT NULL AND due < ?")
      .all(startOfDay(now) + 7 * DAY) as { due: number }[]
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const start = startOfDay(addDays(now, i))
      const end = startOfDay(addDays(now, i + 1))
      return {
        day: dayKey(start),
        count: dueRows.filter((r) => (i === 0 ? r.due < end : r.due >= start && r.due < end)).length
      }
    })
    const lists = this.db
      .prepare(
        `SELECT l.id, l.name, COUNT(i.id) AS total, COALESCE(SUM(i.status='learning'),0) AS learning, COALESCE(SUM(i.status='learned'),0) AS learned
         FROM lists l LEFT JOIN item_lists il ON il.list_id = l.id LEFT JOIN items i ON i.id = il.item_id
         GROUP BY l.id ORDER BY l.system DESC, l.name COLLATE NOCASE`
      )
      .all() as Stats['lists']
    const days = this.studiedDays()
    const settings = this.getSettings()
    return {
      counts,
      dueNow: this.dueCount(now),
      newToday: today.added,
      reviewsToday: today.reviews,
      xp,
      level: lv.level,
      levelProgress: lv.progress,
      levelNext: lv.next,
      streak: computeStreak(days, now),
      bestStreak: bestStreak(days),
      accuracy: totals.r ? totals.c / totals.r : 0,
      accuracy30: t30.r ? t30.c / t30.r : 0,
      heatmap,
      forecast,
      lists,
      badges: (this.db.prepare('SELECT id, earned_at AS earnedAt FROM badges ORDER BY earned_at').all() as Stats['badges']) ?? [],
      goalDoneToday: today.reviews >= settings.dailyGoal
    }
  }

  /** Bugün çalışılacak: tekrarı gelenler + henüz hiç çalışılmamış "Öğreniyorum" kartları */
  todayTask(now = Date.now()): { due: number; fresh: number; reviewsToday: number; goal: number } {
    const fresh = this.db
      .prepare("SELECT COUNT(*) AS c FROM items WHERE status = 'learning' AND paused = 0 AND due <= ? AND json_extract(srs, '$.reps') = 0")
      .get(now) as { c: number }
    const due = this.dueCount(now)
    return { due: due - fresh.c, fresh: fresh.c, reviewsToday: this.activityFor(dayKey(now)).reviews, goal: this.getSettings().dailyGoal }
  }

  weeklySummary(now = Date.now()): { reviews: number; correct: number; added: number; learned: number; days: number } {
    const since = dayKey(addDays(now, -6))
    return this.db
      .prepare(
        `SELECT COALESCE(SUM(reviews),0) AS reviews, COALESCE(SUM(correct),0) AS correct, COALESCE(SUM(added),0) AS added,
          COALESCE(SUM(learned),0) AS learned, COALESCE(SUM(reviews > 0),0) AS days FROM activity WHERE day >= ?`
      )
      .get(since) as { reviews: number; correct: number; added: number; learned: number; days: number }
  }

  // ---------- yedekleme ----------
  exportJson(): string {
    const tables = ['items', 'lists', 'item_lists', 'item_tags', 'reviews', 'activity', 'badges', 'kv']
    const data: Record<string, unknown[]> = {}
    for (const t of tables) data[t] = this.db.prepare(`SELECT * FROM ${t}`).all()
    // Şifreli API anahtarı yedeğe girmez
    data.kv = (data.kv as { key: string }[]).filter((r) => r.key !== 'apiKeyEnc')
    return JSON.stringify({ app: 'kelime-defterim', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)
  }

  /** Yedekten geri yükle: mevcut verilerin YERİNE geçer */
  importJson(json: string): { items: number } {
    const parsed = JSON.parse(json) as { app?: string; data?: Record<string, Record<string, unknown>[]> }
    if (parsed.app !== 'kelime-defterim' || !parsed.data) throw new Error('Bu dosya bir Kelime Defterim yedeği değil.')
    const order = ['items', 'lists', 'item_lists', 'item_tags', 'reviews', 'activity', 'badges', 'kv']
    const keepKey = this.kvGet<string>('apiKeyEnc', '')
    this.db.transaction(() => {
      for (const t of [...order].reverse()) this.db.prepare(`DELETE FROM ${t}`).run()
      for (const t of order) {
        const rows = parsed.data![t] ?? []
        for (const r of rows) {
          const cols = Object.keys(r)
          if (!cols.length || cols.some((c) => !/^[a-z_]+$/.test(c))) continue
          this.db.prepare(`INSERT OR REPLACE INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(
            ...cols.map((c) => r[c] as never)
          )
        }
      }
      this.ensureHardList()
      if (keepKey) this.kvSet('apiKeyEnc', keepKey)
    })()
    return { items: this.counts().total }
  }
}
