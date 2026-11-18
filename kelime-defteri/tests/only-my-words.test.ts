// "Sadece benim kelimelerim" kuralının testleri:
// Uygulama hiçbir yerde kullanıcının eklemediği bir kelimeyi karta veya bildirime koymamalı.
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { Repo } from '../src/main/repo'
import { buildChoice, modesFor, clozeFor, orderSentenceFor } from '@shared/quiz'
import { miniPayload, morningPayload, duePayload, streakPayload, weeklyPayload } from '@shared/notifyContent'
import { conversationSystem, conversationSummaryPrompt, patternCheckPrompt, usedTargets, VOCAB_RULE } from '@shared/prompts'
import type { ItemDraft, Item } from '@shared/types'

const draft = (term: string, meaning: string, extra: Partial<ItemDraft> = {}): ItemDraft => ({
  kind: 'word',
  term,
  ipa: '',
  pos: '',
  meanings: [meaning],
  examples: [],
  synonyms: [],
  antonyms: [],
  collocations: [],
  cefr: '',
  notes: '',
  register: '',
  template: '',
  usage: '',
  ...extra
})

let repo: Repo
const T = new Date(2026, 10, 18, 10, 0).getTime()

beforeEach(() => {
  repo = new Repo(new Database(':memory:'))
})

function seed() {
  const a = repo.addItem(draft('resilient', 'dayanıklı', { examples: [{ en: 'She is very resilient.', tr: 'O çok dayanıklı.' }], synonyms: ['tough'] }), T)
  const b = repo.addItem(draft('take for granted', 'hafife almak'), T + 1)
  const c = repo.addItem(draft('commute', 'işe gidip gelmek'), T + 2)
  const d = repo.addItem(
    draft("I'm looking forward to", 'dört gözle beklemek', { kind: 'pattern', template: "I'm looking forward to ___", register: 'neutral' }),
    T + 3
  )
  return { a, b, c, d }
}

describe('boş başlangıç', () => {
  it('veritabanı hazır kelime içermez', () => {
    expect(repo.counts().total).toBe(0)
    expect(repo.listItems()).toEqual([])
    expect(repo.studyQueue({}, T)).toEqual([])
    expect(repo.pickMiniItem(T)).toBeNull()
    expect(repo.dailyIntake(10, 'added', T)).toEqual([])
  })
  it('sadece sistem listesi "Zor kelimeler" vardır ve boştur', () => {
    const lists = repo.getLists()
    expect(lists).toHaveLength(1)
    expect(lists[0]).toMatchObject({ name: 'Zor kelimeler', system: true, count: 0 })
  })
})

describe('çalışma sırasına sadece kullanıcı seçince girer', () => {
  it('eklenen kart "Havuzda" başlar, çalışma kuyruğunda yoktur', () => {
    const { a } = seed()
    expect(a.status).toBe('pool')
    expect(repo.studyQueue({}, T + 10)).toEqual([])
  })
  it('"Çalışmaya başla" seçilen kartları kuyruğa koyar', () => {
    const { a, c } = seed()
    repo.setStatus([a.id, c.id], 'learning', T + 10)
    expect(repo.studyQueue({}, T + 20).map((i) => i.term).sort()).toEqual(['commute', 'resilient'])
  })
  it('günlük havuz alımı eklenme sırasıyla alır, rastgele değil', () => {
    seed()
    const ids = repo.dailyIntake(2, 'added', T + 10)
    expect(repo.getItems(ids).map((i) => i.term).sort()).toEqual(['resilient', 'take for granted'].sort())
  })
  it('günlük havuz alımı kullanıcının sürükle-bırak sırasına uyar', () => {
    const { a, b, c, d } = seed()
    repo.reorder([d.id, c.id, b.id, a.id])
    const ids = repo.dailyIntake(2, 'manual', T + 10)
    expect(ids).toEqual([d.id, c.id])
  })
  it('duraklatılan kart çalışmaya ve bildirime gelmez', () => {
    const { a } = seed()
    repo.setStatus([a.id], 'learning', T)
    repo.setPaused([a.id], true)
    expect(repo.studyQueue({}, T + 10)).toEqual([])
    expect(repo.pickMiniItem(T + 10)).toBeNull()
  })
})

describe('sorular ve bildirimler sadece kullanıcının kelimelerini içerir', () => {
  it('çoktan seçmeli şıkların tamamı kullanıcının kartlarıdır', () => {
    const { a, b, c, d } = seed()
    const all = repo.listItems()
    const myTerms = new Set(all.map((i) => i.term))
    const myMeanings = new Set(all.map((i) => i.meanings.join(', ')))
    for (const item of [a, b, c, d]) {
      for (let k = 0; k < 20; k++) {
        const q1 = buildChoice(repo.getItem(item.id)!, all, 'tr-en')
        q1.options.forEach((o) => expect(myTerms.has(o.text)).toBe(true))
        const q2 = buildChoice(repo.getItem(item.id)!, all, 'en-tr')
        q2.options.forEach((o) => expect(myMeanings.has(o.text)).toBe(true))
        expect(q1.options.map((o) => o.itemId)).toContain(item.id)
      }
    }
  })

  it('tek kartta çoktan seçmeli devre dışı (dışarıdan şık uydurulmaz)', () => {
    const only = repo.addItem(draft('resilient', 'dayanıklı'), T)
    expect(modesFor(only, [only])).not.toContain('choice')
  })

  it('boşluk doldurma ve cümle kurma sadece kullanıcının örnek cümlelerini kullanır', () => {
    const { a, b } = seed()
    expect(clozeFor(a)?.answer.toLowerCase()).toBe('resilient')
    expect(orderSentenceFor(a)?.sentence).toBe('She is very resilient.')
    expect(clozeFor(b)).toBeNull()
    expect(orderSentenceFor(b)).toBeNull()
  })

  it('mini tekrar bildirimi sadece "Öğreniyorum" listesinden gelir', () => {
    const { a, b, c } = seed()
    repo.setStatus([b.id], 'learning', T)
    repo.setStatus([c.id], 'learned', T)
    for (let k = 0; k < 5; k++) {
      const it = repo.pickMiniItem(T + k * 1000)!
      expect(it.id).toBe(b.id)
      const p = miniPayload(it)
      expect(p.body).toContain('take for granted')
      expect(p.body).not.toContain(a.term)
    }
  })

  it('mini tekrar sırayla döner (en uzun süredir gösterilmeyen)', () => {
    const { a, b } = seed()
    repo.setStatus([a.id, b.id], 'learning', T)
    const first = repo.pickMiniItem(T + 1000)!
    const second = repo.pickMiniItem(T + 2000)!
    expect(first.id).not.toBe(second.id)
  })

  it('diğer bildirimler kelime içermez, sadece sayılar', () => {
    const { a, b, c, d } = seed()
    const terms = [a, b, c, d].map((i) => i.term.toLowerCase())
    const texts = [morningPayload(3, 2), duePayload(12), streakPayload(4), weeklyPayload({ reviews: 10, correct: 8, added: 3, learned: 1, days: 3 })]
    for (const p of texts) for (const t of terms) expect((p.title + p.body).toLowerCase()).not.toContain(t)
    expect(duePayload(12).body).toBe("Kelimelerinden 12 tanesinin tekrar zamanı geldi.")
  })

  it('eş anlamlılar kart oluşturmaz; yalnızca bilgi alanıdır', () => {
    seed()
    expect(repo.findDuplicate('tough')).toBeNull()
    expect(repo.counts().total).toBe(4)
  })

  it('yanlış cevaplanan kart "Zor kelimeler" listesine girer; başka kart girmez', () => {
    const { a, b } = seed()
    repo.setStatus([a.id, b.id], 'learning', T)
    repo.review(a.id, 1, 'flashcard', T + 100)
    repo.review(b.id, 3, 'flashcard', T + 200)
    const hard = repo.listItems({ listId: repo.hardListId() })
    expect(hard.map((i) => i.term)).toEqual(['resilient'])
  })
})

describe('AI istemleri kullanıcının listesiyle sınırlıdır', () => {
  it('konuşma istemi sadece hedef kartları ve kelime kuralını içerir', () => {
    const { a, d } = seed()
    const sys = conversationSystem('a restaurant', [a, d])
    expect(sys).toContain(VOCAB_RULE)
    expect(sys).toContain('resilient')
    expect(sys).toContain("I'm looking forward to ___")
    expect(sys).not.toContain('commute')
    expect(sys).not.toContain('take for granted')
  })
  it('özet ve kalıp istemleri de kelime kuralını içerir', () => {
    const { a, d } = seed()
    expect(conversationSummaryPrompt([a], [{ role: 'user', content: 'hi' }])).toContain(VOCAB_RULE)
    expect(patternCheckPrompt(d, 'durum', 'cümle')).toContain(VOCAB_RULE)
  })
  it('kullanılan/kullanılmayan hedefler doğru bulunur', () => {
    const { a, b, d } = seed()
    const r = usedTargets([a, b, d] as Item[], ["I'm looking forward to the weekend.", 'He takes his job for granted.'])
    expect(r.used.sort()).toEqual(["I'm looking forward to", 'take for granted'].sort())
    expect(r.unused).toEqual(['resilient'])
  })
})

describe('tekrar / durum geçişleri', () => {
  it('tekrar eden kelime tespit edilir', () => {
    seed()
    expect(repo.findDuplicate('  Resilient ')?.term).toBe('resilient')
    expect(repo.findDuplicate('new one')).toBeNull()
  })
  it('anlam zorunlu', () => {
    expect(() => repo.addItem(draft('x', ''), T)).toThrow()
  })
  it('sıfırlama yeni FSRS kartı verir', () => {
    const { a } = seed()
    repo.setStatus([a.id], 'learning', T)
    repo.review(a.id, 4, 'flashcard', T)
    repo.resetProgress([a.id], T + 10)
    expect(repo.getItem(a.id)!.srs!.reps).toBe(0)
  })
  it('XP, seri ve rozet', () => {
    const { a } = seed()
    repo.setStatus([a.id], 'learning', T)
    const r = repo.review(a.id, 3, 'flashcard', T + 5)
    expect(r.xpGained).toBeGreaterThan(0)
    expect(r.streak).toBe(1)
    expect(r.streakExtended).toBe(true)
    expect(repo.stats(T + 10).badges.map((b) => b.id)).toContain('first-word')
  })
  it('JSON yedek al / geri yükle', () => {
    const { a } = seed()
    repo.setStatus([a.id], 'learning', T)
    const json = repo.exportJson()
    const other = new Repo(new Database(':memory:'))
    other.importJson(json)
    expect(other.counts().total).toBe(4)
    expect(other.getItem(a.id)!.status).toBe('learning')
    expect(other.getLists().filter((l) => l.system)).toHaveLength(1)
  })
})
