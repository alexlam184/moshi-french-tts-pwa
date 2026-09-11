import { TtsSession } from '@mintplex-labs/piper-tts-web'
import { loadTextToSpeech, loadVoiceStyle, writeWavFile, type SupertonicStyle, type SupertonicTts } from './supertonic/vendor-helper.js'
import { SUPERTONIC_BASE_URL } from './models'
import { MemoryAudioCache } from './audioCache'

const sessionAudioCache = new MemoryAudioCache()

export type SpeechEvents = {
  onWord?: (index: number) => void
  onEnd?: () => void
  onError?: (error?: unknown) => void
  onReady?: () => void
}

class AudioPlayback {
  private context: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private buffer: AudioBuffer | null = null
  private timer: number | null = null
  private generation = 0
  private startedAt = 0
  private pausedAt = 0
  private rate = 1
  private paused = false
  private wordCount = 1
  private events: SpeechEvents = {}

  nextGeneration() { this.generation += 1; return this.generation }
  isCurrent(generation: number) { return generation === this.generation }

  // Call synchronously from the user's Play tap. iPad Safari otherwise rejects
  // audio which starts only after lengthy, local model inference completes.
  unlock() {
    if (!this.context) this.context = new AudioContext()
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined)
  }

  async play(blob: Blob, wordCount: number, rate: number, events: SpeechEvents) {
    this.releaseAudio()
    this.unlock()
    const context = this.context
    if (!context) throw new Error('Audio playback is unavailable in this browser')
    this.buffer = await context.decodeAudioData(await blob.arrayBuffer())
    this.rate = rate
    this.wordCount = wordCount
    this.events = events
    this.pausedAt = 0
    this.paused = false
    this.start()
    events.onReady?.()
  }

  pause() {
    if (!this.source || !this.context || this.paused) return
    this.pausedAt += (this.context.currentTime - this.startedAt) * this.rate
    this.paused = true
    this.source.stop()
    this.source = null
    this.clearTimer()
  }

  resume() {
    if (!this.paused || !this.buffer) return
    this.paused = false
    this.start()
  }

  stop() { this.nextGeneration(); this.releaseAudio() }

  private start() {
    const context = this.context
    const buffer = this.buffer
    if (!context || !buffer) return
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = this.rate
    source.connect(context.destination)
    this.source = source
    this.startedAt = context.currentTime
    const duration = Math.max(buffer.duration, 0.1)
    const notifyWord = () => {
      const elapsed = this.pausedAt + (context.currentTime - this.startedAt) * this.rate
      this.events.onWord?.(Math.min(this.wordCount - 1, Math.floor((elapsed / duration) * this.wordCount)))
    }
    notifyWord()
    this.timer = window.setInterval(() => { if (this.source === source) notifyWord() }, 80)
    source.onended = () => {
      if (this.source !== source || this.paused) return
      this.releaseAudio()
      this.events.onEnd?.()
    }
    source.start(0, this.pausedAt)
  }

  private clearTimer() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  private releaseAudio() {
    this.clearTimer()
    if (this.source) { this.source.onended = null; this.source.stop(); this.source.disconnect() }
    this.source = null
    this.buffer = null
    this.paused = false
    this.pausedAt = 0
  }
}

export class PiperSpeechEngine {
  private playback = new AudioPlayback()
  private session: Promise<TtsSession> | null = null
  private cache = sessionAudioCache

  private cacheKey(words: string[], rate: number) {
    return JSON.stringify(['piper', 'fr_FR-siwis-medium', rate, words.join(' ')])
  }

  private load() {
    if (!this.session) {
      this.session = TtsSession.create({
        voiceId: 'fr_FR-siwis-medium',
        wasmPaths: {
          onnxWasm: '/onnx/',
          piperData: '/piper/piper_phonemize.data',
          piperWasm: '/piper/piper_phonemize.wasm',
        },
      }).catch(error => {
        this.session = null
        throw error
      })
    }
    return this.session
  }

  async speak(words: string[], options: { rate: number }, events: SpeechEvents = {}) {
    const generation = this.playback.nextGeneration()
    this.playback.unlock()
    try {
      const key = this.cacheKey(words, options.rate)
      const cached = this.cache.get(key)
      if (cached) {
        await this.playback.play(cached, words.length, options.rate, events)
        return
      }
      const session = await this.load()
      const wav = await session.predict(words.join(' '))
      if (!this.playback.isCurrent(generation)) return
      this.cache.set(key, wav)
      await this.playback.play(wav, words.length, options.rate, events)
    } catch (error) { if (this.playback.isCurrent(generation)) events.onError?.(error) }
  }

  hasCached(words: string[], options: { rate: number }) { return this.cache.has(this.cacheKey(words, options.rate)) }
  clearCache() { this.cache.clear() }

  pause() { this.playback.pause() }
  resume() { this.playback.resume() }
  stop() { this.playback.stop() }
}

export class SupertonicSpeechEngine {
  private playback = new AudioPlayback()
  private tts: SupertonicTts | null = null
  private loadPromise: Promise<SupertonicTts> | null = null
  private styles = new Map<string, SupertonicStyle>()
  private cache = sessionAudioCache

  private cacheKey(words: string[], rate: number, voice: string) {
    return JSON.stringify(['supertonic', voice, rate, words.join(' ')])
  }

  private load() {
    if (this.tts) return Promise.resolve(this.tts)
    if (!this.loadPromise) {
      this.loadPromise = loadTextToSpeech(`${SUPERTONIC_BASE_URL}/onnx`, {
        executionProviders: navigator.gpu ? ['webgpu', 'wasm'] : ['wasm'],
        graphOptimizationLevel: 'all',
      }).then(result => (this.tts = result.textToSpeech))
    }
    return this.loadPromise
  }

  private async style(voice: string) {
    const cached = this.styles.get(voice)
    if (cached) return cached
    const style = await loadVoiceStyle([`${SUPERTONIC_BASE_URL}/voice_styles/${voice}.json`])
    this.styles.set(voice, style)
    return style
  }

  async speak(words: string[], options: { rate: number; voice?: string }, events: SpeechEvents = {}) {
    const generation = this.playback.nextGeneration()
    this.playback.unlock()
    try {
      const selectedVoice = options.voice ?? 'F1'
      const key = this.cacheKey(words, options.rate, selectedVoice)
      const cached = this.cache.get(key)
      if (cached) {
        await this.playback.play(cached, words.length, 1, events)
        return
      }
      const [tts, style] = await Promise.all([this.load(), this.style(selectedVoice)])
      const result = await tts.call(words.join(' '), 'fr', style, 8, options.rate, 0.15)
      if (!this.playback.isCurrent(generation)) return
      const length = Math.floor(tts.sampleRate * result.duration[0])
      const wav = writeWavFile(result.wav.slice(0, length), tts.sampleRate)
      const audio = new Blob([wav], { type: 'audio/wav' })
      this.cache.set(key, audio)
      await this.playback.play(audio, words.length, 1, events)
    } catch (error) { if (this.playback.isCurrent(generation)) events.onError?.(error) }
  }

  hasCached(words: string[], options: { rate: number; voice?: string }) { return this.cache.has(this.cacheKey(words, options.rate, options.voice ?? 'F1')) }
  clearCache() { this.cache.clear() }

  pause() { this.playback.pause() }
  resume() { this.playback.resume() }
  stop() { this.playback.stop() }
}
