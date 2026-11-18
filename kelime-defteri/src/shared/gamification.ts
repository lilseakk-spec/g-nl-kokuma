// XP, seviye ve rozetler

export const XP = {
  correct: 10,
  hard: 6,
  wrong: 2,
  addItem: 2,
  goalBonus: 25
}

export function xpForRating(rating: number): number {
  if (rating === 1) return XP.wrong
  if (rating === 2) return XP.hard
  return XP.correct
}

/** L seviyesine ulaşmak için gereken toplam XP: 50·L·(L−1) → 0, 100, 300, 600, 1000… */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1)
}

export function levelFromXp(xp: number): { level: number; progress: number; next: number } {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, progress: xp - base, next: next - base }
}

export interface BadgeContext {
  totalItems: number
  patterns: number
  learned: number
  streak: number
  totalReviews: number
  conversations: number
  focusSessions: number
  perfectSession: boolean
}

export interface BadgeDef {
  id: string
  name: string
  desc: string
  icon: string
  test: (c: BadgeContext) => boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first-word', name: 'İlk adım', desc: 'İlk kelimeni ekledin', icon: '🌱', test: (c) => c.totalItems >= 1 },
  { id: 'words-50', name: 'İlk 50 kelimem', desc: '50 kelime/kalıp ekledin', icon: '📚', test: (c) => c.totalItems >= 50 },
  { id: 'words-200', name: 'Kelime avcısı', desc: '200 kelime/kalıp ekledin', icon: '🏹', test: (c) => c.totalItems >= 200 },
  { id: 'patterns-10', name: 'Kalıp ustası', desc: '10 konuşma kalıbı ekledin', icon: '🧩', test: (c) => c.patterns >= 10 },
  { id: 'learned-10', name: 'İlk 10 öğrenildi', desc: '10 kartı "Öğrendim" yaptın', icon: '🎓', test: (c) => c.learned >= 10 },
  { id: 'learned-100', name: 'Yüzlük', desc: '100 kart öğrendin', icon: '💯', test: (c) => c.learned >= 100 },
  { id: 'streak-3', name: '3 gün üst üste', desc: '3 günlük seri', icon: '🔥', test: (c) => c.streak >= 3 },
  { id: 'streak-7', name: '7 günlük seri', desc: 'Bir hafta aralıksız çalıştın', icon: '⚡', test: (c) => c.streak >= 7 },
  { id: 'streak-30', name: '30 günlük seri', desc: 'Bir ay aralıksız!', icon: '🏆', test: (c) => c.streak >= 30 },
  { id: 'reviews-100', name: '100 tekrar', desc: '100 tekrar yaptın', icon: '🔁', test: (c) => c.totalReviews >= 100 },
  { id: 'reviews-1000', name: '1000 tekrar', desc: '1000 tekrar yaptın', icon: '🚀', test: (c) => c.totalReviews >= 1000 },
  { id: 'talker', name: 'Sohbet başladı', desc: 'İlk konuşma pratiğini tamamladın', icon: '💬', test: (c) => c.conversations >= 1 },
  { id: 'focus', name: 'Odaklan', desc: 'Bir odak oturumunu bitirdin', icon: '🎯', test: (c) => c.focusSessions >= 1 },
  { id: 'perfect', name: 'Kusursuz', desc: 'En az 10 kartlık oturumu hatasız bitirdin', icon: '✨', test: (c) => c.perfectSession }
]

export function newlyEarned(ctx: BadgeContext, owned: Set<string>): string[] {
  return BADGES.filter((b) => !owned.has(b.id) && b.test(ctx)).map((b) => b.id)
}
