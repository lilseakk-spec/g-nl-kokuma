// Zamanlanmış görev mantığı — saf fonksiyonlar, birim testli.
import type { NotificationSettings, Settings } from './types'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
/** Sabah alarmı kaçırılırsa (uyku vb.) en fazla bu kadar geç çalınır */
export const MORNING_CATCHUP = 2 * HOUR
export const SNOOZE_MS = 10 * MINUTE

export function parseHM(s: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return { h: 0, m: 0 }
  return { h: Math.min(23, Number(m[1])), m: Math.min(59, Number(m[2])) }
}

/** Yerel saatle YYYY-MM-DD */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** ts gününde verilen saat (yerel) */
export function atTime(ts: number, hm: string): number {
  const { h, m } = parseHM(hm)
  const d = new Date(ts)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + n)
  return d.getTime()
}

/** Sessiz saatler gece yarısını aşabilir (23:00–08:00) */
export function inQuietHours(ts: number, quiet: NotificationSettings['quiet']): boolean {
  if (!quiet.enabled) return false
  const d = new Date(ts)
  const cur = d.getHours() * 60 + d.getMinutes()
  const s = parseHM(quiet.start)
  const e = parseHM(quiet.end)
  const start = s.h * 60 + s.m
  const end = e.h * 60 + e.m
  if (start === end) return false
  return start < end ? cur >= start && cur < end : cur >= start || cur < end
}

export interface SchedulerState {
  lastMorning?: number
  lastDue?: number
  lastMini?: number
  lastStreak?: number
  lastWeekly?: number
  snoozeUntil?: number | null
  lastIntakeDay?: string
}

export interface SchedulerContext {
  /** "Öğreniyorum" durumundaki (duraklatılmamış) kart sayısı */
  learningCount: number
  /** Şu an tekrarı gelmiş kart sayısı */
  dueCount: number
  studiedToday: boolean
  streak: number
}

export type SchedEvent = 'morning' | 'snooze' | 'due' | 'mini' | 'streak' | 'weekly' | 'intake'

export interface TickResult {
  events: SchedEvent[]
  state: SchedulerState
}

/**
 * Her tikte (30 sn) ve bilgisayar uykudan uyanınca çağrılır.
 * Kaçırılan görevler en fazla BİR kez tetiklenir; mini tekrarlar biriktirilmez.
 */
export function tick(
  now: number,
  settings: Pick<Settings, 'notifications' | 'dailyIntake'>,
  prev: SchedulerState,
  ctx: SchedulerContext
): TickResult {
  const n = settings.notifications
  const state: SchedulerState = { ...prev }
  const events: SchedEvent[] = []
  const quiet = inQuietHours(now, n.quiet)

  // Havuzdan günlük kelime alma (sessiz işlem; bildirim değil)
  const today = dayKey(now)
  if (settings.dailyIntake.enabled && state.lastIntakeDay !== today) {
    events.push('intake')
    state.lastIntakeDay = today
  }

  // Sabah alarmı — kullanıcı açıkça kurduğu için sessiz saatlerden muaf
  if (n.morning.enabled) {
    const t = atTime(now, n.morning.time)
    if (now >= t && (state.lastMorning ?? 0) < t) {
      if (now - t <= MORNING_CATCHUP) events.push('morning')
      state.lastMorning = now // pencere dışındaysa sessizce atla
    }
  }

  // Ertelenmiş alarm
  if (state.snoozeUntil && now >= state.snoozeUntil) {
    events.push('snooze')
    state.snoozeUntil = null
  }

  // Tekrar hatırlatması (günde bir, belirlenen saatten sonra, sessiz saat dışında)
  if (n.due.enabled && !quiet) {
    const t = atTime(now, n.due.time)
    if (now >= t && (state.lastDue ?? 0) < t) {
      if (ctx.dueCount > 0) events.push('due')
      state.lastDue = now
    }
  }

  // Gün içi mini tekrar
  if (n.mini.enabled) {
    const interval = n.mini.intervalMin * MINUTE
    if (state.lastMini === undefined) {
      state.lastMini = now // ilk çalıştırmada saymaya başla
    } else if (!quiet && ctx.learningCount > 0 && now - state.lastMini >= interval) {
      events.push('mini')
      state.lastMini = now
    }
  }

  // Akşam seri uyarısı
  if (n.streak.enabled && !quiet) {
    const t = atTime(now, n.streak.time)
    if (now >= t && (state.lastStreak ?? 0) < t) {
      if (!ctx.studiedToday && ctx.streak > 0) events.push('streak')
      state.lastStreak = now
    }
  }

  // Haftalık özet
  if (n.weekly.enabled && !quiet && new Date(now).getDay() === n.weekly.day) {
    const t = atTime(now, n.weekly.time)
    if (now >= t && (state.lastWeekly ?? 0) < t) {
      events.push('weekly')
      state.lastWeekly = now
    }
  }

  return { events, state }
}

/** Seri hesabı: çalışılan günlerden bugüne (veya düne) kadar kesintisiz gün sayısı */
export function computeStreak(studiedDays: Set<string>, now: number): number {
  let cursor = now
  if (!studiedDays.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (studiedDays.has(dayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function bestStreak(studiedDays: Set<string>): number {
  const days = [...studiedDays].sort()
  let best = 0
  let cur = 0
  let prev: number | null = null
  for (const d of days) {
    const [y, m, dd] = d.split('-').map(Number)
    const ts = new Date(y, m - 1, dd).getTime()
    if (prev !== null && dayKey(addDays(prev, 1)) === d) cur++
    else cur = 1
    best = Math.max(best, cur)
    prev = ts
  }
  return best
}
