type Result = { id: number; ipa?: string; error?: string }

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, { resolve: (ipa: string) => void; reject: (error: Error) => void }>()
const cache = new Map<string, Promise<string>>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./ipa.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<Result>) => {
      const { id, ipa, error } = event.data
      const request = pending.get(id)
      if (!request) return
      pending.delete(id)
      if (error) request.reject(new Error(error))
      else if (ipa) request.resolve(ipa)
      else request.reject(new Error('No pronunciation was returned'))
    }
    worker.onerror = () => {
      for (const request of pending.values()) request.reject(new Error('Pronunciation engine could not start'))
      pending.clear()
      worker?.terminate()
      worker = null
    }
  }
  return worker
}

export function frenchIpa(text: string): Promise<string> {
  const clean = text.trim()
  if (!clean) return Promise.reject(new Error('Enter French text first'))
  const existing = cache.get(clean)
  if (existing) return existing
  const promise = new Promise<string>((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    try { getWorker().postMessage({ id, text: clean }) }
    catch (error) {
      pending.delete(id)
      reject(error)
    }
  }).catch((error: unknown) => {
    cache.delete(clean)
    throw error
  })
  cache.set(clean, promise)
  return promise
}
