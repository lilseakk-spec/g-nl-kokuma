// Geliştirme aracı: çalışan uygulamayı DevTools protokolüyle sürer.
// Kullanım: node scripts/cdp.mjs <port> <hedef-url-parçası> eval "<js>" | shot <dosya.png>
import { writeFileSync } from 'node:fs'

const [port, match, cmd, arg] = process.argv.slice(2)
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
const pages = targets.filter((t) => t.type === 'page')
if (cmd === 'list') {
  console.log(pages.map((t) => t.url).join('\n'))
  process.exit(0)
}
const t = pages.find((p) => p.url.includes(match)) ?? pages[0]
const ws = new WebSocket(t.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id
    pending.set(i, r)
    ws.send(JSON.stringify({ id: i, method, params }))
  })

if (cmd === 'eval') {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${arg} })()`, awaitPromise: true, returnByValue: true, userGesture: true })
  console.log(JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails ?? r, null, 1))
} else if (cmd === 'shot') {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(arg, Buffer.from(r.result.data, 'base64'))
  console.log('saved', arg)
}
ws.close()
process.exit(0)
