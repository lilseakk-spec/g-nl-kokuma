// Electron ana süreç: pencereler, sistem tepsisi, bildirimler, zamanlayıcı, otomatik başlatma.
import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, powerMonitor, screen, shell } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import Database from 'better-sqlite3'
import { Repo } from './repo'
import { Ai } from './ai'
import { Secrets, loadEnvKey } from './secrets'
import { createApi, type Api } from './api'
import { notify, parseActionUrl, PROTOCOL } from './notifier'
import { nativeTts } from './nativeTts'
import { tick, SNOOZE_MS, type SchedEvent, type SchedulerState } from '@shared/schedule'
import {
  duePayload,
  focusDonePayload,
  miniPayload,
  morningPayload,
  streakPayload,
  weeklyPayload,
  type NotifyPayload
} from '@shared/notifyContent'
import type { Settings } from '@shared/types'

// Alarm sesleri kullanıcı etkileşimi olmadan da çalabilsin
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// İsteğe bağlı: veri klasörünü başka bir yere taşı (ör. disk doluysa)
// (ortam değişkeni KELIME_DATA_DIR veya kısayol argümanı --data-dir="D:\...")
const dataDirArg = process.argv.find((a) => a.startsWith('--data-dir='))?.slice('--data-dir='.length).replace(/^"|"$/g, '')
const customDataDir = dataDirArg || process.env.KELIME_DATA_DIR
if (customDataDir) app.setPath('userData', customDataDir)
// Sadece geliştirme: otomatik arayüz testleri için DevTools portu
if (!app.isPackaged && process.env.KELIME_DEBUG_PORT) app.commandLine.appendSwitch('remote-debugging-port', process.env.KELIME_DEBUG_PORT)

const startHidden = process.argv.includes('--hidden')
let mainWin: BrowserWindow | null = null
let alarmWin: BrowserWindow | null = null
let miniWin: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let repo: Repo
let api: Api
let focusTimer: NodeJS.Timeout | null = null
let focusEnd: number | null = null
let schedTimer: NodeJS.Timeout | null = null

// ---------- tek örnek + protokol ----------
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

if (process.defaultApp) {
  // geliştirme modu: electron.exe <uygulama yolu> <url>
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [app.getAppPath()])
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

app.on('second-instance', (_e, argv) => {
  const url = argv.find((a) => a.startsWith(`${PROTOCOL}://`))
  if (url) handleProtocolUrl(url)
  else showMain()
})
app.on('open-url', (e, url) => {
  e.preventDefault()
  handleProtocolUrl(url)
})

// ---------- pencereler ----------
function rendererUrl(hash: string): { url?: string; file?: string; hash: string } {
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) return { url: `${process.env.ELECTRON_RENDERER_URL}#${hash}`, hash }
  return { file: join(__dirname, '../renderer/index.html'), hash }
}

function load(win: BrowserWindow, hash: string): void {
  const r = rendererUrl(hash)
  if (r.url) win.loadURL(r.url)
  else win.loadFile(r.file!, { hash: r.hash })
}

function iconPath(): string {
  const candidates = [join(process.resourcesPath ?? '', 'icon.png'), join(app.getAppPath(), 'build/icon.png'), join(__dirname, '../../build/icon.png')]
  return candidates.find((p) => existsSync(p)) ?? ''
}

function trayIconPath(): string {
  const name = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'
  const candidates = [join(process.resourcesPath ?? '', name), join(app.getAppPath(), 'build', name), join(__dirname, '../../build', name)]
  return candidates.find((p) => existsSync(p)) ?? iconPath()
}

const webPrefs = () => ({
  preload: join(__dirname, '../preload/index.js'),
  sandbox: true,
  contextIsolation: true,
  backgroundThrottling: false
})

function createMain(): void {
  mainWin = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 880,
    minHeight: 600,
    show: false,
    title: 'Kelime Defterim',
    icon: iconPath() || undefined,
    autoHideMenuBar: true,
    backgroundColor: '#0f1115',
    webPreferences: webPrefs()
  })
  mainWin.setMenuBarVisibility(false)
  load(mainWin, '/')
  mainWin.once('ready-to-show', () => {
    if (!startHidden) mainWin?.show()
  })
  mainWin.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    mainWin?.hide()
    if (!repo.kvGet('trayHintShown', false)) {
      repo.kvSet('trayHintShown', true)
      notify(
        { title: 'Kelime Defterim çalışmaya devam ediyor', body: 'Hatırlatmalar için sistem tepsisinde açık kalıyorum. Kapatmak için tepsi menüsünden "Çıkış".', route: '/' },
        handleAction,
        { silent: true }
      )
    }
  })
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
}

function showMain(route?: string): void {
  if (!mainWin || mainWin.isDestroyed()) createMain()
  if (route) mainWin!.webContents.send('navigate', route)
  if (mainWin!.isMinimized()) mainWin!.restore()
  mainWin!.show()
  mainWin!.focus()
}

function popup(kind: 'alarm' | 'mini', hash: string, w: number, h: number): BrowserWindow {
  const existing = kind === 'alarm' ? alarmWin : miniWin
  if (existing && !existing.isDestroyed()) {
    load(existing, hash)
    existing.show()
    existing.focus()
    return existing
  }
  const area = screen.getPrimaryDisplay().workArea
  const win = new BrowserWindow({
    width: w,
    height: h,
    x: area.x + area.width - w - 24,
    y: area.y + area.height - h - 24,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    title: kind === 'alarm' ? 'Alarm' : 'Mini tekrar',
    icon: iconPath() || undefined,
    backgroundColor: '#0f1115',
    webPreferences: webPrefs()
  })
  load(win, hash)
  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })
  if (kind === 'alarm') {
    alarmWin = win
    win.on('closed', () => (alarmWin = null))
  } else {
    miniWin = win
    win.on('closed', () => (miniWin = null))
  }
  return win
}

// ---------- bildirim eylemleri ----------
function handleAction(action: string, p: NotifyPayload): void {
  switch (action) {
    case 'snooze':
      snooze()
      break
    case 'start':
      alarmWin?.close()
      showMain('/study')
      break
    case 'reveal':
      if (p.itemId) popup('mini', `/mini/${p.itemId}?reveal=1`, 400, 340)
      break
    case 'listen':
      if (p.itemId) popup('mini', `/mini/${p.itemId}?speak=1`, 400, 340)
      break
    default:
      if (p.route.startsWith('/mini/')) popup('mini', p.route, 400, 340)
      else if (p.route.startsWith('/alarm')) popup('alarm', p.route, 400, 300)
      else showMain(p.route)
  }
}

function handleProtocolUrl(url: string): void {
  const a = parseActionUrl(url)
  if (!a) return
  handleAction(a.action, { title: '', body: '', route: a.route, itemId: a.itemId })
}

function snooze(): void {
  const st = repo.kvGet<SchedulerState>('scheduler', {})
  st.snoozeUntil = Date.now() + SNOOZE_MS
  repo.kvSet('scheduler', st)
  alarmWin?.close()
}

// ---------- zamanlayıcı ----------
function fire(ev: SchedEvent): void {
  const s = repo.getSettings()
  switch (ev) {
    case 'intake': {
      const ids = repo.dailyIntake(s.dailyIntake.count, s.dailyIntake.order)
      if (ids.length) broadcast('data-changed')
      break
    }
    case 'morning':
    case 'snooze': {
      const t = repo.todayTask()
      const p = morningPayload(t.due, t.fresh)
      notify(p, handleAction, { silent: true })
      popup('alarm', '/alarm?type=morning', 400, 300)
      break
    }
    case 'due': {
      const n = repo.dueCount()
      if (n > 0) notify(duePayload(n), handleAction)
      break
    }
    case 'mini': {
      const item = repo.pickMiniItem()
      if (item) notify(miniPayload(item), handleAction)
      break
    }
    case 'streak':
      notify(streakPayload(repo.streak()), handleAction)
      break
    case 'weekly':
      notify(weeklyPayload(repo.weeklySummary()), handleAction)
      break
  }
}

function runScheduler(): void {
  try {
    const now = Date.now()
    const s = repo.getSettings()
    const prev = repo.kvGet<SchedulerState>('scheduler', {})
    const res = tick(now, s, prev, {
      learningCount: repo.learningCount(),
      dueCount: repo.dueCount(now),
      studiedToday: repo.studiedToday(now),
      streak: repo.streak(now)
    })
    repo.kvSet('scheduler', res.state)
    for (const ev of res.events) fire(ev)
    updateTray()
  } catch (e) {
    console.error('Zamanlayıcı hatası', e)
  }
}

function startScheduler(): void {
  schedTimer && clearInterval(schedTimer)
  schedTimer = setInterval(runScheduler, 30_000)
  setTimeout(runScheduler, 3000)
  // Uykudan uyanınca kaçırılan görevleri hemen değerlendir
  powerMonitor.on('resume', () => setTimeout(runScheduler, 2000))
  powerMonitor.on('unlock-screen', () => setTimeout(runScheduler, 1000))
}

// ---------- odak modu ----------
function startFocus(minutes: number): number {
  stopFocus()
  focusEnd = Date.now() + minutes * 60_000
  focusTimer = setTimeout(() => {
    focusEnd = null
    focusTimer = null
    repo.recordEvent('focus')
    notify(focusDonePayload(minutes), handleAction, { silent: true })
    popup('alarm', '/alarm?type=focus', 400, 300)
    broadcast('focus-changed')
  }, minutes * 60_000)
  broadcast('focus-changed')
  updateTray()
  return focusEnd
}

function stopFocus(): void {
  if (focusTimer) clearTimeout(focusTimer)
  focusTimer = null
  focusEnd = null
  broadcast('focus-changed')
}

// ---------- test bildirimi ----------
function testNotification(kind: string): string {
  const t = repo.todayTask()
  switch (kind) {
    case 'morning':
      notify(morningPayload(t.due, t.fresh), handleAction, { silent: true })
      popup('alarm', '/alarm?type=morning', 400, 300)
      return 'Sabah alarmı gönderildi.'
    case 'due':
      notify(duePayload(Math.max(1, repo.dueCount())), handleAction)
      return 'Tekrar hatırlatması gönderildi.'
    case 'mini': {
      const item = repo.pickMiniItem()
      if (!item) return '"Öğreniyorum" listende kelime yok; mini tekrar bildirimi gönderilmedi.'
      notify(miniPayload(item), handleAction)
      return 'Mini tekrar bildirimi gönderildi.'
    }
    case 'streak':
      notify(streakPayload(Math.max(1, repo.streak())), handleAction)
      return 'Seri uyarısı gönderildi.'
    case 'weekly':
      notify(weeklyPayload(repo.weeklySummary()), handleAction)
      return 'Haftalık özet gönderildi.'
    default:
      notify({ title: 'Test bildirimi ✅', body: 'Bildirimler çalışıyor. Tıklarsan uygulama açılır.', route: '/settings' }, handleAction)
      return 'Test bildirimi gönderildi.'
  }
}

// ---------- otomatik başlatma ----------
function applyAutoStart(s: Settings): void {
  if (!app.isPackaged) return // geliştirme modunda sisteme kayıt yapılmaz
  if (process.platform === 'linux') {
    const dir = join(homedir(), '.config', 'autostart')
    const file = join(dir, 'kelime-defterim.desktop')
    if (s.autoStart) {
      mkdirSync(dir, { recursive: true })
      const exec = process.env.APPIMAGE ?? process.execPath
      writeFileSync(
        file,
        `[Desktop Entry]\nType=Application\nName=Kelime Defterim\nExec="${exec}" --hidden${dataDirArg ? ` "--data-dir=${dataDirArg}"` : ''}\nX-GNOME-Autostart-enabled=true\n`
      )
    } else if (existsSync(file)) rmSync(file)
    return
  }
  app.setLoginItemSettings({ openAtLogin: s.autoStart, args: ['--hidden', ...(dataDirArg ? [`--data-dir=${dataDirArg}`] : [])] })
}

// ---------- tepsi ----------
function updateTray(): void {
  if (!tray) return
  const due = repo.dueCount()
  tray.setToolTip(due ? `Kelime Defterim — ${due} tekrar bekliyor` : 'Kelime Defterim')
  const focusLeft = focusEnd ? Math.max(0, Math.ceil((focusEnd - Date.now()) / 60_000)) : 0
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Kelime Defterim’i aç', click: () => showMain('/') },
      { label: '+ Kelime ekle', click: () => showMain('/?add=1') },
      { label: due ? `Çalış (${due} tekrar)` : 'Çalış', click: () => showMain('/study') },
      { type: 'separator' },
      focusEnd
        ? { label: `Odak modunu durdur (${focusLeft} dk kaldı)`, click: () => stopFocus() }
        : { label: `Odak modu (${repo.getSettings().focusMinutes} dk)`, click: () => startFocus(repo.getSettings().focusMinutes) },
      { label: 'Test bildirimi gönder', click: () => testNotification('test') },
      { type: 'separator' },
      {
        label: 'Çıkış',
        click: () => {
          quitting = true
          app.quit()
        }
      }
    ])
  )
}

function createTray(): void {
  const p = trayIconPath()
  let img = p ? nativeImage.createFromPath(p) : nativeImage.createEmpty()
  if (process.platform !== 'darwin' && !img.isEmpty()) img = img.resize({ width: 16, height: 16 })
  tray = new Tray(img)
  tray.on('click', () => showMain())
  tray.on('double-click', () => showMain())
  updateTray()
}

function broadcast(channel: string, ...args: unknown[]): void {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(channel, ...args)
}

// ---------- başlat ----------
app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId(app.isPackaged ? 'com.kelimedefterim.app' : process.execPath)
  Menu.setApplicationMenu(null)

  const dataDir = app.getPath('userData')
  mkdirSync(dataDir, { recursive: true })
  repo = new Repo(new Database(join(dataDir, 'kelime-defterim.db')))
  loadEnvKey()
  const secrets = new Secrets(repo)
  const ai = new Ai(
    () => secrets.getKey(),
    () => repo.getSettings().ai.model,
    () => repo.getSettings().ai.provider,
    join(dataDir, 'claude-calls')
  )

  api = createApi({
    repo,
    ai,
    secrets,
    onSettingsChanged: (s) => {
      applyAutoStart(s)
      broadcast('settings-changed', s)
      updateTray()
    },
    testNotification,
    startFocus,
    stopFocus,
    focusEndsAt: () => focusEnd,
    snooze,
    showMain,
    closeSender: (w) => w?.close(),
    dataChanged: () => {
      broadcast('data-changed')
      updateTray()
    }
  })

  ipcMain.handle('api', async (e, name: string, ...args: unknown[]) => {
    const fn = (api as Record<string, unknown>)[name]
    if (typeof fn !== 'function') throw new Error(`Bilinmeyen işlem: ${name}`)
    if (name === 'closeWindow') return api.closeWindow(BrowserWindow.fromWebContents(e.sender))
    try {
      return await (fn as (...a: unknown[]) => unknown)(...args)
    } catch (err) {
      // Hata mesajını Türkçe ve sade ilet
      throw new Error(err instanceof Error ? err.message : String(err))
    }
  })

  createMain()
  createTray()
  applyAutoStart(repo.getSettings())
  startScheduler()
  nativeTts.warm()

  const url = process.argv.find((a) => a.startsWith(`${PROTOCOL}://`))
  if (url) setTimeout(() => handleProtocolUrl(url), 1500)

  app.on('activate', () => showMain())
})

app.on('before-quit', () => {
  quitting = true
  nativeTts.stop()
})

// Tüm pencereler kapansa da tepside çalışmaya devam et
app.on('window-all-closed', () => {
  /* çıkma */
})
