// Uygulama ve tepsi simgelerini harici dosya indirmeden, kodla üretir (PNG).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'build')
mkdirSync(out, { recursive: true })

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

// İşaretli mesafe fonksiyonları (0..1 koordinat)
const sdRoundRect = (x, y, cx, cy, hw, hh, r) => {
  const qx = Math.abs(x - cx) - hw + r
  const qy = Math.abs(y - cy) - hh + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}
const sdTri = (px, py, a, b, c) => {
  // nokta üçgen içinde mi (basit)
  const s = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
  const p = [px, py]
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos) ? -1 : 1
}

function render(size, { bg = true, mono = false } = {}) {
  const buf = Buffer.alloc(size * size * 4)
  const SS = 4
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size
          const v = (y + (sy + 0.5) / SS) / size
          let cr = 0, cg = 0, cb = 0, ca = 0
          // arka plan: yuvarlak kare, mürekkep mavisi → zümrüt
          if (bg && sdRoundRect(u, v, 0.5, 0.5, 0.46, 0.46, 0.2) < 0) {
            const t = (u + v) / 2
            cr = 30 + (16 - 30) * t
            cg = 41 + (150 - 41) * t
            cb = 92 + (128 - 92) * t
            ca = 255
          }
          // konuşma balonu
          const bubble = sdRoundRect(u, v, 0.5, 0.45, 0.28, 0.2, 0.1) < 0 || sdTri(u, v, [0.34, 0.6], [0.48, 0.6], [0.3, 0.76]) < 0
          if (bubble) {
            if (mono) { cr = cg = cb = 0; ca = 255 } else { cr = 250; cg = 247; cb = 240; ca = 255 }
            // iki satır "metin"
            const line1 = sdRoundRect(u, v, 0.47, 0.39, 0.15, 0.028, 0.028) < 0
            const line2 = sdRoundRect(u, v, 0.43, 0.5, 0.11, 0.028, 0.028) < 0
            if (line1 || line2) {
              if (mono) ca = 0
              else { cr = 232; cg = 120; cb = 60 }
            }
          }
          r += cr * (ca / 255); g += cg * (ca / 255); b += cb * (ca / 255); a += ca
        }
      const n = SS * SS
      const alpha = a / n
      const i = (y * size + x) * 4
      buf[i] = alpha ? Math.round((r / n) * 255 / alpha) : 0
      buf[i + 1] = alpha ? Math.round((g / n) * 255 / alpha) : 0
      buf[i + 2] = alpha ? Math.round((b / n) * 255 / alpha) : 0
      buf[i + 3] = Math.round(alpha)
    }
  return png(size, buf)
}

writeFileSync(join(out, 'icon.png'), render(512))
writeFileSync(join(out, 'tray.png'), render(32))
writeFileSync(join(out, 'trayTemplate.png'), render(22, { bg: false, mono: true }))
writeFileSync(join(out, 'trayTemplate@2x.png'), render(44, { bg: false, mono: true }))
writeFileSync(join(root, 'src/renderer/public/icon.png'), render(128))
console.log('Simgeler build/ klasörüne yazıldı.')
