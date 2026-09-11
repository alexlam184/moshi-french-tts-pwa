import { TtsSession } from '@mintplex-labs/piper-tts-web'
import { loadTextToSpeech, loadVoiceStyle, writeWavFile, type SupertonicStyle, type SupertonicTts } from './supertonic/vendor-helper.js'
import { SUPERTONIC_BASE_URL } from './models'

export type SpeechEvents = {
  onWord?: (index: number) => void
  onEnd?: () => void
  onError?: (error?: unknown) => void
  onReady?: () => void
}

class AudioPlayback {
  private audio: HTMLAudioElement | null = null
  private url: string | null = null
  private timer: number | null = null
  private generation = 0

  nextGeneration() { this.generation += 1; return this.generation }
  isCurrent(generation: number) { return generation === this.generation }

  async play(blob: Blob, wordCount: number, rate: number, events: SpeechEvents) {
    this.releaseAudio()
    this.url = URL.createObjectURL(blob)
    const audio = new Audio(this.url)
    audio.playbackRate = rate
    audio.onloadedmetadata = () => {
      const duration = Math.max(audio.duration / rate, 0.1)
      const started = performance.now()
      events.onWord?.(0)
      this.timer = window.setInterval(() => {
        const elapsed = (performance.now() - started) / 1000
        events.onWord?.(Math.min(wordCount - 1, Math.floor((elapsed / duration) * wordCount)))
      }, 80)
    }
    audio.onended = () => { this.releaseAudio(); events.onEnd?.() }
    audio.onerror = () => { this.releaseAudio(); events.onError?.(new Error('Generated audio could not be played')) }
    this.audio = audio
    events.onReady?.()
    await audio.play()
  }

  pause() { this.audio?.pause() }
  resume() { void this.audio?.play() }
  stop() { this.nextGeneration(); this.releaseAudio() }

  private releaseAudio() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.pause(); this.audio.src = '' }
    this.audio = null
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = null
  }
}

export class PiperSpeechEngine {
  private playback = new AudioPlayback()
  private session: Promise<TtsSession> | null = null

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
    try {
      const session = await this.load()
      const wav = await session.predict(words.join(' '))
      if (!this.playback.isCurrent(generation)) return
      await this.playback.play(wav, words.length, options.rate, events)
    } catch (error) { if (this.playback.isCurrent(generation)) events.onError?.(error) }
  }

  pause() { this.playback.pause() }
  resume() { this.playback.resume() }
  stop() { this.playback.stop() }
}

export class SupertonicSpeechEngine {
  private playback = new AudioPlayback()
  private tts: SupertonicTts | null = null
  private loadPromise: Promise<SupertonicTts> | null = null
  private styles = new Map<string, SupertonicStyle>()

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
    try {
      const [tts, style] = await Promise.all([this.load(), this.style(options.voice ?? 'F1')])
      const result = await tts.call(words.join(' '), 'fr', style, 8, options.rate, 0.15)
      if (!this.playback.isCurrent(generation)) return
      const length = Math.floor(tts.sampleRate * result.duration[0])
      const wav = writeWavFile(result.wav.slice(0, length), tts.sampleRate)
      await this.playback.play(new Blob([wav], { type: 'audio/wav' }), words.length, 1, events)
    } catch (error) { if (this.playback.isCurrent(generation)) events.onError?.(error) }
  }

  pause() { this.playback.pause() }
  resume() { this.playback.resume() }
  stop() { this.playback.stop() }
}
