// "Claude hesabı" sağlayıcısı: bilgisayarda kurulu Claude Code (`claude`) komutunu çağırır.
// API anahtarı gerekmez; kullanım, Claude'a giriş yapılmış hesabın (Pro/Max) limitinden düşer.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

export class ClaudeCliError extends Error {}

let cachedPath: string | null | undefined

/** claude komutunu bilinen kurulum yerlerinde ve PATH'te arar */
export function findClaude(): string | null {
  if (cachedPath !== undefined) return cachedPath
  const home = homedir()
  const win = process.platform === 'win32'
  const appData = process.env.APPDATA ?? join(home, 'AppData', 'Roaming')
  const candidates = win
    ? [
        join(appData, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
        join(home, '.local', 'bin', 'claude.exe'),
        join(home, '.claude', 'local', 'claude.exe')
      ]
    : [
        join(home, '.local', 'bin', 'claude'),
        join(home, '.claude', 'local', 'claude'),
        '/opt/homebrew/bin/claude',
        '/usr/local/bin/claude',
        join(home, '.npm-global', 'bin', 'claude')
      ]
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue
    candidates.push(join(dir, win ? 'claude.exe' : 'claude'))
    // npm'in Windows kabuk betiği varsa gerçek programı yanındaki node_modules'ta ara
    if (win && existsSync(join(dir, 'claude.cmd')))
      candidates.push(join(dir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'))
  }
  cachedPath = candidates.find((p) => existsSync(p)) ?? null
  return cachedPath
}

export function resetClaudePath(): void {
  cachedPath = undefined
}

interface CliResult {
  is_error?: boolean
  result?: string
  structured_output?: unknown
  api_error_status?: number | null
  subtype?: string
  duration_ms?: number
  duration_api_ms?: number
}

export interface CliOptions {
  model: 'haiku' | 'sonnet'
  system: string
  prompt: string
  jsonSchema?: object
  workDir: string
  timeoutMs?: number
}

function humanError(text: string): string {
  if (/not logged in|login|authenticate|\/login|401/i.test(text)) return 'Claude hesabına giriş yapılmamış. Claude uygulamasını veya bir terminalde "claude" komutunu açıp giriş yap.'
  if (/usage limit|rate limit|limit reached|429/i.test(text)) return 'Claude kullanım limitine ulaşıldı. Limit yenilenince tekrar dene.'
  if (/ENOTFOUND|network|ECONN/i.test(text)) return 'İnternet bağlantısı kurulamadı.'
  return `Claude yanıt vermedi: ${text.slice(0, 200)}`
}

/** Tek seferlik, araçsız, ayarsız bir Claude çağrısı */
export function runClaude(opts: CliOptions): Promise<{ text: string; structured?: unknown }> {
  const bin = findClaude()
  if (!bin) return Promise.reject(new ClaudeCliError('Bilgisayarda Claude Code bulunamadı.'))
  mkdirSync(opts.workDir, { recursive: true })
  const args = [
    '-p',
    '--output-format',
    'json',
    '--model',
    opts.model,
    '--system-prompt',
    opts.system,
    '--no-session-persistence',
    '--tools',
    '',
    '--strict-mcp-config',
    '--setting-sources',
    ''
  ]
  if (opts.jsonSchema) args.push('--json-schema', JSON.stringify(opts.jsonSchema))
  // Abonelik limitinden düşmesi için: API anahtarı ortam değişkenlerini alt sürece verme
  const env = { ...process.env }
  for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'ELECTRON_RUN_AS_NODE'])
    delete env[k]
  // Hız: kısa sözlük/alıştırma işleri için uzun "düşünme" adımı gereksiz; gereksiz ağ trafiğini de kapat
  env.MAX_THINKING_TOKENS = '0'
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1'
  env.DISABLE_AUTOUPDATER = '1'

  return new Promise((resolve, reject) => {
    const started = Date.now()
    const p = spawn(bin, args, { cwd: opts.workDir, env, windowsHide: true })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      p.kill()
      reject(new ClaudeCliError('Claude zaman aşımına uğradı; tekrar dene.'))
    }, opts.timeoutMs ?? 120_000)
    p.stdout.setEncoding('utf8')
    p.stderr.setEncoding('utf8')
    p.stdout.on('data', (d: string) => (out += d))
    p.stderr.on('data', (d: string) => (err += d))
    p.on('error', (e) => {
      clearTimeout(timer)
      reject(new ClaudeCliError(humanError(e.message)))
    })
    p.on('close', () => {
      clearTimeout(timer)
      let r: CliResult
      try {
        r = JSON.parse(out.trim().split('\n').pop() ?? '') as CliResult
      } catch {
        return reject(new ClaudeCliError(humanError(err || out || 'boş yanıt')))
      }
      if (r.is_error || r.subtype !== 'success') return reject(new ClaudeCliError(humanError(r.result ?? err ?? '')))
      resolve({ text: (r.result ?? '').trim(), structured: r.structured_output })
    })
    p.stdin.end(opts.prompt, 'utf8')
  })
}
