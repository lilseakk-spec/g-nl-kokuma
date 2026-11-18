import { contextBridge, ipcRenderer } from 'electron'

const bridge = {
  call: (name: string, ...args: unknown[]) => ipcRenderer.invoke('api', name, ...args),
  on: (channel: 'navigate' | 'data-changed' | 'settings-changed' | 'focus-changed', cb: (...args: unknown[]) => void) => {
    const fn = (_e: unknown, ...args: unknown[]) => cb(...args)
    ipcRenderer.on(channel, fn)
    return () => ipcRenderer.removeListener(channel, fn)
  },
  platform: process.platform
}

contextBridge.exposeInMainWorld('bridge', bridge)

export type Bridge = typeof bridge
