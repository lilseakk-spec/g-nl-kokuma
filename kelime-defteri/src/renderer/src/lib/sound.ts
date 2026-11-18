// Tüm sesler Web Audio API ile programatik üretilir; ses dosyası yoktur.
import type { AlarmMelody } from '@shared/types'

let ctx: AudioContext | null = null
let enabled = true
let volume = 0.6

export function configureSound(opts: { enabled: boolean; volume: number }): void {
  enabled = opts.enabled
  volume = opts.volume
}

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface Note {
  f: number // Hz
  t: number // başlangıç (sn)
  d: number // süre (sn)
  type?: OscillatorType
  g?: number // kazanç
}

function play(notes: Note[], master = 1, force = false): number {
  if (!enabled && !force) return 0
  const c = ac()
  const out = c.createGain()
  out.gain.value = volume * master
  out.connect(c.destination)
  const now = c.currentTime + 0.02
  let end = 0
  for (const n of notes) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = n.type ?? 'sine'
    o.frequency.value = n.f
    const peak = n.g ?? 0.3
    g.gain.setValueAtTime(0.0001, now + n.t)
    g.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)
    o.connect(g).connect(out)
    o.start(now + n.t)
    o.stop(now + n.t + n.d + 0.05)
    end = Math.max(end, n.t + n.d)
  }
  return end
}

const N = (name: string): number => {
  const m = /^([A-G])(#?)(\d)$/.exec(name)!
  const idx = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1] as 'C'] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12
  return 440 * Math.pow(2, idx / 12)
}

export const sounds = {
  correct: () => play([{ f: N('E5'), t: 0, d: 0.12, type: 'triangle' }, { f: N('A5'), t: 0.08, d: 0.22, type: 'triangle' }]),
  wrong: () => play([{ f: N('D3'), t: 0, d: 0.18, type: 'square', g: 0.12 }, { f: N('C#3'), t: 0.12, d: 0.25, type: 'square', g: 0.1 }]),
  streak: () =>
    play(['C5', 'E5', 'G5', 'C6'].map((n, i) => ({ f: N(n), t: i * 0.07, d: 0.18, type: 'triangle' as OscillatorType, g: 0.25 }))),
  levelUp: () =>
    play(
      [
        ...['G4', 'C5', 'E5', 'G5'].map((n, i) => ({ f: N(n), t: i * 0.1, d: 0.2, type: 'square' as OscillatorType, g: 0.12 })),
        { f: N('C6'), t: 0.42, d: 0.6, type: 'triangle', g: 0.3 },
        { f: N('E6'), t: 0.42, d: 0.6, type: 'sine', g: 0.15 }
      ],
      0.9
    ),
  goal: () =>
    play(
      [
        { f: N('C5'), t: 0, d: 0.15, type: 'triangle' },
        { f: N('G5'), t: 0.12, d: 0.15, type: 'triangle' },
        { f: N('E5'), t: 0.24, d: 0.15, type: 'triangle' },
        { f: N('C6'), t: 0.36, d: 0.5, type: 'triangle' },
        { f: N('G4'), t: 0.36, d: 0.5, type: 'sine', g: 0.2 }
      ]
    ),
  click: () => play([{ f: 1200, t: 0, d: 0.03, type: 'square', g: 0.05 }])
}

const MELODIES: Record<AlarmMelody, { label: string; notes: Note[] }> = {
  sunrise: {
    label: 'Gün doğumu',
    notes: ['C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'G5', 'C6'].map((n, i) => ({ f: N(n), t: i * 0.18, d: 0.3, type: 'triangle' }))
  },
  chime: {
    label: 'Çan',
    notes: [
      { f: N('E6'), t: 0, d: 1.2, g: 0.25 },
      { f: N('B5'), t: 0.4, d: 1.2, g: 0.25 },
      { f: N('G#5'), t: 0.8, d: 1.4, g: 0.25 },
      { f: N('E5'), t: 1.2, d: 1.6, g: 0.25 }
    ]
  },
  classic: {
    label: 'Klasik alarm',
    notes: Array.from({ length: 8 }, (_, i) => ({ f: i % 2 ? 880 : 988, t: i * 0.12 + (i >= 4 ? 0.3 : 0), d: 0.1, type: 'square' as OscillatorType, g: 0.12 }))
  },
  gentle: {
    label: 'Yumuşak',
    notes: ['A4', 'C#5', 'E5', 'A5', 'E5', 'C#5'].map((n, i) => ({ f: N(n), t: i * 0.35, d: 0.6, type: 'sine', g: 0.3 }))
  }
}

export const MELODY_OPTIONS = Object.entries(MELODIES).map(([id, m]) => ({ id: id as AlarmMelody, label: m.label }))

export function playMelody(m: AlarmMelody, force = true): number {
  return play(MELODIES[m]?.notes ?? MELODIES.sunrise.notes, 1, force)
}

/** Alarm: durdurulana kadar melodiyi tekrar çalar (sesler kapalı olsa bile alarm çalar) */
export function loopAlarm(m: AlarmMelody): () => void {
  let stopped = false
  let timer: ReturnType<typeof setTimeout>
  const step = () => {
    if (stopped) return
    const dur = playMelody(m, true)
    timer = setTimeout(step, (dur + 1.2) * 1000)
  }
  step()
  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
