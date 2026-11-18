// İşletim sisteminin yerel bildirimleri.
// Windows: toastXml + "kelimedefterim://" protokolü ile butonlar (Ertele/Başla, Anlamını göster/Dinle).
// macOS: Notification actions. Linux: tıklanınca ilgili ekran açılır (butonlar uygulama içi pencerede).
import { Notification } from 'electron'
import type { NotifyPayload } from '@shared/notifyContent'

export const PROTOCOL = 'kelimedefterim'

export type ActionHandler = (action: string, payload: NotifyPayload) => void

const live = new Set<Notification>() // GC'nin bildirimi erken toplamasını önler

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export function actionUrl(action: string, p: NotifyPayload): string {
  const q = new URLSearchParams({ route: p.route })
  if (p.itemId) q.set('item', String(p.itemId))
  return `${PROTOCOL}://${action}?${q.toString()}`
}

function toastXml(p: NotifyPayload, silent: boolean): string {
  const actions = (p.actions ?? [])
    .map((a) => `<action content="${esc(a.label)}" arguments="${esc(actionUrl(a.id, p))}" activationType="protocol"/>`)
    .join('')
  const [line1, ...rest] = p.body.split('\n')
  return (
    `<toast launch="${esc(actionUrl('open', p))}" activationType="protocol">` +
    `<visual><binding template="ToastGeneric"><text>${esc(p.title)}</text><text>${esc(line1)}</text>` +
    (rest.length ? `<text>${esc(rest.join(' '))}</text>` : '') +
    `</binding></visual>` +
    (actions ? `<actions>${actions}</actions>` : '') +
    (silent ? '<audio silent="true"/>' : '') +
    `</toast>`
  )
}

export function notify(p: NotifyPayload, onAction: ActionHandler, opts: { silent?: boolean } = {}): boolean {
  if (!Notification.isSupported()) return false
  const silent = !!opts.silent
  let n: Notification
  if (process.platform === 'win32') {
    n = new Notification({ toastXml: toastXml(p, silent) })
    n.on('failed', () => {
      // Özel XML desteklenmezse sade bildirime düş
      live.delete(n)
      const plain = new Notification({ title: p.title, body: p.body, silent })
      plain.on('click', () => onAction('open', p))
      live.add(plain)
      plain.on('close', () => live.delete(plain))
      plain.show()
    })
  } else if (process.platform === 'darwin') {
    n = new Notification({
      title: p.title,
      body: p.body,
      silent,
      actions: (p.actions ?? []).map((a) => ({ type: 'button' as const, text: a.label }))
    })
    n.on('action', (_e, index) => {
      const a = p.actions?.[index]
      if (a) onAction(a.id, p)
    })
  } else {
    n = new Notification({ title: p.title, body: p.body, silent, urgency: 'normal' })
  }
  n.on('click', () => onAction('open', p))
  n.on('show', () => console.log('[bildirim] gösterildi:', p.title))
  n.on('failed', (_e, err) => console.warn('[bildirim] başarısız:', err))
  n.on('close', () => live.delete(n))
  live.add(n)
  n.show()
  setTimeout(() => live.delete(n), 10 * 60_000)
  return true
}

/** "kelimedefterim://reveal?route=/mini/3&item=3" → { action, route, item } */
export function parseActionUrl(url: string): { action: string; route: string; itemId?: number } | null {
  if (!url.startsWith(`${PROTOCOL}://`)) return null
  try {
    const u = new URL(url)
    const action = u.hostname || u.pathname.replace(/^\/+/, '').split('/')[0]
    const item = u.searchParams.get('item')
    return { action, route: u.searchParams.get('route') ?? '/', itemId: item ? Number(item) : undefined }
  } catch {
    return null
  }
}
