// Soru üretimi — YALNIZCA kullanıcının kendi kartları kullanılır.
// Yanlış şıklar da kullanıcının listesinden seçilir; dışarıdan kelime eklenmez.
import type { Item, StudyMode } from './types'
import { findTermInSentence, tokenizeSentence } from './text'

export type Rng = () => number

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const MODE_LABELS: Record<StudyMode, string> = {
  flashcard: 'Kart çevir',
  choice: 'Çoktan seçmeli',
  typing: 'Yazma',
  listening: 'Dinleme',
  cloze: 'Boşluk doldurma',
  order: 'Cümle kurma',
  pattern: 'Kalıp pratiği'
}

export function primaryMeaning(item: Item): string {
  return item.meanings[0] ?? ''
}

export function meaningText(item: Item): string {
  return item.meanings.join(', ')
}

export interface ClozeData {
  before: string
  answer: string
  after: string
  tr: string
}

export function clozeFor(item: Item): ClozeData | null {
  for (const ex of item.examples) {
    const pos = findTermInSentence(ex.en, item.term)
    if (pos)
      return {
        before: ex.en.slice(0, pos.start),
        answer: ex.en.slice(pos.start, pos.end),
        after: ex.en.slice(pos.end),
        tr: ex.tr
      }
  }
  return null
}

export function orderSentenceFor(item: Item): { sentence: string; tr: string } | null {
  const ex = item.examples.find((e) => {
    const n = tokenizeSentence(e.en).length
    return n >= 3 && n <= 16
  })
  return ex ? { sentence: ex.en.trim(), tr: ex.tr } : null
}

/** Bu kart için hangi modlar mümkün? (allItems: kullanıcının tüm kartları) */
export function modesFor(item: Item, allItems: Item[]): StudyMode[] {
  const modes: StudyMode[] = ['flashcard', 'typing', 'listening']
  const others = allItems.filter((i) => i.id !== item.id && i.meanings.length > 0)
  if (others.length >= 1 && item.meanings.length) modes.push('choice')
  if (clozeFor(item)) modes.push('cloze')
  if (orderSentenceFor(item)) modes.push('order')
  if (item.kind === 'pattern') modes.push('pattern')
  return modes
}

export interface ChoiceQuestion {
  direction: 'en-tr' | 'tr-en'
  prompt: string
  options: { itemId: number; text: string }[]
  answerId: number
}

/**
 * Çoktan seçmeli: 4 şık (kullanıcının kartı azsa daha az).
 * Mümkünse aynı türden (kelime/kalıp) şıklar tercih edilir.
 */
export function buildChoice(
  item: Item,
  allItems: Item[],
  direction: 'en-tr' | 'tr-en',
  rng: Rng = Math.random
): ChoiceQuestion {
  const label = (i: Item) => (direction === 'en-tr' ? meaningText(i) : i.term)
  const correctLabel = label(item).toLowerCase()
  const candidates = allItems.filter(
    (i) => i.id !== item.id && i.meanings.length > 0 && label(i).toLowerCase() !== correctLabel
  )
  const same = shuffle(
    candidates.filter((c) => c.kind === item.kind),
    rng
  )
  const diff = shuffle(
    candidates.filter((c) => c.kind !== item.kind),
    rng
  )
  const seen = new Set<string>([correctLabel])
  const distractors: Item[] = []
  for (const c of [...same, ...diff]) {
    const l = label(c).toLowerCase()
    if (seen.has(l)) continue
    seen.add(l)
    distractors.push(c)
    if (distractors.length === 3) break
  }
  const options = shuffle([item, ...distractors], rng).map((i) => ({ itemId: i.id, text: label(i) }))
  return {
    direction,
    prompt: direction === 'en-tr' ? item.term : meaningText(item),
    options,
    answerId: item.id
  }
}

export function pickMode(available: StudyMode[], preferred: StudyMode | 'mixed', rng: Rng = Math.random): StudyMode {
  if (preferred !== 'mixed') return available.includes(preferred) ? preferred : 'flashcard'
  const pool = available.filter((m) => m !== 'pattern' || available.length === 1)
  return pool[Math.floor(rng() * pool.length)] ?? 'flashcard'
}
