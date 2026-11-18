import { describe, it, expect } from 'vitest'
import { checkAnswer, checkAnyAnswer, parseBulkLines, parseCsv, rowsToImport, findTermInSentence, diffChars, normalizeTerm } from '@shared/text'

describe('yazım toleransı', () => {
  it('küçük hatalar "typo", büyükler "wrong"', () => {
    expect(checkAnswer('resilient', 'resilient')).toBe('exact')
    expect(checkAnswer('Resilient ', 'resilient')).toBe('exact')
    expect(checkAnswer('resilent', 'resilient')).toBe('typo')
    expect(checkAnswer('resiliant', 'resilient')).toBe('typo')
    expect(checkAnswer('resist', 'resilient')).toBe('wrong')
    expect(checkAnswer('cat', 'car')).toBe('wrong')
    expect(checkAnswer('', 'car')).toBe('wrong')
  })
  it('anlamlardan herhangi biri', () => {
    expect(checkAnyAnswer('dayanıklı', ['dirençli, dayanıklı'])).toBe('exact')
  })
  it('hata gösterimi eksik harfi işaretler', () => {
    const d = diffChars('resilent', 'resilient')
    expect(d.filter((x) => !x.ok).map((x) => x.ch)).toEqual(['i'])
  })
})

describe('toplu ekleme', () => {
  it('farklı ayraçları ayrıştırır', () => {
    const r = parseBulkLines(
      'resilient\ntake for granted - hafife almak\n\n# yorum\ncommute: işe gidip gelmek\n1. look up = bakmak\nfar-fetched\nbreak down\tbozulmak'
    )
    expect(r.map((x) => [x.term, x.meaning])).toEqual([
      ['resilient', ''],
      ['take for granted', 'hafife almak'],
      ['commute', 'işe gidip gelmek'],
      ['look up', 'bakmak'],
      ['far-fetched', ''],
      ['break down', 'bozulmak']
    ])
  })
  it('normalize', () => {
    expect(normalizeTerm('  I’m  Looking forward to. ')).toBe("i'm looking forward to")
  })
})

describe('CSV / Anki', () => {
  it('başlıklı CSV', () => {
    const rows = parseCsv('term,meaning,tags\n"take for granted","hafife almak, önemsememek",idiom\nresilient,dayanıklı,\n')
    const imp = rowsToImport(rows)
    expect(imp).toHaveLength(2)
    expect(imp[0]).toMatchObject({ term: 'take for granted', meaning: 'hafife almak, önemsememek', tags: ['idiom'] })
  })
  it('Anki düz metin dışa aktarımı (sekme, # başlıklar, HTML)', () => {
    const txt = '#separator:tab\n#html:true\nresilient\t<b>dayanıklı</b><br>esnek\nubiquitous\ther yerde olan [sound:x.mp3]\n'
    const imp = rowsToImport(parseCsv(txt))
    expect(imp.map((r) => [r.term, r.meaning])).toEqual([
      ['resilient', 'dayanıklı, esnek'],
      ['ubiquitous', 'her yerde olan']
    ])
  })
})

describe('cümlede terim bulma', () => {
  it('çekimli ve çok kelimeli', () => {
    expect(findTermInSentence('She is very resilient after the loss.', 'resilient')).not.toBeNull()
    expect(findTermInSentence('He takes it for granted.', 'take for granted')).not.toBeNull()
    expect(findTermInSentence('I am looking forward to the trip.', 'looking forward to ___')).not.toBeNull()
    expect(findTermInSentence('We are making progress.', 'make')).not.toBeNull()
    expect(findTermInSentence('Nothing here.', 'resilient')).toBeNull()
  })
})
