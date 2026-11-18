// Konu tekrarı: konular ve tur (alıştırma) üretimi
import { shuffle, type Rng } from '../quiz'
import { TOPICS_1 } from './topics1'
import { TOPICS_2 } from './topics2'
import { TOPICS_3 } from './topics3'
import type { GQuestion, GrammarTopic } from './types'

export * from './types'

/** Kullanıcının istediği sırayla yerleşik konular */
export const BUILTIN_TOPICS: GrammarTopic[] = [...TOPICS_1, ...TOPICS_2, ...TOPICS_3]

export type ChoiceQ = Extract<GQuestion, { type: 'choice' }>
export type GapQ = Extract<GQuestion, { type: 'gap' }>
export type OrderQ = Extract<GQuestion, { type: 'order' }>
export type TfQ = Extract<GQuestion, { type: 'tf' }>

export function ofType<K extends GQuestion['type']>(qs: GQuestion[], type: K): Extract<GQuestion, { type: K }>[] {
  return qs.filter((q) => q.type === type) as Extract<GQuestion, { type: K }>[]
}

/** Test turu: çoktan seçmeli + doğru/yanlış karışık */
export function testRound(t: GrammarTopic, n = 10, rng: Rng = Math.random): (ChoiceQ | TfQ)[] {
  const pool = [...ofType(t.questions, 'choice'), ...ofType(t.questions, 'tf')]
  return shuffle(pool, rng).slice(0, n)
}

/** Hız turu: doğru/yanlış soruları + çoktan seçmelilerden türetilmiş doğru/yanlış cümleler */
export function speedPool(t: GrammarTopic, rng: Rng = Math.random): TfQ[] {
  const derived: TfQ[] = ofType(t.questions, 'choice')
    .filter((q) => q.prompt.split('___').length === 2 && !q.options.some((o) => o.includes('/')))
    .flatMap((q) => {
      const wrongIdx = q.options.findIndex((_, i) => i !== q.answer)
      const right = q.prompt.replace('___', q.options[q.answer])
      const wrong = q.prompt.replace('___', q.options[wrongIdx])
      return [
        { type: 'tf' as const, sentence: right, correct: true },
        { type: 'tf' as const, sentence: wrong, correct: false, fix: right }
      ]
    })
  return shuffle([...ofType(t.questions, 'tf'), ...derived], rng)
}

export function sentenceWithAnswer(q: GapQ): string {
  return q.sentence.replace('___', q.answers[0])
}

/** Bir doğru/yanlış sorusunun cevabını değerlendirir */
export function tfCorrect(q: TfQ, said: boolean): boolean {
  return q.correct === said
}
