// Telaffuz: işletim sisteminin İngilizce sesleri.
// 1) Web Speech API (speechSynthesis) İngilizce ses görüyorsa onu kullan.
// 2) Görmüyorsa (ör. Windows'ta sadece Türkçe OneCore sesi varsa) ana süreçteki yerel motoru kullan:
//    Windows SAPI (Microsoft Zira/David…), macOS `say`, Linux `espeak-ng`.
// İngilizce metin ASLA İngilizce olmayan bir sesle okunmaz.
import { api } from './api'

let cfg = { accent: 'en-US' as 'en-US' | 'en-GB', rate: 0.95, voiceName: '' }
let nativeList: { name: string; lang: string }[] | null = null
let nativeLoading: Promise<void> | null = null

export interface VoiceOption {
  name: string
  lang: string
  engine: 'web' | 'native'
}

export function configureVoice(v: typeof cfg): void {
  cfg = v
}

function webEnglish(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return []
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
}

function loadNative(): Promise<void> {
  if (!nativeLoading)
    nativeLoading = api
      .nativeVoices()
      .then((v) => {
        nativeList = v
      })
      .catch(() => {
        nativeList = []
      })
  return nativeLoading
}

export function englishVoices(): VoiceOption[] {
  return [
    ...webEnglish().map((v) => ({ name: v.name, lang: v.lang, engine: 'web' as const })),
    ...(nativeList ?? []).map((v) => ({ name: v.name, lang: v.lang, engine: 'native' as const }))
  ]
}

export function onVoicesReady(cb: () => void): () => void {
  const h = () => cb()
  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', h)
  void loadNative().then(cb)
  cb()
  return () => {
    if ('speechSynthesis' in window) speechSynthesis.removeEventListener('voiceschanged', h)
  }
}

function pickWebVoice(): SpeechSynthesisVoice | undefined {
  const voices = webEnglish()
  if (cfg.voiceName) {
    const v = voices.find((x) => x.name === cfg.voiceName)
    if (v) return v
    if (nativeList?.some((x) => x.name === cfg.voiceName)) return undefined // kullanıcı yerel sesi seçmiş
  }
  const want = cfg.accent.toLowerCase()
  const norm = (l: string) => l.toLowerCase().replace('_', '-')
  return (
    voices.find((v) => norm(v.lang) === want && /natural|online|neural/i.test(v.name)) ??
    voices.find((v) => norm(v.lang) === want) ??
    voices[0]
  )
}

/** Web Speech sesleri asenkron yüklenir; ilk çağrıda kısa süre bekle */
function waitWebVoices(): Promise<void> {
  if (!('speechSynthesis' in window) || speechSynthesis.getVoices().length) return Promise.resolve()
  return new Promise((r) => {
    const done = () => r()
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 800)
  })
}

export async function speak(text: string, opts: { rate?: number } = {}): Promise<void> {
  const clean = text.replace(/_{2,}/g, ' blank ').trim()
  if (!clean) return
  const rate = opts.rate ?? cfg.rate
  await waitWebVoices()
  const v = pickWebVoice()
  if (v) {
    return new Promise((resolve) => {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(clean)
      u.voice = v
      u.lang = v.lang
      u.rate = rate
      u.onend = () => resolve()
      u.onerror = () => resolve()
      speechSynthesis.speak(u)
    })
  }
  // Yerel İngilizce ses
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  try {
    await api.nativeSpeak(clean, rate, cfg.accent, cfg.voiceName)
  } catch {
    /* ses yok */
  }
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  void api.nativeStop().catch(() => undefined)
}

export async function hasEnglishVoice(): Promise<boolean> {
  await loadNative()
  return englishVoices().length > 0
}
