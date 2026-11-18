// AI'a gönderilen istemler. Tüm içerik kullanıcının kendi listesiyle sınırlıdır.
import type { ChatMessage, Item } from './types'

export const VOCAB_RULE =
  'STRICT VOCABULARY RULE: The learner studies ONLY their own word list. ' +
  'Do not teach, introduce, highlight, or suggest any new vocabulary. ' +
  'Whenever you need words outside the list, use only the simplest, most basic English (A1 level). ' +
  'Never present any word outside the list as something to learn.'

export function enrichPrompt(term: string, givenMeaning?: string): string {
  return [
    `The learner (a Turkish speaker) has added this English entry to their personal notebook: "${term}".`,
    givenMeaning ? `They wrote its Turkish meaning as: "${givenMeaning}". Keep that meaning first.` : '',
    'Fill in dictionary details for THIS entry only.',
    '- kind: "pattern" if it is a multi-word speaking pattern / sentence frame (e.g. "I\'m looking forward to", "Would you mind ..."), otherwise "word" (single words, phrasal verbs and idioms are "word").',
    '- ipa: IPA in slashes (General American).',
    '- pos: part of speech in Turkish (isim, fiil, sıfat, zarf, deyim, kalıp, phrasal verb...).',
    '- meanings: 1-3 short Turkish meanings.',
    '- examples: exactly 2 natural example sentences that contain the entry, each with a Turkish translation. Keep the other words in the sentences very simple (A1-A2).',
    '- synonyms / antonyms / collocations: up to 4 each, may be empty. These are reference info only.',
    '- cefr: estimated CEFR level (A1..C2).',
    '- For patterns: register ("formal", "informal" or "neutral"), template with ___ for the blank (e.g. "I\'m looking forward to ___"), usage = when to use it, in Turkish. For words leave register "", template "", usage "".'
  ]
    .filter(Boolean)
    .join('\n')
}

export function itemLine(i: Item): string {
  const m = i.meanings.join(', ')
  return i.kind === 'pattern' ? `- [pattern] ${i.template || i.term} — ${m}` : `- ${i.term} — ${m}`
}

export const SCENARIOS: { id: string; label: string; en: string }[] = [
  { id: 'restaurant', label: 'Restoranda', en: 'ordering food at a restaurant (you are the waiter)' },
  { id: 'interview', label: 'İş görüşmesi', en: 'a job interview (you are the interviewer)' },
  { id: 'airport', label: 'Havalimanında', en: 'checking in at an airport (you are the check-in agent)' },
  { id: 'hotel', label: 'Otelde', en: 'checking into a hotel (you are the receptionist)' },
  { id: 'smalltalk', label: 'Günlük sohbet', en: 'casual small talk with a new friend' },
  { id: 'meeting', label: 'İş toplantısı', en: 'a short work meeting with a colleague' },
  { id: 'shopping', label: 'Alışverişte', en: 'shopping for clothes (you are the shop assistant)' },
  { id: 'doctor', label: 'Doktorda', en: 'a visit to the doctor (you are the doctor)' }
]

export function conversationSystem(scenario: string, targets: Item[]): string {
  return [
    `You are a friendly English conversation partner for a Turkish-speaking learner. Role-play: ${scenario}.`,
    VOCAB_RULE,
    "The learner's target words and patterns (use them naturally and create chances for the learner to use them):",
    ...targets.map(itemLine),
    'Rules:',
    '- Reply in English only, 1-3 short sentences, then ask one question that invites the learner to use one of the target items.',
    '- Use the target items yourself where natural.',
    '- Do not correct mistakes during the chat; a summary will be produced at the end.',
    '- Never list vocabulary or teach new words.'
  ].join('\n')
}

export function conversationSummaryPrompt(targets: Item[], transcript: ChatMessage[]): string {
  return [
    'Analyse the learner messages in this practice conversation.',
    VOCAB_RULE,
    'Target items:',
    ...targets.map(itemLine),
    'Transcript:',
    ...transcript.map((m) => `${m.role === 'user' ? 'LEARNER' : 'PARTNER'}: ${m.content}`),
    'Return: summaryTr (2-4 sentence Turkish summary of how it went), mistakes (each learner mistake with the original, a corrected version and a short Turkish explanation; corrections must use simple words), used (target terms the learner actually used, copied exactly from the list), unused (target terms the learner did not use, copied exactly from the list).'
  ].join('\n')
}

export function patternCheckPrompt(item: Item, situation: string, answer: string): string {
  return [
    'A Turkish-speaking learner is practising one of their own English speaking patterns.',
    VOCAB_RULE,
    `Pattern: "${item.template || item.term}" (${item.meanings.join(', ')})`,
    item.usage ? `When to use (Turkish): ${item.usage}` : '',
    `Situation given to the learner: ${situation}`,
    `Learner's sentence: "${answer}"`,
    'Return: correct (is the sentence grammatical and natural), usedPattern (did they use the pattern), corrected (a corrected natural version using the pattern, simple words only), explanationTr (short Turkish explanation of mistakes, or praise if correct).'
  ]
    .filter(Boolean)
    .join('\n')
}

export function situationPrompt(item: Item): string {
  return [
    'Write ONE short situation in Turkish (max 25 words) where a learner would naturally use this English pattern. Do not include the English pattern itself or any English words in the situation.',
    `Pattern: "${item.template || item.term}" — ${item.meanings.join(', ')}`,
    item.usage ? `Usage note: ${item.usage}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

/** Konuşmada hedef kelimelerden hangileri kullanıcı tarafından kullanıldı (yerel kontrol) */
export function usedTargets(targets: Item[], userTexts: string[]): { used: string[]; unused: string[] } {
  const text = ' ' + userTexts.join(' ').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ') + ' '
  const used: string[] = []
  const unused: string[] = []
  for (const t of targets) {
    const core = (t.kind === 'pattern' && t.template ? t.template : t.term)
      .toLowerCase()
      .replace(/_{2,}|\.\.\.|…/g, ' ')
      .replace(/\b(sb|sth|someone|something)\b/g, ' ')
      .replace(/[^a-z0-9'\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
    if (!core.length) continue
    const first = core[0].replace(/e$/, '')
    const re = new RegExp(
      '\\s' +
        [first, ...core.slice(1)].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("[a-z']*\\s+(?:[a-z']+\\s+){0,2}?") +
        "[a-z']*\\s"
    )
    ;(re.test(text) ? used : unused).push(t.term)
  }
  return { used, unused }
}

// ---------- konu tekrarı (dilbilgisi) ----------
export function grammarVocabNote(words: Item[]): string {
  if (!words.length) return 'Use only very simple, common A1 words in all sentences.'
  return [
    "Where natural, build sentences with the learner's own words below; otherwise use only very simple, common A1 words.",
    "Never introduce or highlight new vocabulary. The learner's words:",
    words.map((w) => w.term).join(', ')
  ].join('\n')
}

export function grammarExercisePrompt(topicTitle: string, topicSubtitle: string, kind: 'test' | 'gap' | 'order', count: number, words: Item[]): string {
  const what = {
    test: `${count} multiple-choice questions. Each: prompt (an English sentence with ___ for the missing part, or a short question), exactly 4 options, answer = index (0-3) of the only correct option, explain = one short Turkish explanation.`,
    gap: `${count} fill-in-the-gap sentences. Each: sentence with exactly one ___, answers = list of accepted answers (usually 1-2 words; include contractions as alternatives), hint = base verb in parentheses like "(go)" or a short Turkish hint, explain = short Turkish explanation.`,
    order: `${count} sentences for a word-ordering game, 4-10 words each, with natural Turkish translations (tr).`
  }[kind]
  return [
    `Create grammar practice for a Turkish-speaking learner. Topic: "${topicTitle}" (${topicSubtitle}).`,
    what,
    'Every item must clearly practise this topic. Vary subjects and sentence types (positive, negative, question where relevant). Make sure there is exactly one correct answer.',
    grammarVocabNote(words)
  ].join('\n')
}

export function grammarCheckPrompt(topicTitle: string, task: string, answer: string): string {
  return [
    `A Turkish-speaking learner did a writing homework for the grammar topic "${topicTitle}".`,
    `Task (Turkish): ${task}`,
    `Learner's answer: """${answer}"""`,
    'Return: score (0-100, how well they used the topic correctly), corrected (the full corrected text, keep their ideas and simple words), mistakes (each with original, corrected, explanationTr), feedbackTr (2-3 encouraging sentences in Turkish about how they used the topic).',
    VOCAB_RULE
  ].join('\n')
}

export function grammarTopicPrompt(title: string): string {
  return [
    `Create a complete grammar lesson in TURKISH for a Turkish-speaking English learner on: "${title}".`,
    'Fields: title (Turkish), subtitle (English grammar name), level (CEFR like "A2"), emoji (one emoji), summary (1-2 Turkish sentences), formula (2-4 short structure lines), sections (2-3 sections: heading, body lines in Turkish; lines starting with "• " are bullets, **bold** allowed; examples with en/tr), tips (1-3 Turkish tips),',
    'choice (8 multiple-choice: prompt with ___, 4 options, answer index, explain in Turkish), gaps (8: sentence with one ___, answers list, hint, explain), orders (4: sentence, tr), truefalse (6: sentence, correct boolean, fix = corrected sentence if wrong else empty, explain), pairs (6-8 matching pairs left/right), homework (2: task in Turkish, sample answer in English).',
    'Use only very simple A1 vocabulary in examples so the focus stays on grammar.'
  ].join('\n')
}
