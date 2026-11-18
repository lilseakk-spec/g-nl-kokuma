// Yerel İngilizce telaffuz yedeği.
// Chromium'un speechSynthesis'i bazı sistemlerde yalnızca Türkçe ses görür (ör. Windows'ta OneCore'da
// sadece "Tolga" yüklüyse). Bu durumda İngilizce metin Türkçe okunur. Bunun yerine işletim sisteminin
// İngilizce sesini doğrudan kullanırız: Windows SAPI (System.Speech), macOS `say`, Linux `espeak-ng`.
import { spawn, execFile, type ChildProcessWithoutNullStreams } from 'node:child_process'

export interface NativeVoice {
  name: string
  lang: string
}

const PS_SCRIPT = `
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToDefaultAudioDevice()
while (($line = [Console]::In.ReadLine()) -ne $null) {
  try {
    $m = $line | ConvertFrom-Json
    if ($m.cmd -eq 'voices') {
      $v = $s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Culture.Name }
      [Console]::Out.WriteLine('voices ' + $m.id + ' ' + ($v -join ';'))
    } else {
      $chosen = $null
      if ($m.voice) { $chosen = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -eq $m.voice } | Select-Object -First 1 }
      if (-not $chosen) { $chosen = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq $m.culture } | Select-Object -First 1 }
      if (-not $chosen) { $chosen = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1 }
      if ($chosen) { $s.SelectVoice($chosen.VoiceInfo.Name) }
      $s.Rate = [int]$m.rate
      $s.Speak([string]$m.text)
    }
  } catch {}
  [Console]::Out.WriteLine('done ' + $m.id)
}
`

class WindowsTts {
  private proc: ChildProcessWithoutNullStreams | null = null
  private buf = ''
  private nextId = 1
  private waiters = new Map<number, (line: string) => void>()

  private ensure(): ChildProcessWithoutNullStreams {
    if (this.proc && !this.proc.killed) return this.proc
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-'], {
      windowsHide: true
    })
    p.stdin.write(PS_SCRIPT.replace(/\r?\n/g, '\n') + '\n')
    p.stdout.setEncoding('utf8')
    p.stdout.on('data', (d: string) => {
      this.buf += d
      let i: number
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim()
        this.buf = this.buf.slice(i + 1)
        const m = /^(done|voices) (\d+)\s?(.*)$/.exec(line)
        if (m) {
          const w = this.waiters.get(Number(m[2]))
          this.waiters.delete(Number(m[2]))
          w?.(m[3] ?? '')
        }
      }
    })
    p.on('exit', () => {
      for (const w of this.waiters.values()) w('')
      this.waiters.clear()
      if (this.proc === p) this.proc = null
    })
    this.proc = p
    return p
  }

  private send(msg: Record<string, unknown>): Promise<string> {
    const id = this.nextId++
    const p = this.ensure()
    return new Promise((resolve) => {
      this.waiters.set(id, resolve)
      p.stdin.write(JSON.stringify({ ...msg, id }) + '\n')
    })
  }

  speak(text: string, rate: number, culture: string, voice: string): Promise<void> {
    // Konuşma sürerken yenisi gelirse eskisini kes
    if ([...this.waiters.keys()].length) this.stop()
    const sapiRate = Math.max(-10, Math.min(10, Math.round((rate - 1) * 10)))
    return this.send({ cmd: 'speak', text, rate: sapiRate, culture, voice }).then(() => undefined)
  }

  async voices(): Promise<NativeVoice[]> {
    const raw = await this.send({ cmd: 'voices' })
    return raw
      .split(';')
      .filter(Boolean)
      .map((v) => {
        const [name, lang] = v.split('|')
        return { name, lang }
      })
  }

  stop(): void {
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
  }

  warm(): void {
    this.ensure()
  }
}

const win = process.platform === 'win32' ? new WindowsTts() : null
let current: ReturnType<typeof spawn> | null = null

function runOnce(cmd: string, args: string[]): Promise<void> {
  current?.kill()
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { windowsHide: true })
    current = p
    p.on('error', () => resolve())
    p.on('exit', () => resolve())
  })
}

function execList(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => execFile(cmd, args, (err, out) => resolve(err ? '' : String(out))))
}

export const nativeTts = {
  warm(): void {
    win?.warm()
  },
  async voices(): Promise<NativeVoice[]> {
    if (win) return (await win.voices()).filter((v) => v.lang.toLowerCase().startsWith('en'))
    if (process.platform === 'darwin') {
      const out = await execList('say', ['-v', '?'])
      return out
        .split('\n')
        .map((l) => /^(.+?)\s+([a-z]{2}_[A-Z]{2})\s/.exec(l))
        .filter((m): m is RegExpExecArray => !!m && m[2].startsWith('en'))
        .map((m) => ({ name: m[1].trim(), lang: m[2].replace('_', '-') }))
    }
    const out = await execList('espeak-ng', ['--voices=en'])
    return out ? [{ name: 'espeak-ng en-us', lang: 'en-US' }, { name: 'espeak-ng en-gb', lang: 'en-GB' }] : []
  },
  async speak(text: string, opts: { rate: number; accent: string; voice: string }): Promise<void> {
    if (!text.trim()) return
    if (win) return win.speak(text, opts.rate, opts.accent, opts.voice)
    if (process.platform === 'darwin') {
      const voices = await nativeTts.voices()
      const v = voices.find((x) => x.name === opts.voice) ?? voices.find((x) => x.lang === opts.accent) ?? voices[0]
      return runOnce('say', [...(v ? ['-v', v.name] : []), '-r', String(Math.round(175 * opts.rate)), text])
    }
    return runOnce('espeak-ng', ['-v', opts.accent === 'en-GB' ? 'en-gb' : 'en-us', '-s', String(Math.round(165 * opts.rate)), text])
  },
  stop(): void {
    win?.stop()
    current?.kill()
  }
}
