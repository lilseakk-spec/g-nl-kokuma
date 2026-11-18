// Renderer'a açılan API. Her metod ipcMain.handle('api', name, ...args) ile çağrılır.
import { app, dialog, shell, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import type { Repo } from './repo'
import type { Ai } from './ai'
import type { Secrets } from './secrets'
import type {
  AppInfo,
  ChatMessage,
  ItemDraft,
  ItemFilter,
  ItemStatus,
  Rating,
  Settings
} from '@shared/types'
import { parseCsv, rowsToImport, splitMeanings, normalizeTerm } from '@shared/text'
import { dayKey } from '@shared/schedule'
import { nativeTts } from './nativeTts'

export interface ApiDeps {
  repo: Repo
  ai: Ai
  secrets: Secrets
  onSettingsChanged: (s: Settings) => void
  testNotification: (kind: string) => string
  startFocus: (minutes: number) => number
  stopFocus: () => void
  focusEndsAt: () => number | null
  snooze: () => void
  showMain: (route?: string) => void
  closeSender: (win: BrowserWindow | null) => void
  dataChanged: () => void
}

export function createApi(d: ApiDeps) {
  const { repo, ai, secrets } = d
  const changed = <T>(v: T): T => {
    d.dataChanged()
    return v
  }

  return {
    // ---- uygulama ----
    info(): AppInfo {
      return {
        platform: process.platform,
        version: app.getVersion(),
        userData: app.getPath('userData'),
        hasApiKey: ai.available(),
        apiKeySource: secrets.source(),
        encryptionAvailable: secrets.encryptionAvailable()
      }
    },
    getSettings: () => repo.getSettings(),
    saveSettings(patch: Partial<Settings>) {
      const s = repo.saveSettings(patch)
      d.onSettingsChanged(s)
      return s
    },
    setApiKey(key: string) {
      secrets.setKey(key)
      return { hasApiKey: ai.available(), source: secrets.source() }
    },
    testApiKey: () => ai.testKey(),
    openDataFolder: () => shell.openPath(app.getPath('userData')),
    showMain: (route?: string) => d.showMain(route),
    closeWindow: (win: BrowserWindow | null) => d.closeSender(win),

    // ---- kartlar ----
    listItems: (f: ItemFilter) => repo.listItems(f),
    getItem: (id: number) => repo.getItem(id),
    findDuplicate: (term: string, excludeId?: number) => repo.findDuplicate(term, excludeId),
    findDuplicates(terms: string[]) {
      const all = repo.allTerms()
      return terms.map((t) => all.has(normalizeTerm(t)))
    },
    addItem: (draft: ItemDraft) => changed(repo.addItem(draft)),
    addMany: (drafts: ItemDraft[]) => changed(repo.addMany(drafts)),
    updateItem: (id: number, patch: Partial<ItemDraft>) => changed(repo.updateItem(id, patch)),
    deleteItems: (ids: number[]) => changed(repo.deleteItems(ids)),
    setStatus: (ids: number[], status: ItemStatus) => changed(repo.setStatus(ids, status)),
    setPaused: (ids: number[], paused: boolean) => changed(repo.setPaused(ids, paused)),
    resetProgress: (ids: number[]) => changed(repo.resetProgress(ids)),
    reorder: (ids: number[]) => changed(repo.reorder(ids)),

    // ---- listeler / etiketler ----
    getLists: () => repo.getLists(),
    createList: (name: string) => changed(repo.createList(name)),
    renameList: (id: number, name: string) => changed(repo.renameList(id, name)),
    deleteList: (id: number) => changed(repo.deleteList(id)),
    addToList: (ids: number[], listId: number) => changed(repo.addToList(ids, listId)),
    removeFromList: (ids: number[], listId: number) => changed(repo.removeFromList(ids, listId)),
    allTags: () => repo.allTags(),
    addTag: (ids: number[], tag: string) => changed(repo.addTag(ids, tag)),
    removeTag: (ids: number[], tag: string) => changed(repo.removeTag(ids, tag)),

    // ---- çalışma ----
    studyQueue: (opts: { listId?: number; tag?: string; kind?: 'word' | 'pattern'; limit?: number; ahead?: boolean }) =>
      repo.studyQueue(opts),
    review: (id: number, rating: Rating, mode: string) => changed(repo.review(id, rating, mode)),
    recordEvent: (kind: 'conversation' | 'focus' | 'perfect') => repo.recordEvent(kind),
    todayTask: () => repo.todayTask(),
    stats: () => repo.stats(),

    // ---- odak / alarm ----
    startFocus: (minutes: number) => d.startFocus(minutes),
    stopFocus: () => d.stopFocus(),
    focusEndsAt: () => d.focusEndsAt(),
    snooze: () => d.snooze(),
    testNotification: (kind: string) => d.testNotification(kind),

    // ---- yapay zekâ ----
    aiEnrich: (term: string, meaning?: string) => ai.enrich(term, meaning),
    aiChat: (scenarioId: string, targetIds: number[], history: ChatMessage[]) =>
      ai.chat(scenarioId, repo.getItems(targetIds), history),
    aiSummarize: (targetIds: number[], transcript: ChatMessage[]) => ai.summarize(repo.getItems(targetIds), transcript),
    aiPatternSituation: (id: number) => ai.patternSituation(repo.getItem(id)!),
    aiPatternCheck: (id: number, situation: string, answer: string) => ai.patternCheck(repo.getItem(id)!, situation, answer),

    // ---- içe/dışa aktarma ----
    async pickImportFile(): Promise<{ name: string; rows: ReturnType<typeof rowsToImport> } | null> {
      const r = await dialog.showOpenDialog({
        title: 'CSV veya Anki dosyası seç',
        filters: [{ name: 'CSV / Anki metin', extensions: ['csv', 'txt', 'tsv'] }],
        properties: ['openFile']
      })
      if (r.canceled || !r.filePaths[0]) return null
      const text = readFileSync(r.filePaths[0], 'utf-8')
      return { name: r.filePaths[0], rows: rowsToImport(parseCsv(text)) }
    },
    async exportBackup(): Promise<string | null> {
      const r = await dialog.showSaveDialog({
        title: 'Yedeği kaydet',
        defaultPath: `kelime-defterim-yedek-${dayKey(Date.now())}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (r.canceled || !r.filePath) return null
      writeFileSync(r.filePath, repo.exportJson(), 'utf-8')
      return r.filePath
    },
    async importBackup(): Promise<{ items: number } | null> {
      const r = await dialog.showOpenDialog({
        title: 'Yedekten geri yükle',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (r.canceled || !r.filePaths[0]) return null
      const res = repo.importJson(readFileSync(r.filePaths[0], 'utf-8'))
      d.onSettingsChanged(repo.getSettings())
      return changed(res)
    },
    async exportCsv(): Promise<string | null> {
      const r = await dialog.showSaveDialog({
        title: 'CSV olarak dışa aktar',
        defaultPath: `kelimelerim-${dayKey(Date.now())}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      })
      if (r.canceled || !r.filePath) return null
      const q = (s: string) => `"${s.replace(/"/g, '""')}"`
      const lines = ['term,meaning,example,example_tr,tags,status']
      for (const i of repo.listItems({ sort: 'added' }))
        lines.push(
          [i.term, i.meanings.join(', '), i.examples[0]?.en ?? '', i.examples[0]?.tr ?? '', i.tags.join(' '), i.status].map(q).join(',')
        )
      writeFileSync(r.filePath, '﻿' + lines.join('\n'), 'utf-8')
      return r.filePath
    },
    splitMeanings: (s: string) => splitMeanings(s),

    // ---- yerel İngilizce telaffuz (Web Speech'te İngilizce ses yoksa) ----
    nativeVoices: () => nativeTts.voices(),
    nativeSpeak: (text: string, rate: number, accent: string, voice: string) => nativeTts.speak(text, { rate, accent, voice }),
    nativeStop: () => nativeTts.stop()
  }
}

export type Api = ReturnType<typeof createApi>
