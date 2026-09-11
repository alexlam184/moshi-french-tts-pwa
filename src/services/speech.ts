import { charIndexToWord } from '../core/text'

type Events = { onWord?: (index: number) => void; onEnd?: () => void; onError?: (error?: unknown) => void; onReady?: () => void }

export class BrowserSpeechEngine {
  private utterance: SpeechSynthesisUtterance | null = null
  private words: string[] = []
  private startWord = 0

  voices() { return window.speechSynthesis?.getVoices().filter(v => v.lang.toLowerCase().startsWith('fr')) ?? [] }

  speak(words: string[], options: { rate: number; voice?: string; fromWord?: number }, events: Events = {}) {
    if (!('speechSynthesis' in window)) { events.onError?.(); return }
    this.stop()
    this.words = words
    this.startWord = options.fromWord ?? 0
    const text = words.slice(this.startWord).join(' ')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    utterance.rate = options.rate
    utterance.voice = this.voices().find(v => v.voiceURI === options.voice) ?? this.voices()[0] ?? null
    utterance.onboundary = event => {
      if (event.name === 'word') events.onWord?.(this.startWord + charIndexToWord(words.slice(this.startWord), event.charIndex))
    }
    utterance.onend = () => events.onEnd?.()
    utterance.onerror = () => events.onError?.()
    this.utterance = utterance
    events.onReady?.()
    window.speechSynthesis.speak(utterance)
  }

  pause() { window.speechSynthesis?.pause() }
  resume() { window.speechSynthesis?.resume() }
  stop() { window.speechSynthesis?.cancel(); this.utterance = null }
}
