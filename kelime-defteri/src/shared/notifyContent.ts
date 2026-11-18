// Bildirim metinleri — yalnızca kullanıcının kartlarından ve sayılardan oluşur.
import type { Item } from './types'

export interface NotifyPayload {
  title: string
  body: string
  /** Tıklanınca açılacak ekran */
  route: string
  /** Bildirime bağlı kart (mini tekrar) */
  itemId?: number
  actions?: { id: string; label: string }[]
}

export function morningPayload(due: number, fresh: number): NotifyPayload {
  const parts = []
  if (due) parts.push(`${due} tekrar`)
  if (fresh) parts.push(`${fresh} yeni`)
  return {
    title: 'Günaydın! Çalışma zamanı ☀️',
    body: parts.length ? `Bugünkü görevin: ${parts.join(', ')}.` : 'Bugün tekrarın yok. Yeni kelimeni ekleyebilir veya çalışmaya başlatabilirsin.',
    route: '/study',
    actions: [
      { id: 'snooze', label: 'Ertele (10 dk)' },
      { id: 'start', label: 'Başla' }
    ]
  }
}

export function duePayload(count: number): NotifyPayload {
  return {
    title: 'Tekrar zamanı',
    body: `Kelimelerinden ${count} tanesinin tekrar zamanı geldi.`,
    route: '/study',
    actions: [{ id: 'start', label: 'Çalış' }]
  }
}

export function miniPayload(item: Item): NotifyPayload {
  return {
    title: item.kind === 'pattern' ? 'Mini tekrar · kalıp' : 'Mini tekrar',
    body: `${item.kind === 'pattern' && item.template ? item.template : item.term}${item.ipa ? '  ' + item.ipa : ''}\nAnlamını hatırlıyor musun?`,
    route: `/mini/${item.id}`,
    itemId: item.id,
    actions: [
      { id: 'reveal', label: 'Anlamını göster' },
      { id: 'listen', label: 'Dinle' }
    ]
  }
}

export function streakPayload(streak: number): NotifyPayload {
  return {
    title: 'Serin bozulmak üzere! 🔥',
    body: `${streak} günlük serini korumak için bugün birkaç kart çalış.`,
    route: '/study',
    actions: [{ id: 'start', label: 'Çalış' }]
  }
}

export function weeklyPayload(w: { reviews: number; correct: number; added: number; learned: number; days: number }): NotifyPayload {
  const acc = w.reviews ? Math.round((w.correct / w.reviews) * 100) : 0
  return {
    title: 'Haftalık ilerleme',
    body: `Bu hafta ${w.days} gün çalıştın: ${w.reviews} tekrar (%${acc} doğru), ${w.added} yeni kart, ${w.learned} öğrenildi.`,
    route: '/stats'
  }
}

export function focusDonePayload(minutes: number): NotifyPayload {
  return { title: 'Odak süresi bitti 🎯', body: `${minutes} dakikalık odak oturumunu tamamladın. Kısa bir mola ver!`, route: '/' }
}
