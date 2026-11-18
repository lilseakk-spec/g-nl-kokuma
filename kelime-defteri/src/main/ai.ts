// Claude API entegrasyonu (opsiyonel). Anahtar yoksa çağrılar kibar bir hata döndürür.
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { AiEnrichment, ChatMessage, ConversationSummary, Item, ModelId, PatternFeedback } from '@shared/types'
import {
  conversationSummaryPrompt,
  conversationSystem,
  enrichPrompt,
  patternCheckPrompt,
  situationPrompt,
  SCENARIOS,
  VOCAB_RULE,
  grammarCheckPrompt,
  grammarExercisePrompt,
  grammarTopicPrompt
} from '@shared/prompts'
import type { GQuestion, GrammarTopic } from '@shared/grammar/types'

export class AiUnavailableError extends Error {
  constructor() {
    super('Yapay zekâ özellikleri için Ayarlar ekranından Anthropic API anahtarı ekleyin.')
  }
}

const EnrichSchema = z.object({
  kind: z.enum(['word', 'pattern']),
  ipa: z.string(),
  pos: z.string(),
  meanings: z.array(z.string()),
  examples: z.array(z.object({ en: z.string(), tr: z.string() })),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  collocations: z.array(z.string()),
  cefr: z.string(),
  register: z.enum(['', 'formal', 'informal', 'neutral']),
  template: z.string(),
  usage: z.string()
})

const SummarySchema = z.object({
  summaryTr: z.string(),
  mistakes: z.array(z.object({ original: z.string(), corrected: z.string(), explanationTr: z.string() })),
  used: z.array(z.string()),
  unused: z.array(z.string())
})

const PatternSchema = z.object({
  correct: z.boolean(),
  usedPattern: z.boolean(),
  corrected: z.string(),
  explanationTr: z.string()
})

const SituationSchema = z.object({ situationTr: z.string() })

const ChoiceSchema = z.object({ prompt: z.string(), options: z.array(z.string()), answer: z.number().int(), explain: z.string() })
const GapSchema = z.object({ sentence: z.string(), answers: z.array(z.string()), hint: z.string(), explain: z.string() })
const OrderSchema = z.object({ sentence: z.string(), tr: z.string() })
const TfSchema = z.object({ sentence: z.string(), correct: z.boolean(), fix: z.string(), explain: z.string() })
const TestSet = z.object({ items: z.array(ChoiceSchema) })
const GapSet = z.object({ items: z.array(GapSchema) })
const OrderSet = z.object({ items: z.array(OrderSchema) })
const GrammarCheckSchema = z.object({
  score: z.number(),
  corrected: z.string(),
  mistakes: z.array(z.object({ original: z.string(), corrected: z.string(), explanationTr: z.string() })),
  feedbackTr: z.string()
})
const TopicSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  level: z.string(),
  emoji: z.string(),
  summary: z.string(),
  formula: z.array(z.string()),
  sections: z.array(z.object({ heading: z.string(), body: z.array(z.string()), examples: z.array(z.object({ en: z.string(), tr: z.string() })) })),
  tips: z.array(z.string()),
  choice: z.array(ChoiceSchema),
  gaps: z.array(GapSchema),
  orders: z.array(OrderSchema),
  truefalse: z.array(TfSchema),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  homework: z.array(z.object({ task: z.string(), sample: z.string() }))
})

export type GrammarCheck = z.infer<typeof GrammarCheckSchema>

const validChoice = (q: z.infer<typeof ChoiceSchema>) => q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length
const validGap = (q: z.infer<typeof GapSchema>) => q.sentence.split('___').length === 2 && q.answers.some((a) => a.trim())

function friendlyError(e: unknown): Error {
  if (e instanceof AiUnavailableError) return e
  if (e instanceof Anthropic.AuthenticationError) return new Error('API anahtarı geçersiz görünüyor. Ayarlar ekranından kontrol edin.')
  if (e instanceof Anthropic.PermissionDeniedError) return new Error('Bu API anahtarının seçili modele erişimi yok.')
  if (e instanceof Anthropic.NotFoundError) return new Error('Seçili model bulunamadı. Ayarlardan başka bir model deneyin.')
  if (e instanceof Anthropic.RateLimitError) return new Error('Çok fazla istek gönderildi; biraz sonra tekrar deneyin.')
  if (e instanceof Anthropic.APIConnectionError) return new Error('İnternet bağlantısı kurulamadı. Yapay zekâ özellikleri şu an kullanılamıyor.')
  if (e instanceof Anthropic.APIError) return new Error(`Yapay zekâ hatası (${e.status ?? '?'}): ${e.message}`)
  return e instanceof Error ? e : new Error(String(e))
}

export class Ai {
  private client: Anthropic | null = null
  private key = ''

  constructor(
    private getKey: () => string,
    private getModel: () => ModelId
  ) {}

  available(): boolean {
    return !!this.getKey()
  }

  private c(): Anthropic {
    const key = this.getKey()
    if (!key) throw new AiUnavailableError()
    if (!this.client || key !== this.key) {
      this.client = new Anthropic({ apiKey: key, maxRetries: 2, timeout: 60_000 })
      this.key = key
    }
    return this.client
  }

  private async parse<T extends z.ZodType>(schema: T, system: string, user: string, maxTokens = 2000): Promise<z.infer<T>> {
    try {
      const res = await this.c().messages.parse({
        model: this.getModel(),
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
        output_config: { effort: 'low', format: zodOutputFormat(schema) }
      })
      if (res.stop_reason === 'refusal') throw new Error('Yapay zekâ bu isteği yanıtlamadı.')
      if (!res.parsed_output) throw new Error('Yapay zekâ yanıtı okunamadı; tekrar deneyin.')
      return res.parsed_output as z.infer<T>
    } catch (e) {
      throw friendlyError(e)
    }
  }

  async testKey(): Promise<string> {
    try {
      const res = await this.c().messages.create({
        model: this.getModel(),
        max_tokens: 50,
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: 'Reply with the single word: OK' }]
      })
      const t = res.content.find((b) => b.type === 'text')
      return t && t.type === 'text' ? t.text.trim() : 'OK'
    } catch (e) {
      throw friendlyError(e)
    }
  }

  /** Tek kelime için alanları doldurur. Sonuç KART OLUŞTURMAZ; kullanıcı onaylayıp kaydeder. */
  async enrich(term: string, meaning?: string): Promise<AiEnrichment> {
    const r = await this.parse(
      EnrichSchema,
      'You are a concise English-Turkish dictionary assistant. Output only the requested fields.',
      enrichPrompt(term, meaning)
    )
    return {
      ...r,
      meanings: meaning ? [meaning, ...r.meanings.filter((m) => m.toLowerCase() !== meaning.toLowerCase())].slice(0, 4) : r.meanings,
      examples: r.examples.slice(0, 2),
      synonyms: r.synonyms.slice(0, 4),
      antonyms: r.antonyms.slice(0, 4),
      collocations: r.collocations.slice(0, 4)
    }
  }

  async chat(scenarioId: string, targets: Item[], history: ChatMessage[]): Promise<string> {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId)?.en ?? scenarioId
    const messages: Anthropic.MessageParam[] = history.length
      ? history.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: 'user', content: '(The learner is ready. Start the role-play with a short greeting and a question.)' }]
    if (messages[0].role === 'assistant') messages.unshift({ role: 'user', content: '(Start the role-play.)' })
    try {
      const res = await this.c().messages.create({
        model: this.getModel(),
        max_tokens: 1000,
        system: conversationSystem(scenario, targets),
        output_config: { effort: 'low' },
        messages
      })
      if (res.stop_reason === 'refusal') throw new Error('Yapay zekâ bu mesaja yanıt vermedi.')
      return res.content
        .filter((b) => b.type === 'text')
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('\n')
        .trim()
    } catch (e) {
      throw friendlyError(e)
    }
  }

  async summarize(targets: Item[], transcript: ChatMessage[]): Promise<ConversationSummary> {
    const allowed = new Set(targets.map((t) => t.term))
    const r = await this.parse(
      SummarySchema,
      'You are a kind English teacher writing feedback in Turkish for a Turkish-speaking learner.',
      conversationSummaryPrompt(targets, transcript),
      3000
    )
    // Güvenlik: listede olmayan "kelime" asla döndürülmez
    return { ...r, used: r.used.filter((t) => allowed.has(t)), unused: r.unused.filter((t) => allowed.has(t)) }
  }

  async patternSituation(item: Item): Promise<string> {
    const r = await this.parse(SituationSchema, `You write short practice situations in Turkish. ${VOCAB_RULE}`, situationPrompt(item), 500)
    return r.situationTr
  }

  async patternCheck(item: Item, situation: string, answer: string): Promise<PatternFeedback> {
    return this.parse(
      PatternSchema,
      'You are a kind English teacher. Explanations must be in Turkish.',
      patternCheckPrompt(item, situation, answer),
      1200
    )
  }

  // ---------- konu tekrarı ----------
  async grammarExercises(topic: GrammarTopic, kind: 'test' | 'gap' | 'order', words: Item[], count = 8): Promise<GQuestion[]> {
    const system = 'You are an expert English teacher who writes accurate grammar exercises for Turkish speakers.'
    const prompt = grammarExercisePrompt(topic.title, topic.subtitle, kind, count, words)
    if (kind === 'test') {
      const r = await this.parse(TestSet, system, prompt, 4000)
      return r.items.filter(validChoice).map((q) => ({ type: 'choice' as const, ...q }))
    }
    if (kind === 'gap') {
      const r = await this.parse(GapSet, system, prompt, 4000)
      return r.items.filter(validGap).map((q) => ({ type: 'gap' as const, ...q, hint: q.hint || undefined }))
    }
    const r = await this.parse(OrderSet, system, prompt, 3000)
    return r.items.filter((q) => q.sentence.split(' ').length >= 3).map((q) => ({ type: 'order' as const, ...q }))
  }

  async grammarCheck(topic: GrammarTopic, task: string, answer: string): Promise<GrammarCheck> {
    return this.parse(GrammarCheckSchema, 'You are a kind English teacher. All explanations must be in Turkish.', grammarCheckPrompt(topic.title, task, answer), 3000)
  }

  /** Yeni konu: tam ders + alıştırmalar üretir */
  async grammarTopic(title: string): Promise<GrammarTopic> {
    const r = await this.parse(TopicSchema, 'You are an expert English teacher writing clear Turkish grammar lessons.', grammarTopicPrompt(title), 12000)
    return {
      id: 'custom-' + Date.now().toString(36),
      title: r.title || title,
      subtitle: r.subtitle,
      level: r.level,
      emoji: r.emoji || '📘',
      summary: r.summary,
      formula: r.formula,
      sections: r.sections,
      tips: r.tips,
      questions: [
        ...r.choice.filter(validChoice).map((q) => ({ type: 'choice' as const, ...q })),
        ...r.gaps.filter(validGap).map((q) => ({ type: 'gap' as const, ...q })),
        ...r.orders.map((q) => ({ type: 'order' as const, ...q })),
        ...r.truefalse.map((q) => ({ type: 'tf' as const, ...q, fix: q.fix || undefined }))
      ],
      pairs: r.pairs,
      homework: r.homework,
      custom: true
    }
  }
}
