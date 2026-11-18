import type { Api } from '../../../main/api'
import type { Bridge } from '../../../preload'

declare global {
  interface Window {
    bridge: Bridge
  }
}

type Promisified<T> = {
  [K in keyof T]: T[K] extends (...a: infer A) => infer R ? (...a: A) => Promise<Awaited<R>> : never
}

function cleanError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e)
  return new Error(msg.replace(/^Error invoking remote method 'api':\s*(Error:\s*)?/, ''))
}

export const api = new Proxy(
  {},
  {
    get:
      (_t, name: string) =>
      async (...args: unknown[]) => {
        try {
          return await window.bridge.call(name, ...args)
        } catch (e) {
          throw cleanError(e)
        }
      }
  }
) as Promisified<Api>

export const onEvent = (...a: Parameters<Bridge['on']>) => window.bridge.on(...a)
