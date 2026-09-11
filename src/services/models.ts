import { openDB } from 'idb'

export type EngineId = 'system' | 'piper' | 'supertonic'
export type ModelState = 'available' | 'installing' | 'installed' | 'error'
export type ModelDefinition = {
  id: Exclude<EngineId, 'system'>
  name: string
  detail: string
  size: number
  state: ModelState
  progress: number
}

export type EngineVoice = { id: string; name: string; detail: string }

const DB_NAME = 'moshi-french-tts-pwa-models'
const STORE = 'packages'
const MODEL_VERSION = 2
const SUPERTONIC_REVISION = 'aafc6e32416a594460b32413efc49d7fe4ce6d46'
export const SUPERTONIC_BASE_URL = `https://huggingface.co/supertone-oss-archive/supertonic-3/resolve/${SUPERTONIC_REVISION}`
const SUPERTONIC_CACHE = 'moshi-supertonic-3-assets-v1'
const SUPERTONIC_ASSETS = [
  ['onnx/duration_predictor.onnx', 3_700_147],
  ['onnx/text_encoder.onnx', 36_416_150],
  ['onnx/vector_estimator.onnx', 256_534_781],
  ['onnx/vocoder.onnx', 101_424_195],
  ['onnx/tts.json', 8_253],
  ['onnx/unicode_indexer.json', 277_676],
  ...['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'].map(id => [`voice_styles/${id}.json`, 292_000] as const),
] as const

async function database() {
  return openDB(DB_NAME, 1, { upgrade(db) { db.createObjectStore(STORE) } })
}

async function ensureSupertonicStorage(requiredBytes: number) {
  try { await navigator.storage?.persist?.() } catch { /* persistent storage is best-effort */ }
  const estimate = await navigator.storage?.estimate?.()
  const available = (estimate?.quota ?? 0) - (estimate?.usage ?? 0)
  if (estimate?.quota && available < requiredBytes) {
    const availableMb = Math.floor(available / 1024 / 1024)
    throw new Error(`Supertonic HD needs about 401 MB of free browser storage. Only ${availableMb} MB is available. Free some space, then retry.`)
  }
}

export async function installedModels(): Promise<string[]> {
  const db = await database()
  const keys = (await db.getAllKeys(STORE)).map(String)
  const valid: string[] = []
  for (const id of keys) {
    const record = await db.get(STORE, id)
    if (record?.version !== MODEL_VERSION) continue
    if (id === 'piper') {
      const { stored } = await import('@mintplex-labs/piper-tts-web')
      if ((await stored()).includes('fr_FR-siwis-medium')) valid.push(id)
    }
    if (id === 'supertonic') {
      const cache = await caches.open(SUPERTONIC_CACHE)
      const ready = await Promise.all(SUPERTONIC_ASSETS.map(([path]) => cache.match(`${SUPERTONIC_BASE_URL}/${path}`)))
      if (ready.every(Boolean)) valid.push(id)
    }
  }
  return valid
}

export async function markInstalled(id: string) {
  const db = await database()
  await db.put(STORE, { installedAt: Date.now(), version: MODEL_VERSION }, id)
}

export async function installModel(id: Exclude<EngineId, 'system'>, onProgress: (progress: number) => void) {
  if (id === 'piper') {
    const { download } = await import('@mintplex-labs/piper-tts-web')
    await download('fr_FR-siwis-medium', item => onProgress(item.total ? (item.loaded / item.total) * 100 : 0))
  } else {
    const cache = await caches.open(SUPERTONIC_CACHE)
    const total = SUPERTONIC_ASSETS.reduce((sum, [, size]) => sum + size, 0)
    await ensureSupertonicStorage(total)
    let completed = 0
    for (const [path, expectedSize] of SUPERTONIC_ASSETS) {
      const url = `${SUPERTONIC_BASE_URL}/${path}`
      const existing = await cache.match(url)
      if (existing) { completed += expectedSize; onProgress((completed / total) * 100); continue }
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Could not download ${path} (${response.status})`)
      const reader = response.body?.getReader()
      if (!reader) {
        await cache.put(url, response)
        completed += expectedSize
      } else {
        // Cache the cloned stream while reading the original stream for progress.
        // This avoids holding the 256 MB vector model in JavaScript memory.
        const cacheWrite = cache.put(url, response.clone())
        let received = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          received += value.byteLength
          onProgress(((completed + Math.min(received, expectedSize)) / total) * 100)
        }
        try {
          await cacheWrite
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'browser storage rejected the file'
          throw new Error(`Could not save ${path}: ${reason}`)
        }
        completed += expectedSize
      }
    }
  }
  await markInstalled(id)
  onProgress(100)
}

export async function uninstallModel(id: string) {
  if (id === 'piper') {
    const { remove } = await import('@mintplex-labs/piper-tts-web')
    await remove('fr_FR-siwis-medium')
  }
  if (id === 'supertonic') await caches.delete(SUPERTONIC_CACHE)
  const db = await database()
  await db.delete(STORE, id)
}

export function estimateStorage() {
  return navigator.storage?.estimate?.() ?? Promise.resolve({ usage: 0, quota: 0 })
}

export const MODEL_CATALOG: ModelDefinition[] = [
  { id: 'piper', name: 'Piper · French', detail: 'Fast, compact ONNX voice for offline use', size: 64, state: 'available', progress: 0 },
  { id: 'supertonic', name: 'Supertonic HD', detail: 'Ten voice styles · WebGPU with WASM fallback', size: 401, state: 'available', progress: 0 },
]

export const ENGINE_VOICES: Record<Exclude<EngineId, 'system'>, EngineVoice[]> = {
  piper: [
    { id: 'fr_FR-siwis-medium', name: 'Siwis', detail: 'French · medium' },
  ],
  supertonic: [
    { id: 'F1', name: 'F1', detail: 'female voice style' },
    { id: 'F2', name: 'F2', detail: 'female voice style' },
    { id: 'F3', name: 'F3', detail: 'female voice style' },
    { id: 'F4', name: 'F4', detail: 'female voice style' },
    { id: 'F5', name: 'F5', detail: 'female voice style' },
    { id: 'M1', name: 'M1', detail: 'male voice style' },
    { id: 'M2', name: 'M2', detail: 'male voice style' },
    { id: 'M3', name: 'M3', detail: 'male voice style' },
    { id: 'M4', name: 'M4', detail: 'male voice style' },
    { id: 'M5', name: 'M5', detail: 'male voice style' },
  ],
}

export function voicesForEngine(engine: EngineId, systemVoices: SpeechSynthesisVoice[]): EngineVoice[] {
  if (engine === 'system') return systemVoices.map(item => ({ id: item.voiceURI, name: item.name, detail: item.lang }))
  return ENGINE_VOICES[engine]
}

export interface LocalTtsAdapter {
  readonly id: Exclude<EngineId, 'system'>
  load(): Promise<void>
  speak(text: string, options: { rate: number; voice?: string; fromWord?: number }): Promise<void>
  pause(): void
  resume(): void
  stop(): void
}
