// Uygulama genelinde paylaşılan tipler (main + renderer)

export type ItemKind = 'word' | 'pattern'
export type ItemStatus = 'pool' | 'learning' | 'learned'
export type Register = '' | 'formal' | 'informal' | 'neutral'
/** 1 = Bilmiyorum, 2 = Zor, 3 = İyi, 4 = Kolay */
export type Rating = 1 | 2 | 3 | 4

export interface Example {
  en: string
  tr: string
}

export interface SrsState {
  due: number
  stability: number
  difficulty: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  /** 0 New, 1 Learning, 2 Review, 3 Relearning */
  state: number
  lastReview: number | null
}

/** Kullanıcının girdiği içerik alanları */
export interface ItemFields {
  kind: ItemKind
  term: string
  ipa: string
  pos: string
  meanings: string[]
  examples: Example[]
  synonyms: string[]
  antonyms: string[]
  collocations: string[]
  cefr: string
  notes: string
  /** Kalıplar için: resmi / günlük */
  register: Register
  /** Kalıplar için boşluklu şablon: "I'm looking forward to ___" */
  template: string
  /** Kalıplar için kullanım durumu açıklaması */
  usage: string
}

export interface Item extends ItemFields {
  id: number
  status: ItemStatus
  paused: boolean
  position: number
  createdAt: number
  updatedAt: number
  srs: SrsState | null
  listIds: number[]
  tags: string[]
}

export interface ItemDraft extends ItemFields {
  listIds?: number[]
  tags?: string[]
  status?: ItemStatus
}

export interface WordList {
  id: number
  name: string
  system: boolean
  count: number
}

export interface ItemFilter {
  search?: string
  kind?: ItemKind
  status?: ItemStatus | 'paused' | 'due'
  listId?: number
  tag?: string
  sort?: 'added' | 'position' | 'alpha' | 'due'
}

export type ModelId = 'claude-haiku-5-5' | 'claude-sonnet-5-5'
export type AlarmMelody = 'sunrise' | 'chime' | 'classic' | 'gentle'

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  voice: { accent: 'en-US' | 'en-GB'; rate: number; voiceName: string }
  sound: { enabled: boolean; volume: number; alarmMelody: AlarmMelody }
  ai: { model: ModelId }
  autoStart: boolean
  dailyGoal: number
  /** Havuzdan her gün sırayla X yeni kelime al (varsayılan kapalı) */
  dailyIntake: { enabled: boolean; count: number; order: 'added' | 'manual' }
  notifications: NotificationSettings
  focusMinutes: number
}

export interface NotificationSettings {
  morning: { enabled: boolean; time: string }
  due: { enabled: boolean; time: string }
  mini: { enabled: boolean; intervalMin: 30 | 60 | 120 }
  streak: { enabled: boolean; time: string }
  weekly: { enabled: boolean; day: number; time: string }
  quiet: { enabled: boolean; start: string; end: string }
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  voice: { accent: 'en-US', rate: 0.95, voiceName: '' },
  sound: { enabled: true, volume: 0.6, alarmMelody: 'sunrise' },
  ai: { model: 'claude-haiku-5-5' },
  autoStart: true,
  dailyGoal: 20,
  dailyIntake: { enabled: false, count: 5, order: 'added' },
  notifications: {
    morning: { enabled: true, time: '08:30' },
    due: { enabled: true, time: '12:00' },
    mini: { enabled: true, intervalMin: 60 },
    streak: { enabled: true, time: '21:00' },
    weekly: { enabled: true, day: 0, time: '20:00' },
    quiet: { enabled: true, start: '23:00', end: '08:00' }
  },
  focusMinutes: 25
}

export interface Stats {
  counts: { pool: number; learning: number; learned: number; paused: number; total: number; patterns: number }
  dueNow: number
  newToday: number
  reviewsToday: number
  xp: number
  level: number
  levelProgress: number
  levelNext: number
  streak: number
  bestStreak: number
  accuracy: number
  accuracy30: number
  heatmap: { day: string; count: number }[]
  forecast: { day: string; count: number }[]
  lists: { id: number; name: string; total: number; learning: number; learned: number }[]
  badges: { id: string; earnedAt: number }[]
  goalDoneToday: boolean
}

export type StudyMode =
  | 'flashcard'
  | 'choice'
  | 'typing'
  | 'listening'
  | 'cloze'
  | 'order'
  | 'pattern'

export interface ReviewResult {
  item: Item
  xpGained: number
  levelUp: boolean
  newBadges: string[]
  goalReached: boolean
  streak: number
  streakExtended: boolean
}

export interface AiEnrichment {
  ipa: string
  pos: string
  meanings: string[]
  examples: Example[]
  synonyms: string[]
  antonyms: string[]
  collocations: string[]
  cefr: string
  kind: ItemKind
  register: Register
  template: string
  usage: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PatternFeedback {
  correct: boolean
  usedPattern: boolean
  corrected: string
  explanationTr: string
}

export interface ConversationSummary {
  summaryTr: string
  mistakes: { original: string; corrected: string; explanationTr: string }[]
  used: string[]
  unused: string[]
}

export interface AppInfo {
  platform: NodeJS.Platform
  version: string
  userData: string
  hasApiKey: boolean
  apiKeySource: 'settings' | 'env' | 'none'
  encryptionAvailable: boolean
}
