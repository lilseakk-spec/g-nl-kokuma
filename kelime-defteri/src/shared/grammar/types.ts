// Konu tekrarı (dilbilgisi) veri modeli

export type GQuestion =
  | { type: 'choice'; prompt: string; options: string[]; answer: number; explain?: string }
  | { type: 'gap'; sentence: string; answers: string[]; hint?: string; tr?: string; explain?: string }
  | { type: 'order'; sentence: string; tr: string }
  | { type: 'tf'; sentence: string; correct: boolean; fix?: string; explain?: string }

export interface GSection {
  heading: string
  /** Satırlar. "• " ile başlayanlar madde işaretidir; **kalın** desteklenir. */
  body: string[]
  examples?: { en: string; tr: string }[]
}

export interface GrammarTopic {
  id: string
  title: string
  subtitle: string
  level: string
  emoji: string
  summary: string
  /** Kısa formül kutuları, ör. "I / You / We / They + fiil" */
  formula: string[]
  sections: GSection[]
  tips: string[]
  questions: GQuestion[]
  /** Eşleştirme oyunu çiftleri */
  pairs: { left: string; right: string }[]
  /** Ödev: yazma görevleri (Türkçe yönerge + örnek cevap) */
  homework: { task: string; sample: string }[]
  custom?: boolean
}

export type GActivity = 'test' | 'gap' | 'order' | 'match' | 'speed' | 'homework'

export const ACTIVITY_LABELS: Record<GActivity, string> = {
  test: 'Test',
  gap: 'Boşluk doldurma',
  order: 'Cümle kurma',
  match: 'Eşleştirme oyunu',
  speed: 'Hız turu (60 sn)',
  homework: 'Ödev'
}

export interface GrammarProgress {
  topicId: string
  activity: GActivity
  best: number // yüzde
  attempts: number
  lastAt: number
}

// ---- içerik yazımı için kısa yardımcılar ----
export const C = (prompt: string, options: string[], answer: number, explain?: string): GQuestion => ({
  type: 'choice',
  prompt,
  options,
  answer,
  explain
})
export const G = (sentence: string, answers: string | string[], hint?: string, explain?: string): GQuestion => ({
  type: 'gap',
  sentence,
  answers: Array.isArray(answers) ? answers : [answers],
  hint,
  explain
})
export const O = (sentence: string, tr: string): GQuestion => ({ type: 'order', sentence, tr })
export const T = (sentence: string, correct: boolean, fix?: string, explain?: string): GQuestion => ({
  type: 'tf',
  sentence,
  correct,
  fix,
  explain
})
export const P = (left: string, right: string) => ({ left, right })
export const X = (en: string, tr: string) => ({ en, tr })
