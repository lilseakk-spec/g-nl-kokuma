// FSRS aralıklı tekrar (ts-fsrs). Sadece "Öğreniyorum" kartları için kullanılır.
import { FSRS, createEmptyCard, generatorParameters, type Card, type Grade } from 'ts-fsrs'
import type { Rating, SrsState } from './types'

/** Planlanan aralık bu kadar günü geçince kart "Öğrendim" olur */
export const LEARNED_AFTER_DAYS = 21

const scheduler = new FSRS(generatorParameters({ enable_fuzz: false, request_retention: 0.9 }))

function toCard(s: SrsState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined
  } as Card
}

function fromCard(c: Card): SrsState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as number,
    lastReview: c.last_review ? new Date(c.last_review).getTime() : null
  }
}

export function newSrs(now: number): SrsState {
  return fromCard(createEmptyCard(new Date(now)))
}

export function reviewSrs(s: SrsState, rating: Rating, now: number): { srs: SrsState; graduated: boolean } {
  const res = scheduler.next(toCard(s), new Date(now), rating as Grade)
  const srs = fromCard(res.card)
  return { srs, graduated: srs.scheduledDays >= LEARNED_AFTER_DAYS }
}

/** Butonların altında gösterilecek sonraki aralıklar (ms) */
export function previewIntervals(s: SrsState, now: number): Record<Rating, number> {
  const p = scheduler.repeat(toCard(s), new Date(now)) as unknown as Record<number, { card: Card }>
  const out = {} as Record<Rating, number>
  for (const r of [1, 2, 3, 4] as Rating[]) out[r] = p[r].card.due.getTime() - now
  return out
}

export function formatInterval(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${Math.max(1, min)} dk`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} sa`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} g`
  const mo = Math.round(d / 30)
  if (mo < 12) return `${mo} ay`
  return `${(d / 365).toFixed(1)} yıl`
}

/** Yazma/çoktan seçmeli gibi modlarda doğru/yanlışı puana çevirir */
export function gradeFromAnswer(correct: boolean, typo = false): Rating {
  if (!correct) return 1
  return typo ? 2 : 3
}
