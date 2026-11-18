import { describe, it, expect } from 'vitest'
import { tick, inQuietHours, computeStreak, bestStreak, dayKey, addDays, MINUTE, type SchedulerState } from '@shared/schedule'
import { DEFAULT_SETTINGS, type Settings } from '@shared/types'

const at = (h: number, m = 0, day = 18) => new Date(2026, 10, day, h, m).getTime() // 18 Kasım 2026 Çarşamba
const S = DEFAULT_SETTINGS
const ctx = { learningCount: 5, dueCount: 3, studiedToday: false, streak: 2 }

function run(times: number[], state: SchedulerState = {}, c = ctx, settings: Settings = S) {
  const all: string[] = []
  for (const t of times) {
    const r = tick(t, settings, state, c)
    state = r.state
    const d = new Date(t)
    all.push(...r.events.map((e) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} ${e}`))
  }
  return { all, state }
}

describe('sessiz saatler', () => {
  const q = S.notifications.quiet
  it('gece yarısını aşan aralık', () => {
    expect(inQuietHours(at(23, 30), q)).toBe(true)
    expect(inQuietHours(at(2), q)).toBe(true)
    expect(inQuietHours(at(7, 59), q)).toBe(true)
    expect(inQuietHours(at(8), q)).toBe(false)
    expect(inQuietHours(at(15), q)).toBe(false)
  })
  it('kapalıysa hiçbir saat sessiz değil', () => {
    expect(inQuietHours(at(2), { ...q, enabled: false })).toBe(false)
  })
})

describe('zamanlayıcı', () => {
  it('sabah alarmı günde bir kez çalar', () => {
    const { all } = run([at(8, 0), at(8, 30), at(8, 31), at(9, 0)], { lastMini: at(8) })
    expect(all.filter((e) => e.endsWith('morning'))).toEqual(['8:30 morning'])
  })

  it('uykudan uyanınca kaçırılan sabah alarmı 2 saat içinde bir kez çalar', () => {
    const { all } = run([at(7, 0), at(10, 15)], { lastMini: at(7) })
    expect(all).toContain('10:15 morning')
    const late = run([at(7, 0), at(11, 0)], { lastMini: at(7) })
    expect(late.all.some((e) => e.endsWith('morning'))).toBe(false)
  })

  it('erteleme 10 dk sonra tekrar çalar', () => {
    const { all } = run([at(8, 40), at(8, 41)], { lastMorning: at(8, 30), snoozeUntil: at(8, 40), lastMini: at(8, 40) })
    expect(all).toEqual(['8:40 snooze'])
  })

  it('tekrar hatırlatması sadece tekrarı gelen kart varsa', () => {
    expect(run([at(12, 0)], { lastMini: at(12) }).all).toContain('12:00 due')
    expect(run([at(12, 0)], { lastMini: at(12) }, { ...ctx, dueCount: 0 }).all).not.toContain('12:00 due')
  })

  it('mini tekrar aralıkla gelir, kelime yoksa gelmez, sessiz saatte gelmez', () => {
    const times = [at(9), at(9, 30), at(10), at(10, 30), at(11, 1)]
    const { all } = run(times)
    expect(all.filter((e) => e.endsWith('mini'))).toEqual(['10:00 mini', '11:01 mini'])
    expect(run(times, {}, { ...ctx, learningCount: 0 }).all.some((e) => e.endsWith('mini'))).toBe(false)
    const night = run([at(23, 0), at(23, 59), at(1, 30, 19)], { lastMini: at(22) })
    expect(night.all.some((e) => e.endsWith('mini'))).toBe(false)
  })

  it('uyku sonrası mini tekrarlar birikmez (tek bildirim)', () => {
    const { all } = run([at(9), at(15)], { lastMini: at(9) })
    expect(all.filter((e) => e.endsWith('mini'))).toHaveLength(1)
  })

  it('seri uyarısı sadece bugün çalışılmadıysa ve seri varsa', () => {
    expect(run([at(21)], { lastMini: at(21) }).all).toContain('21:00 streak')
    expect(run([at(21)], { lastMini: at(21) }, { ...ctx, studiedToday: true }).all).not.toContain('21:00 streak')
    expect(run([at(21)], { lastMini: at(21) }, { ...ctx, streak: 0 }).all).not.toContain('21:00 streak')
  })

  it('haftalık özet sadece seçilen günde', () => {
    const sunday = new Date(2026, 10, 22, 20, 0).getTime()
    expect(tick(sunday, S, { lastMini: sunday }, ctx).events).toContain('weekly')
    expect(tick(at(20), S, { lastMini: at(20) }, ctx).events).not.toContain('weekly')
  })

  it('sessiz saatlerde bildirim yok (sabah alarmı hariç)', () => {
    const settings: Settings = {
      ...S,
      notifications: { ...S.notifications, due: { enabled: true, time: '23:30' }, morning: { enabled: true, time: '07:00' } }
    }
    const r = run([at(23, 30), at(7, 0, 19)], { lastMini: at(23) }, ctx, settings)
    expect(r.all.some((e) => e.endsWith('due'))).toBe(false)
    expect(r.all).toContain('7:00 morning')
  })

  it('günlük havuz alımı varsayılan KAPALI, açıkken günde bir kez', () => {
    expect(run([at(9), at(10)]).all.some((e) => e.endsWith('intake'))).toBe(false)
    const on: Settings = { ...S, dailyIntake: { enabled: true, count: 3, order: 'added' } }
    const r = run([at(9), at(10), at(9, 0, 19)], {}, ctx, on)
    expect(r.all.filter((e) => e.endsWith('intake'))).toHaveLength(2)
  })

  it('ilk çalıştırmada mini tekrar hemen gelmez', () => {
    const r = tick(at(9), S, {}, ctx)
    expect(r.events).not.toContain('mini')
    expect(r.state.lastMini).toBe(at(9))
    expect(tick(at(9) + 61 * MINUTE, S, r.state, ctx).events).toContain('mini')
  })
})

describe('seri', () => {
  const now = at(15)
  it('bugün veya dünden geriye kesintisiz günler', () => {
    const days = new Set([dayKey(addDays(now, -1)), dayKey(addDays(now, -2)), dayKey(addDays(now, -4))])
    expect(computeStreak(days, now)).toBe(2)
    days.add(dayKey(now))
    expect(computeStreak(days, now)).toBe(3)
    expect(computeStreak(new Set([dayKey(addDays(now, -2))]), now)).toBe(0)
  })
  it('en iyi seri', () => {
    const days = new Set(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10', '2026-11-11'])
    expect(bestStreak(days)).toBe(3)
  })
})
