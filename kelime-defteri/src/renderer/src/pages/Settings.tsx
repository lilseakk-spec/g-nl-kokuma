import { useEffect, useState, type ReactNode } from 'react'
import type { NotificationSettings, Settings } from '@shared/types'
import { api } from '../lib/api'
import { useApp } from '../lib/store'
import { MELODY_OPTIONS, playMelody, sounds } from '../lib/sound'
import { englishVoices, onVoicesReady, speak, type VoiceOption } from '../lib/tts'
import { Icon, PageHeader, Spinner, Toggle } from '../components/ui'

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
        <Icon name={icon} /> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="font-semibold">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

export function SettingsPage() {
  const { settings: s, saveSettings, info, refreshInfo, toast } = useApp()
  const [key, setKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [voices, setVoices] = useState<VoiceOption[]>([])
  useEffect(() => onVoicesReady(() => setVoices(englishVoices())), [])

  const n = s.notifications
  const setN = <K extends keyof NotificationSettings>(k: K, v: Partial<NotificationSettings[K]>) =>
    saveSettings({ notifications: { ...n, [k]: { ...n[k], ...v } } } as Partial<Settings>)

  const test = async (kind: string) => toast(await api.testNotification(kind), 'info')

  const timeInput = (value: string, onChange: (v: string) => void) => (
    <input type="time" className="input w-28 py-1.5" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
  )

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Ayarlar" />

      <Section title="Yapay zekâ" icon="sparkles">
        <p className="text-sm text-muted">
          Otomatik doldurma (telaffuz, tür, seviye, örnek cümle), kalıp kontrolü, konuşma pratiği ve konu tekrarındaki yeni sorular yapay zekâ ile
          çalışır. Yapay zekâya sadece senin kelime ve kalıpların gönderilir.
        </p>
        <Row
          label="Durum"
          hint={
            info?.aiMode === 'claude'
              ? 'Bilgisayarındaki Claude hesabın kullanılıyor — kullanım Claude aboneliğinin limitinden düşer, API anahtarı gerekmez.'
              : info?.aiMode === 'api'
                ? info.apiKeySource === 'env'
                  ? '.env dosyasındaki API anahtarı kullanılıyor (API faturasına yansır).'
                  : 'API anahtarı kullanılıyor (API faturasına yansır).'
                : 'Kapalı — aşağıdan bir bağlantı yolu seç.'
          }
        >
          <span className={`chip ${info?.hasApiKey ? 'bg-good-soft text-good' : ''}`}>
            {info?.aiMode === 'claude' ? 'Claude hesabı' : info?.aiMode === 'api' ? 'API anahtarı' : 'Kapalı'}
          </span>
        </Row>

        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ['claude', '🟠 Claude hesabım', 'Bilgisayarındaki Claude ile bağlanır; aboneliğinin (Pro/Max) limitinden yer. Anahtar gerekmez.'],
              ['api', '🔑 API anahtarı', 'console.anthropic.com anahtarı ile; kullanım başına ücretlendirilir.']
            ] as const
          ).map(([v, title, desc]) => {
            const active = s.ai.provider === v || (s.ai.provider === 'auto' && info?.aiMode === v)
            return (
              <button
                key={v}
                type="button"
                className={`card border-2 p-4 text-left ${active ? 'border-brand' : 'hover:border-brand/50'}`}
                onClick={async () => {
                  await saveSettings({ ai: { ...s.ai, provider: v } })
                  await refreshInfo()
                }}
              >
                <div className="font-bold">
                  {title} {active && <span className="chip ml-1 bg-brand text-white">seçili</span>}
                </div>
                <div className="mt-1 text-xs text-muted">{desc}</div>
              </button>
            )
          })}
        </div>

        {(s.ai.provider === 'claude' || (s.ai.provider === 'auto' && info?.aiMode !== 'api')) && (
          <div className="rounded-xl bg-surface-2/60 p-4 text-sm">
            {info?.claudeFound ? (
              <span className="text-good">✓ Bilgisayarında Claude Code bulundu. "Test et" ile hesabının bağlı olduğunu doğrula.</span>
            ) : (
              <div className="space-y-2">
                <div className="font-semibold text-warn">Bilgisayarında Claude Code bulunamadı.</div>
                <div className="text-muted">
                  Claude Code'u kur (claude.com/claude-code), bir kez terminalde <span className="kbd">claude</span> yazıp Claude hesabınla giriş yap, sonra
                  "Yeniden ara"ya bas.
                </div>
                <button
                  className="btn py-1.5"
                  onClick={async () => {
                    const ok = await api.rescanClaude()
                    await refreshInfo()
                    toast(ok ? 'Claude bulundu ✓' : 'Hâlâ bulunamadı', ok ? 'ok' : 'err')
                  }}
                >
                  Yeniden ara
                </button>
              </div>
            )}
          </div>
        )}

        {(s.ai.provider === 'api' || (s.ai.provider === 'auto' && info?.aiMode === 'api')) && (
          <>
            <div className="flex gap-2">
              <input type="password" className="input" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
              <button
                className="btn btn-primary"
                disabled={!key.trim()}
                onClick={async () => {
                  try {
                    await api.setApiKey(key)
                    setKey('')
                    await refreshInfo()
                    toast('API anahtarı güvenli şekilde kaydedildi')
                  } catch (e) {
                    toast((e as Error).message, 'err')
                  }
                }}
              >
                Kaydet
              </button>
              {info?.apiKeySource === 'settings' && (
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    await api.setApiKey('')
                    await refreshInfo()
                    toast('Anahtar silindi')
                  }}
                >
                  Sil
                </button>
              )}
            </div>
            {info && !info.encryptionAvailable && <p className="text-xs text-warn">Bu sistemde güvenli saklama yok; anahtarı .env dosyasına yazın.</p>}
          </>
        )}

        <Row label="Model" hint="Haiku hızlı ve limiti az harcar; Sonnet daha ayrıntılı ama limitten daha çok yer.">
          <select
            className="input w-auto"
            value={s.ai.model}
            onChange={(e) => saveSettings({ ai: { ...s.ai, model: e.target.value as Settings['ai']['model'] } })}
          >
            <option value="claude-haiku-5-5">Haiku (önerilen)</option>
            <option value="claude-sonnet-5-5">Sonnet</option>
          </select>
          <button
            className="btn"
            disabled={!info?.hasApiKey || testing}
            onClick={async () => {
              setTesting(true)
              try {
                await api.testApiKey()
                toast('Bağlantı başarılı ✓')
              } catch (e) {
                toast((e as Error).message, 'err')
              } finally {
                setTesting(false)
              }
            }}
          >
            {testing ? <Spinner /> : null} Test et
          </button>
        </Row>
      </Section>

      <Section title="Bildirimler ve alarmlar" icon="bell">
        <div className="flex flex-wrap gap-2 rounded-xl bg-surface-2/60 p-3">
          <button className="btn btn-brand" onClick={() => test('test')}>
            <Icon name="bell" size={15} /> Test bildirimi gönder
          </button>
          <button className="btn" onClick={() => test('morning')}>
            Sabah alarmını dene
          </button>
          <button className="btn" onClick={() => test('due')}>
            Tekrar hatırlatması
          </button>
          <button className="btn" onClick={() => test('mini')}>
            Mini tekrar
          </button>
          <button className="btn" onClick={() => test('streak')}>
            Seri uyarısı
          </button>
          <button className="btn" onClick={() => test('weekly')}>
            Haftalık özet
          </button>
        </div>
        <Row label="Sabah çalışma alarmı" hint="Sesli alarm + bildirim, Ertele (10 dk) ve Başla butonlarıyla. Sessiz saatlerden etkilenmez.">
          {timeInput(n.morning.time, (v) => setN('morning', { time: v }))}
          <Toggle checked={n.morning.enabled} onChange={(v) => setN('morning', { enabled: v })} />
        </Row>
        <Row label="Tekrar hatırlatması" hint='"Kelimelerinden 12 tanesinin tekrar zamanı geldi" — sadece tekrarı gelen kart varsa.'>
          {timeInput(n.due.time, (v) => setN('due', { time: v }))}
          <Toggle checked={n.due.enabled} onChange={(v) => setN('due', { enabled: v })} />
        </Row>
        <Row label="Gün içi mini tekrar" hint='Sadece "Öğreniyorum" listenden bir kart. Listen boşsa bildirim gelmez.'>
          <select className="input w-auto py-1.5" value={n.mini.intervalMin} onChange={(e) => setN('mini', { intervalMin: Number(e.target.value) as 30 | 60 | 120 })}>
            <option value={30}>30 dakikada bir</option>
            <option value={60}>Saatte bir</option>
            <option value={120}>2 saatte bir</option>
          </select>
          <Toggle checked={n.mini.enabled} onChange={(v) => setN('mini', { enabled: v })} />
        </Row>
        <Row label="Akşam seri uyarısı" hint='O gün çalışmadıysan "Serin bozulmak üzere!"'>
          {timeInput(n.streak.time, (v) => setN('streak', { time: v }))}
          <Toggle checked={n.streak.enabled} onChange={(v) => setN('streak', { enabled: v })} />
        </Row>
        <Row label="Haftalık ilerleme özeti">
          <select className="input w-auto py-1.5" value={n.weekly.day} onChange={(e) => setN('weekly', { day: Number(e.target.value) })}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          {timeInput(n.weekly.time, (v) => setN('weekly', { time: v }))}
          <Toggle checked={n.weekly.enabled} onChange={(v) => setN('weekly', { enabled: v })} />
        </Row>
        <Row label="Sessiz saatler" hint="Bu aralıkta bildirim gelmez (sabah alarmı ve odak alarmı hariç).">
          {timeInput(n.quiet.start, (v) => setN('quiet', { start: v }))}
          <span className="text-muted">–</span>
          {timeInput(n.quiet.end, (v) => setN('quiet', { end: v }))}
          <Toggle checked={n.quiet.enabled} onChange={(v) => setN('quiet', { enabled: v })} />
        </Row>
      </Section>

      <Section title="Çalışma" icon="cards">
        <Row label="Günlük hedef" hint="Günde kaç tekrar yapmak istiyorsun?">
          <input type="number" min={5} max={500} className="input w-24 py-1.5" value={s.dailyGoal} onChange={(e) => saveSettings({ dailyGoal: Math.max(1, Number(e.target.value) || 20) })} />
        </Row>
        <Row label="Havuzdan her gün sırayla yeni kelime al" hint="Varsayılan KAPALI. Açarsan sadece senin havuzundan, senin belirlediğin sırayla alınır — asla rastgele değil.">
          <input
            type="number"
            min={1}
            max={50}
            className="input w-20 py-1.5"
            value={s.dailyIntake.count}
            disabled={!s.dailyIntake.enabled}
            onChange={(e) => saveSettings({ dailyIntake: { ...s.dailyIntake, count: Math.max(1, Number(e.target.value) || 1) } })}
          />
          <select
            className="input w-auto py-1.5"
            value={s.dailyIntake.order}
            disabled={!s.dailyIntake.enabled}
            onChange={(e) => saveSettings({ dailyIntake: { ...s.dailyIntake, order: e.target.value as 'added' | 'manual' } })}
          >
            <option value="added">Eklenme sırası</option>
            <option value="manual">Benim sıram (sürükle-bırak)</option>
          </select>
          <Toggle checked={s.dailyIntake.enabled} onChange={(v) => saveSettings({ dailyIntake: { ...s.dailyIntake, enabled: v } })} />
        </Row>
        <Row label="Odak modu süresi" hint="Bitince alarm çalar.">
          <select className="input w-auto py-1.5" value={s.focusMinutes} onChange={(e) => saveSettings({ focusMinutes: Number(e.target.value) })}>
            {[1, 15, 25, 30, 45, 50].map((m) => (
              <option key={m} value={m}>
                {m} dakika
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="Telaffuz" icon="speaker">
        {voices.length === 0 && (
          <p className="text-sm text-warn">İşletim sisteminde İngilizce ses bulunamadı. Windows: Ayarlar → Saat ve dil → Konuşma → Ses ekle → English (United States / United Kingdom).</p>
        )}
        {voices.length > 0 && !voices.some((v) => v.engine === 'web') && (
          <p className="text-xs text-muted">
            Windows'un yeni (doğal) İngilizce sesleri yüklü değil; sistemdeki klasik İngilizce ses kullanılıyor ({voices.map((v) => v.name).join(', ')}). Daha doğal ve İngiliz aksanlı sesler için: Ayarlar → Saat ve dil → Konuşma → Ses ekle → English.
          </p>
        )}
        <Row label="Aksan">
          {(['en-US', 'en-GB'] as const).map((a) => (
            <button key={a} className={`btn py-1.5 ${s.voice.accent === a ? 'border-ink bg-ink text-bg hover:bg-ink' : ''}`} onClick={() => saveSettings({ voice: { ...s.voice, accent: a, voiceName: '' } })}>
              {a === 'en-US' ? '🇺🇸 Amerikan' : '🇬🇧 İngiliz'}
            </button>
          ))}
        </Row>
        <Row label="Ses">
          <select className="input w-72 py-1.5" value={s.voice.voiceName} onChange={(e) => saveSettings({ voice: { ...s.voice, voiceName: e.target.value } })}>
            <option value="">Otomatik ({s.voice.accent})</option>
            {voices.map((v) => (
              <option key={v.engine + v.name} value={v.name}>
                {v.name} ({v.lang}){v.engine === 'native' ? ' · sistem' : ''}
              </option>
            ))}
          </select>
        </Row>
        <Row label={`Hız: ${s.voice.rate.toFixed(2)}×`}>
          <input type="range" min={0.5} max={1.5} step={0.05} value={s.voice.rate} onChange={(e) => saveSettings({ voice: { ...s.voice, rate: Number(e.target.value) } })} />
          <button className="btn py-1.5" onClick={() => speak('I am looking forward to practising my English every day.')}>
            <Icon name="speaker" size={15} /> Dene
          </button>
        </Row>
      </Section>

      <Section title="Sesler" icon="bell">
        <Row label="Efekt sesleri">
          <Toggle checked={s.sound.enabled} onChange={(v) => saveSettings({ sound: { ...s.sound, enabled: v } })} />
        </Row>
        <Row label={`Ses seviyesi: %${Math.round(s.sound.volume * 100)}`}>
          <input type="range" min={0} max={1} step={0.05} value={s.sound.volume} onChange={(e) => saveSettings({ sound: { ...s.sound, volume: Number(e.target.value) } })} />
        </Row>
        <Row label="Dinle">
          {(
            [
              ['Doğru', sounds.correct],
              ['Yanlış', sounds.wrong],
              ['Seri', sounds.streak],
              ['Seviye', sounds.levelUp],
              ['Hedef', sounds.goal]
            ] as const
          ).map(([l, f]) => (
            <button key={l} className="btn py-1 text-xs" onClick={() => f()}>
              {l}
            </button>
          ))}
        </Row>
        <Row label="Alarm melodisi">
          <select className="input w-auto py-1.5" value={s.sound.alarmMelody} onChange={(e) => saveSettings({ sound: { ...s.sound, alarmMelody: e.target.value as Settings['sound']['alarmMelody'] } })}>
            {MELODY_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button className="btn py-1.5" onClick={() => playMelody(s.sound.alarmMelody)}>
            <Icon name="play" size={13} /> Çal
          </button>
        </Row>
      </Section>

      <Section title="Görünüm ve sistem" icon="settings">
        <Row label="Tema">
          {(
            [
              ['system', 'Sistem'],
              ['light', 'Açık'],
              ['dark', 'Koyu']
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={`btn py-1.5 ${s.theme === v ? 'border-ink bg-ink text-bg hover:bg-ink' : ''}`} onClick={() => saveSettings({ theme: v })}>
              {l}
            </button>
          ))}
        </Row>
        <Row label="Bilgisayar açılınca otomatik başlat" hint="Tepside sessizce başlar. (Geliştirme modunda sisteme kaydedilmez; kurulu sürümde çalışır.)">
          <Toggle checked={s.autoStart} onChange={(v) => saveSettings({ autoStart: v })} />
        </Row>
        <Row label="Pencereyi kapatınca" hint="Uygulama sistem tepsisinde çalışmaya devam eder. Tamamen kapatmak için tepsi menüsünden Çıkış.">
          <span className="chip">Tepside çalış</span>
        </Row>
        <Row label="Veri klasörü" hint={info?.userData}>
          <button className="btn py-1.5" onClick={() => api.openDataFolder()}>
            Klasörü aç
          </button>
        </Row>
      </Section>

      <Section title="Yedekleme" icon="download">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={async () => (await api.exportBackup()) && toast('Yedek kaydedildi')}>
            <Icon name="download" size={15} /> JSON yedeği al
          </button>
          <button
            className="btn"
            onClick={async () => {
              if (!confirm('Yedekten geri yükleme mevcut tüm verilerin yerine geçer. Devam edilsin mi?')) return
              try {
                const r = await api.importBackup()
                if (r) toast(`Geri yüklendi: ${r.items} kart`)
              } catch (e) {
                toast((e as Error).message, 'err')
              }
            }}
          >
            <Icon name="upload" size={15} /> Yedekten geri yükle
          </button>
          <button className="btn" onClick={async () => (await api.exportCsv()) && toast('CSV kaydedildi')}>
            CSV olarak dışa aktar
          </button>
        </div>
        <p className="text-xs text-muted">API anahtarın yedeğe dahil edilmez.</p>
      </Section>
      <p className="text-center text-xs text-muted">Kelime Defterim {info?.version} · {info?.platform}</p>
    </div>
  )
}
