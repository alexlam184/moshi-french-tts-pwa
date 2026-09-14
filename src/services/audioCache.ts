export const AUDIO_CACHE_LIMIT_BYTES = 40 * 1024 * 1024

export class MemoryAudioCache {
  private entries = new Map<string, Blob>()
  private usedBytes = 0
  private listeners = new Set<() => void>()

  constructor(private readonly limitBytes = AUDIO_CACHE_LIMIT_BYTES) {}

  get(key: string) {
    return this.entries.get(key)
  }

  has(key: string) {
    return this.entries.has(key)
  }

  set(key: string, audio: Blob) {
    const previous = this.entries.get(key)
    if (previous) {
      this.usedBytes -= previous.size
      this.entries.delete(key)
    }

    if (audio.size > this.limitBytes) {
      if (previous) this.notify()
      return false
    }

    while (this.usedBytes + audio.size > this.limitBytes && this.entries.size) {
      const oldestKey = this.entries.keys().next().value as string
      const oldest = this.entries.get(oldestKey)
      if (oldest) this.usedBytes -= oldest.size
      this.entries.delete(oldestKey)
    }

    this.entries.set(key, audio)
    this.usedBytes += audio.size
    this.notify()
    return true
  }

  clear() {
    this.entries.clear()
    this.usedBytes = 0
    this.notify()
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }

  get sizeBytes() {
    return this.usedBytes
  }
}
