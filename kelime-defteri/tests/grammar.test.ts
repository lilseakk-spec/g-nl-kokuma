import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { BUILTIN_TOPICS, ofType, speedPool, testRound } from '@shared/grammar'
import { Repo } from '../src/main/repo'
import { checkAnswer } from '@shared/text'
import type { ItemDraft } from '@shared/types'

describe('konu tekrarı içerikleri', () => {
  it('kullanıcının istediği 13 konu, istenen sırada', () => {
    expect(BUILTIN_TOPICS.map((t) => t.id)).toEqual([
      'present-simple-positive',
      'questions',
      'negatives',
      'past-simple',
      'irregular-verbs',
      'future-simple',
      'present-continuous',
      'conjunctions',
      'modals',
      'past-continuous',
      'present-perfect',
      'phrasal-verbs',
      'present-perfect-continuous'
    ])
    expect(new Set(BUILTIN_TOPICS.map((t) => t.id)).size).toBe(13)
  })

  for (const t of BUILTIN_TOPICS) {
    describe(t.title, () => {
      it('anlatım, formül ve yeterli alıştırma var', () => {
        expect(t.sections.length).toBeGreaterThanOrEqual(2)
        expect(t.formula.length).toBeGreaterThan(0)
        expect(ofType(t.questions, 'choice').length).toBeGreaterThanOrEqual(7)
        expect(ofType(t.questions, 'gap').length).toBeGreaterThanOrEqual(6)
        expect(ofType(t.questions, 'order').length).toBeGreaterThanOrEqual(3)
        expect(ofType(t.questions, 'tf').length).toBeGreaterThanOrEqual(5)
        expect(t.pairs.length).toBeGreaterThanOrEqual(6)
        expect(t.homework.length).toBeGreaterThanOrEqual(1)
      })
      it('çoktan seçmelilerde geçerli ve tekil doğru cevap', () => {
        for (const q of ofType(t.questions, 'choice')) {
          expect(q.answer).toBeGreaterThanOrEqual(0)
          expect(q.answer).toBeLessThan(q.options.length)
          expect(new Set(q.options).size).toBe(q.options.length)
        }
      })
      it('boşluk doldurmada tam bir boşluk ve kendi cevabı doğru sayılır', () => {
        for (const q of ofType(t.questions, 'gap')) {
          expect(q.sentence.split('___').length, q.sentence).toBe(2)
          expect(checkAnswer(q.answers[0], q.answers[0])).toBe('exact')
        }
      })
      it('yanlış cümlelerin düzeltilmiş hali farklıdır', () => {
        for (const q of ofType(t.questions, 'tf')) if (!q.correct && q.fix) expect(q.fix).not.toBe(q.sentence)
      })
      it('eşleştirme çiftleri benzersiz', () => {
        expect(new Set(t.pairs.map((p) => p.left)).size).toBe(t.pairs.length)
      })
      it('tur üreticileri çalışır', () => {
        expect(testRound(t, 10).length).toBe(10)
        expect(speedPool(t).length).toBeGreaterThan(5)
      })
    })
  }
})

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

describe('otomatik doldurma (sadece boş alanlar)', () => {
  it('kullanıcının yazdığı anlam ve alanlar değişmez, eksikler dolar, yeni kart oluşmaz', () => {
    const repo = new Repo(new Database(':memory:'))
    const it0 = repo.addItem(draft('commute', 'işe gidip gelmek', { pos: 'fiil' }))
    expect(repo.needsDetails(it0)).toBe(true)
    repo.fillMissing(it0.id, {
      ipa: '/kəˈmjuːt/',
      pos: 'isim',
      cefr: 'B1',
      meanings: ['yolculuk'],
      examples: [{ en: 'My commute is long.', tr: 'İşe gidiş yolum uzun.' }],
      synonyms: ['travel']
    })
    const after = repo.getItem(it0.id)!
    expect(after.meanings).toEqual(['işe gidip gelmek'])
    expect(after.pos).toBe('fiil')
    expect(after.ipa).toBe('/kəˈmjuːt/')
    expect(after.cefr).toBe('B1')
    expect(after.examples).toHaveLength(1)
    expect(repo.needsDetails(after)).toBe(false)
    expect(repo.counts().total).toBe(1)
  })
})

describe('konu tekrarı ilerlemesi', () => {
  it('en iyi skor, deneme sayısı, XP ve seri kaydedilir; yedekte yer alır', () => {
    const repo = new Repo(new Database(':memory:'))
    const now = new Date(2026, 10, 18, 10).getTime()
    const r1 = repo.recordGrammar('questions', 'test', 6, 10, now)
    expect(r1.pct).toBe(60)
    expect(r1.xp).toBe(18)
    expect(r1.streak).toBe(1)
    expect(r1.newBadges).toContain('grammar-1')
    const r2 = repo.recordGrammar('questions', 'test', 4, 10, now + 1000)
    expect(r2.newBest).toBe(false)
    const p = repo.grammarProgress()
    expect(p).toEqual([{ topicId: 'questions', activity: 'test', best: 60, attempts: 2, lastAt: now + 1000 }])
    expect(repo.studiedToday(now)).toBe(true)
    const other = new Repo(new Database(':memory:'))
    other.importJson(repo.exportJson())
    expect(other.grammarProgress()).toHaveLength(1)
  })
})
