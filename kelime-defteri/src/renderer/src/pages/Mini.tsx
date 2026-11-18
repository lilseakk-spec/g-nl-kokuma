import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useData } from '../lib/store'
import { speak } from '../lib/tts'
import { Icon, SpeakButton } from '../components/ui'

/** Mini tekrar penceresi: bildirimdeki "Anlamını göster" / "Dinle" buraya açılır */
export function MiniPage({ id, reveal, speakNow }: { id: number; reveal: boolean; speakNow: boolean }) {
  const [item] = useData(() => api.getItem(id), [id])
  const [shown, setShown] = useState(reveal)
  useEffect(() => setShown(reveal), [reveal, id])
  useEffect(() => {
    if (item && speakNow) setTimeout(() => void speak(item.term), 300)
  }, [item, speakNow])
  const close = () => api.closeWindow(null)
  if (!item) return <div className="p-5 text-sm text-muted">Kart bulunamadı.</div>
  return (
    <div className="drag-region flex h-full flex-col bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-muted uppercase">Mini tekrar</span>
        <button className="no-drag text-muted hover:text-ink" onClick={close} aria-label="Kapat">
          <Icon name="x" />
        </button>
      </div>
      <div className="no-drag mt-3 flex items-center gap-2">
        <span className="term text-3xl font-extrabold">{item.kind === 'pattern' && item.template ? item.template : item.term}</span>
        <SpeakButton text={item.term} size={20} />
      </div>
      {item.ipa && <div className="text-sm text-muted">{item.ipa}</div>}
      <div className="no-drag mt-4 flex-1 overflow-y-auto">
        {shown ? (
          <div className="animate-pop space-y-2">
            <div className="text-lg font-bold">{item.meanings.join(', ')}</div>
            {item.examples[0] && (
              <div className="flex items-start gap-1 text-sm">
                <SpeakButton text={item.examples[0].en} size={13} />
                <div>
                  <div>{item.examples[0].en}</div>
                  <div className="text-muted">{item.examples[0].tr}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-brand w-full py-3" onClick={() => setShown(true)}>
            Anlamını göster
          </button>
        )}
      </div>
      <div className="no-drag mt-3 flex gap-2">
        <button className="btn flex-1" onClick={() => speak(item.term)}>
          <Icon name="speaker" size={15} /> Dinle
        </button>
        <button
          className="btn flex-1"
          onClick={async () => {
            await api.showMain('/study')
            close()
          }}
        >
          Çalış
        </button>
      </div>
    </div>
  )
}
