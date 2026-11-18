import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApp, useData } from '../lib/store'
import { loopAlarm } from '../lib/sound'
import { Icon } from '../components/ui'

/** Küçük, her zaman üstte alarm penceresi: melodi durdurulana kadar çalar */
export function AlarmPage({ type }: { type: string }) {
  const { settings } = useApp()
  const [task] = useData(() => api.todayTask())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // ayarlar yüklenince melodiyi başlat
    const t = setTimeout(() => setReady(true), 250)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!ready) return
    return loopAlarm(settings.sound.alarmMelody)
  }, [ready, settings.sound.alarmMelody])

  const close = () => api.closeWindow(null)
  const focus = type === 'focus'

  return (
    <div className="drag-region flex h-full flex-col justify-between bg-surface p-5">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-muted">
            <img src="./icon.png" className="h-5 w-5 rounded" alt="" /> Kelime Defterim
          </div>
          <button className="no-drag text-muted hover:text-ink" onClick={close} aria-label="Kapat">
            <Icon name="x" />
          </button>
        </div>
        <div className="mt-4 text-3xl">{focus ? '🎯' : '☀️'}</div>
        <h1 className="mt-1 text-xl font-extrabold">{focus ? 'Odak süresi bitti!' : 'Günaydın! Çalışma zamanı'}</h1>
        <p className="mt-1 text-sm text-muted">
          {focus
            ? 'Harika iş. Kısa bir mola ver.'
            : task
              ? task.due + task.fresh > 0
                ? `Bugünkü görevin: ${task.due} tekrar, ${task.fresh} yeni.`
                : 'Bugün tekrarın yok — yeni kelimeni ekleyebilirsin.'
              : ''}
        </p>
      </div>
      <div className="no-drag flex gap-2">
        {focus ? (
          <button className="btn btn-primary flex-1 py-2.5" onClick={close}>
            Tamam
          </button>
        ) : (
          <>
            <button className="btn flex-1 py-2.5" onClick={() => api.snooze()}>
              <Icon name="clock" size={15} /> Ertele (10 dk)
            </button>
            <button
              className="btn btn-primary flex-1 py-2.5"
              onClick={async () => {
                await api.showMain('/study')
                close()
              }}
            >
              <Icon name="play" size={14} /> Başla
            </button>
          </>
        )}
      </div>
    </div>
  )
}
