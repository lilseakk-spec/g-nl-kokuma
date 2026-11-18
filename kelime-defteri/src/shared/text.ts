// Metin yardımcıları: normalize, yazım toleransı, toplu ekleme ve CSV/Anki ayrıştırma.

export function normalizeTerm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?,;:]+$/g, '')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

export type AnswerVerdict = 'exact' | 'typo' | 'wrong'

/** Yazım hatası toleransı: uzunluğa göre 1–2 harf */
export function checkAnswer(input: string, expected: string): AnswerVerdict {
  const a = normalizeTerm(input)
  const b = normalizeTerm(expected)
  if (!a) return 'wrong'
  if (a === b) return 'exact'
  const tol = b.length <= 4 ? 0 : b.length <= 8 ? 1 : 2
  return levenshtein(a, b) <= tol ? 'typo' : 'wrong'
}

/** Birden çok Türkçe anlamdan herhangi birine uyuyorsa doğru */
export function checkAnyAnswer(input: string, expected: string[]): AnswerVerdict {
  let best: AnswerVerdict = 'wrong'
  for (const e of expected.flatMap(splitMeanings)) {
    const v = checkAnswer(input, e)
    if (v === 'exact') return 'exact'
    if (v === 'typo') best = 'typo'
  }
  return best
}

export function splitMeanings(s: string): string[] {
  return s
    .split(/[,;/]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

export interface DiffPart {
  ch: string
  ok: boolean
}

/** Hata gösterimi: beklenen kelimenin her harfi kullanıcı girdisiyle hizalı mı */
export function diffChars(input: string, expected: string): DiffPart[] {
  const a = input.trim().toLowerCase()
  const b = expected.trim()
  const bl = b.toLowerCase()
  // LCS tabanlı hizalama
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(bl.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = bl.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: DiffPart[] = []
  let i = 0
  let j = 0
  while (j < bl.length) {
    if (i < a.length && a[i] === bl[j]) {
      out.push({ ch: b[j], ok: true })
      i++
      j++
    } else if (i < a.length && dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      out.push({ ch: b[j], ok: false })
      j++
    }
  }
  return out
}

export interface ParsedLine {
  term: string
  meaning: string
  line: number
}

/**
 * Toplu ekleme satırları:
 *   resilient
 *   take for granted - hafife almak
 *   take for granted = hafife almak
 *   commute: işe gidip gelmek
 *   commute<TAB>işe gidip gelmek
 */
export function parseBulkLines(text: string): ParsedLine[] {
  const out: ParsedLine[] = []
  text.split(/\r?\n/).forEach((raw, idx) => {
    let line = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()
    if (!line || line.startsWith('#')) return
    let term = line
    let meaning = ''
    const m =
      /^(.+?)\t+(.+)$/.exec(line) ||
      /^(.+?)\s+[-–—=]\s+(.+)$/.exec(line) ||
      /^(.+?)\s*[:=]\s+(.+)$/.exec(line)
    if (m) {
      term = m[1].trim()
      meaning = m[2].trim()
    }
    line = term
    if (term) out.push({ term, meaning, line: idx + 1 })
  })
  return out
}

/** RFC 4180 uyumlu basit CSV ayrıştırıcı (virgül, noktalı virgül veya sekme) */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/).find((l) => l.trim() && !l.startsWith('#')) ?? ''
  const d =
    delimiter ??
    (firstLine.includes('\t') ? '\t' : (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (inQ) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else inQ = false
      } else field += c
    } else if (c === '"' && field === '') inQ = true
    else if (c === d) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x.trim()) && !(r[0] ?? '').startsWith('#'))
}

export function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\[sound:[^\]]*\]/g, '')
    .trim()
}

export interface ImportRow {
  term: string
  meaning: string
  example?: string
  exampleTr?: string
  tags?: string[]
}

/**
 * CSV veya Anki "Notes in Plain Text" dışa aktarımını satırlara çevirir.
 * Başlık satırı varsa (term/word/kelime, meaning/anlam...) sütunlar ondan bulunur.
 */
export function rowsToImport(rows: string[][]): ImportRow[] {
  if (!rows.length) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const find = (...names: string[]) => header.findIndex((h) => names.includes(h))
  let ti = find('term', 'word', 'english', 'kelime', 'front', 'ingilizce', 'en')
  let mi = find('meaning', 'meanings', 'turkish', 'anlam', 'back', 'türkçe', 'tr')
  const ei = find('example', 'örnek', 'sentence')
  const eti = find('example_tr', 'örnek_tr', 'translation', 'çeviri')
  const tgi = find('tags', 'etiketler', 'tag')
  let data = rows
  if (ti >= 0 && mi >= 0) data = rows.slice(1)
  else {
    ti = 0
    mi = 1
  }
  return data
    .map((r) => ({
      term: stripHtml(r[ti] ?? ''),
      meaning: stripHtml(r[mi] ?? ''),
      example: ei >= 0 ? stripHtml(r[ei] ?? '') : undefined,
      exampleTr: eti >= 0 ? stripHtml(r[eti] ?? '') : undefined,
      tags: tgi >= 0 ? (r[tgi] ?? '').split(/[\s,]+/).filter(Boolean) : undefined
    }))
    .filter((r) => r.term)
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Cümlede terimi bulur (çekimli hâller dahil: resilient → resiliently değil ama
 * take → takes/took değil; basit son ekler: s, es, ed, d, ing, 's).
 * Kalıplarda ___ ve "sb/sth" gibi yer tutucular atlanır.
 */
export function findTermInSentence(sentence: string, term: string): { start: number; end: number } | null {
  const clean = term.replace(/_{2,}/g, ' ').replace(/\b(sb|sth|someone|something)\b/gi, ' ').trim()
  const words = clean.split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const suffix = "(?:s|es|ed|d|ing|'s)?"
  const pattern = words.map((w) => escapeRe(w) + suffix).join('[\\s\\w\']{0,20}?\\s*')
  const re = new RegExp(`\\b${pattern}\\b`, 'i')
  const m = re.exec(sentence)
  if (m) return { start: m.index, end: m.index + m[0].length }
  // -e ile biten fiiller: make → making
  if (words.length === 1 && /e$/i.test(words[0])) {
    const re2 = new RegExp(`\\b${escapeRe(words[0].slice(0, -1))}ing\\b`, 'i')
    const m2 = re2.exec(sentence)
    if (m2) return { start: m2.index, end: m2.index + m2[0].length }
  }
  return null
}

export function tokenizeSentence(s: string): string[] {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}
