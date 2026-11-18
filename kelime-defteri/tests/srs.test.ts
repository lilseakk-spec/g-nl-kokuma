import { describe, it, expect } from 'vitest'
import { newSrs, reviewSrs, previewIntervals, LEARNED_AFTER_DAYS, formatInterval, gradeFromAnswer } from '@shared/srs'
import { DAY } from '@shared/schedule'

const T0 = new Date(2026, 10, 18, 9, 0).getTime()

describe('FSRS', () => {
  it('yeni kart hemen tekrara hazırdır', () => {
    const s = newSrs(T0)
    expect(s.reps).toBe(0)
    expect(s.due).toBeLessThanOrEqual(T0)
  })

  it('"Bilmiyorum" kısa, "Kolay" uzun aralık verir', () => {
    const s = newSrs(T0)
    const again = reviewSrs(s, 1, T0).srs
    const easy = reviewSrs(s, 4, T0).srs
    expect(again.due - T0).toBeLessThan(15 * 60_000)
    expect(easy.due - T0).toBeGreaterThan(DAY)
    expect(easy.due).toBeGreaterThan(again.due)
  })

  it('aralıklar puanla monoton artar', () => {
    let s = newSrs(T0)
    s = reviewSrs(s, 3, T0).srs
    const p = previewIntervals(s, s.due)
    expect(p[1]).toBeLessThan(p[2])
    expect(p[2]).toBeLessThanOrEqual(p[3])
    expect(p[3]).toBeLessThan(p[4])
  })

  it('art arda doğru cevaplarla kart sonunda "Öğrendim" olur', () => {
    let s = newSrs(T0)
    let now = T0
    let graduated = false
    for (let i = 0; i < 15 && !graduated; i++) {
      const r = reviewSrs(s, 3, now)
      s = r.srs
      graduated = r.graduated
      now = s.due
    }
    expect(graduated).toBe(true)
    expect(s.scheduledDays).toBeGreaterThanOrEqual(LEARNED_AFTER_DAYS)
  })

  it('unutulan kartın lapse sayısı artar', () => {
    let s = newSrs(T0)
    let now = T0
    for (let i = 0; i < 4; i++) {
      s = reviewSrs(s, 3, now).srs
      now = s.due
    }
    const lapsed = reviewSrs(s, 1, now).srs
    expect(lapsed.lapses).toBe(s.lapses + 1)
    expect(lapsed.due - now).toBeLessThan(DAY)
  })

  it('yardımcılar', () => {
    expect(formatInterval(5 * 60_000)).toBe('5 dk')
    expect(formatInterval(3 * DAY)).toBe('3 g')
    expect(gradeFromAnswer(false)).toBe(1)
    expect(gradeFromAnswer(true, true)).toBe(2)
    expect(gradeFromAnswer(true)).toBe(3)
  })
})
