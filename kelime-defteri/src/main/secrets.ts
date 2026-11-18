// API anahtarı: önce Ayarlar'da girilen (safeStorage ile şifreli), yoksa .env'deki ANTHROPIC_API_KEY.
import { app, safeStorage } from 'electron'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import type { Repo } from './repo'

let envKey = ''

export function loadEnvKey(): void {
  const candidates = [
    join(process.cwd(), '.env'),
    join(app.getAppPath(), '.env'),
    join(dirname(app.getAppPath()), '.env'),
    join(dirname(process.execPath), '.env'),
    join(app.getPath('userData'), '.env')
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      const r = loadDotenv({ path: p, quiet: true } as never)
      const k = r.parsed?.ANTHROPIC_API_KEY?.trim()
      if (k) {
        envKey = k
        return
      }
    }
  }
  envKey = process.env.ANTHROPIC_API_KEY?.trim() ?? ''
}

export class Secrets {
  private cache: string | null = null
  constructor(private repo: Repo) {}

  encryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }

  private stored(): string {
    if (this.cache !== null) return this.cache
    const enc = this.repo.kvGet<string>('apiKeyEnc', '')
    if (!enc) return (this.cache = '')
    try {
      this.cache = safeStorage.decryptString(Buffer.from(enc, 'base64'))
    } catch {
      this.cache = ''
    }
    return this.cache
  }

  getKey(): string {
    return this.stored() || envKey
  }

  source(): 'settings' | 'env' | 'none' {
    if (this.stored()) return 'settings'
    if (envKey) return 'env'
    return 'none'
  }

  setKey(key: string): void {
    const k = key.trim()
    if (!k) {
      this.repo.kvSet('apiKeyEnc', '')
      this.cache = ''
      return
    }
    if (!safeStorage.isEncryptionAvailable())
      throw new Error('Bu sistemde güvenli anahtar saklama kullanılamıyor. Anahtarı .env dosyasına yazın.')
    this.repo.kvSet('apiKeyEnc', safeStorage.encryptString(k).toString('base64'))
    this.cache = k
  }
}
