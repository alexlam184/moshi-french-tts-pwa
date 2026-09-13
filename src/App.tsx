import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SAMPLE_TEXT, splitIntoSentences } from './core/text'
import { isIPad } from './core/platform'
import { SentenceRow } from './components/SentenceRow'
import { GuidePage } from './components/GuidePage'
import { ModelManager } from './components/ModelManager'
import { Icon } from './components/Icons'
import { BrowserSpeechEngine } from './services/speech'
import { PiperSpeechEngine, SupertonicSpeechEngine, type SpeechEvents } from './services/localSpeech'
import { installedModels, voicesForEngine, type EngineId } from './services/models'
import { frenchIpa } from './services/ipa'

type Playback = { sentence: number | null; word: number; paused: boolean; hovering: number | null }
type StatusKind = 'ready' | 'empty' | 'restored' | 'cards' | 'preparing' | 'sentence' | 'word' | 'repeating' | 'continuing' | 'paused' | 'finished' | 'stopped'
type AppStatus = { kind: StatusKind; title: string; detail?: string; error?: boolean }
const EMPTY_PLAYBACK: Playback = { sentence: null, word: -1, paused: false, hovering: null }
const SAVED_TEXT_KEY = 'moshi-french-tts-pwa-last-text'
const RECENT_TEXTS_KEY = 'moshi-french-tts-pwa-recent-texts'
const RECENT_TEXT_LIMIT = 20

function savedText() {
  return window.localStorage.getItem(SAVED_TEXT_KEY)?.trim() || SAMPLE_TEXT
}

function savedRecentTexts() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_TEXTS_KEY) ?? '[]')
    if (Array.isArray(stored)) {
      const texts = stored.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      if (texts.length) return [...new Set(texts.map(item => item.trim()))].slice(0, RECENT_TEXT_LIMIT)
    }
  } catch { /* Ignore invalid history left by an older app version. */ }
  const lastText = window.localStorage.getItem(SAVED_TEXT_KEY)?.trim()
  return lastText ? [lastText] : []
}

function readyStatus(): AppStatus {
  return { kind: 'ready', title: 'Ready', detail: 'Paste or edit French text, then prepare it for listening.' }
}

export default function App() {
  const [draft, setDraft] = useState(savedText)
  const [text, setText] = useState(savedText)
  const [recentTexts, setRecentTexts] = useState(savedRecentTexts)
  const sentences = useMemo(() => splitIntoSentences(text), [text])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [ipaByText, setIpaByText] = useState<Record<string, string>>({})
  const [engine, setEngine] = useState<EngineId>('system')
  const [voice, setVoice] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [installed, setInstalled] = useState<string[]>([])
  const [rate, setRate] = useState(0.85)
  const [playback, setPlayback] = useState<Playback>(EMPTY_PLAYBACK)
  const [failedSentence, setFailedSentence] = useState<number | null>(null)
  const [modelsOpen, setModelsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [page, setPage] = useState<'practice' | 'guide'>('practice')
  const [status, setStatus] = useState<AppStatus>(() => window.localStorage.getItem(SAVED_TEXT_KEY)
    ? { kind: 'restored', title: 'Text restored', detail: 'Your last prepared text was returned to the editor.' }
    : readyStatus())
  const speech = useRef(new BrowserSpeechEngine())
  const piperSpeech = useRef(new PiperSpeechEngine())
  const supertonicSpeech = useRef(new SupertonicSpeechEngine())
  const playlist = useRef(false)
  const hoverTimer = useRef<number | null>(null)
  const clickTimer = useRef<number | null>(null)
  const engineVoices = useMemo(() => voicesForEngine(engine, voices), [engine, voices])

  useEffect(() => {
    const refresh = () => setVoices(speech.current.voices())
    const clearSessionAudio = () => { piperSpeech.current.clearCache(); supertonicSpeech.current.clearCache() }
    refresh(); window.speechSynthesis?.addEventListener('voiceschanged', refresh)
    window.addEventListener('pagehide', clearSessionAudio)
    return () => {
      speech.current.stop(); piperSpeech.current.stop(); supertonicSpeech.current.stop()
      clearSessionAudio()
      window.removeEventListener('pagehide', clearSessionAudio)
      window.speechSynthesis?.removeEventListener('voiceschanged', refresh)
    }
  }, [])

  useEffect(() => { installedModels().then(setInstalled) }, [])
  useEffect(() => {
    let cancelled = false
    for (const sentence of sentences) {
      if (!expanded.has(sentence.id) || ipaByText[sentence.text]) continue
      frenchIpa(sentence.text).then(
        ipa => { if (!cancelled) setIpaByText(current => ({ ...current, [sentence.text]: ipa })) },
        error => { if (!cancelled) setIpaByText(current => ({ ...current, [sentence.text]: `IPA unavailable: ${error instanceof Error ? error.message : String(error)}` })) },
      )
    }
    return () => { cancelled = true }
  }, [sentences, expanded, ipaByText])
  useEffect(() => {
    const dialog = document.getElementById('history-dialog') as HTMLDialogElement | null
    if (historyOpen && dialog && !dialog.open) {
      dialog.showModal()
      window.requestAnimationFrame(() => dialog.querySelector<HTMLButtonElement>('.history-list button')?.focus())
    }
    if (!historyOpen && dialog?.open) dialog.close()
  }, [historyOpen])
  useEffect(() => {
    const next = voicesForEngine(engine, voices)
    setVoice(next[0]?.id ?? '')
  }, [engine, voices])

  const updateInstalled = useCallback((ids: string[]) => {
    setInstalled(ids)
    if (engine !== 'system' && !ids.includes(engine)) {
      playlist.current = false
      stopEngines()
      setEngine('system')
      setPlayback(EMPTY_PLAYBACK)
      setStatus({ kind: 'stopped', title: 'Stopped', detail: `${engine} was removed. Switched to the system voice.` })
    }
  }, [engine])

  function applyText() {
    playlist.current = false
    stopEngines(); clearAudioCaches(); setPlayback(EMPTY_PLAYBACK); setFailedSentence(null)
    const clean = draft.trim()
    if (!clean) {
      setText('')
      window.localStorage.removeItem(SAVED_TEXT_KEY)
      setStatus({ kind: 'empty', title: 'No text found', detail: 'Paste some French text into the editor first.' })
      return
    }
    const prepared = splitIntoSentences(clean)
    const different = new Set(prepared.map(sentence => sentence.text.toLocaleLowerCase('fr'))).size
    setText(clean)
    window.localStorage.setItem(SAVED_TEXT_KEY, clean)
    setRecentTexts(current => {
      const next = [clean, ...current.filter(item => item !== clean)].slice(0, RECENT_TEXT_LIMIT)
      window.localStorage.setItem(RECENT_TEXTS_KEY, JSON.stringify(next))
      return next
    })
    setStatus({ kind: 'cards', title: 'Sentence cards ready', detail: `${prepared.length} total · ${different} different.` })
  }

  function restoreRecentText(value: string) {
    playlist.current = false
    stopEngines()
    setPlayback(EMPTY_PLAYBACK)
    setFailedSentence(null)
    setDraft(value)
    setHistoryOpen(false)
    setStatus({ kind: 'restored', title: 'Text restored', detail: 'A recent text was returned to the editor. Select prepare listening when ready.' })
    window.requestAnimationFrame(() => document.getElementById('french-text')?.focus())
  }

  function stopEngines() {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = null
    speech.current.stop(); piperSpeech.current.stop(); supertonicSpeech.current.stop()
  }

  function clearAudioCaches() {
    piperSpeech.current.clearCache()
    supertonicSpeech.current.clearCache()
  }

  function openGuide() {
    playlist.current = false
    stopEngines()
    setPlayback(EMPTY_PLAYBACK)
    setPage('guide')
  }

  function speakWithSelectedEngine(words: string[], events: SpeechEvents) {
    if (engine === 'piper') return piperSpeech.current.speak(words, { rate }, events)
    if (engine === 'supertonic') return supertonicSpeech.current.speak(words, { rate, voice }, events)
    speech.current.speak(words, { rate, voice }, events)
  }

  function pauseEngine() {
    if (engine === 'piper') piperSpeech.current.pause()
    else if (engine === 'supertonic') supertonicSpeech.current.pause()
    else speech.current.pause()
  }

  function resumeEngine() {
    if (engine === 'piper') piperSpeech.current.resume()
    else if (engine === 'supertonic') supertonicSpeech.current.resume()
    else speech.current.resume()
  }

  function changeEngine(next: EngineId) {
    playlist.current = false
    if (next !== 'system' && !installed.includes(next)) {
      stopEngines(); setPlayback(EMPTY_PLAYBACK); setFailedSentence(null)
      setStatus({ kind: 'stopped', title: 'Installation required', detail: `Install ${next === 'piper' ? 'Piper · Siwis' : 'Supertonic HD'} before selecting this engine.` })
      setModelsOpen(true)
      return
    }
    stopEngines(); clearAudioCaches(); setPlayback(EMPTY_PLAYBACK); setFailedSentence(null); setEngine(next)
    setStatus({ kind: 'ready', title: 'Ready', detail: `${next === 'system' ? 'System / browser' : next === 'piper' ? 'Piper · Siwis' : 'Supertonic HD'} selected.` })
  }

  function changeVoice(next: string) {
    playlist.current = false
    stopEngines(); clearAudioCaches(); setPlayback(EMPTY_PLAYBACK); setFailedSentence(null); setVoice(next)
    setStatus({ kind: 'ready', title: 'Ready', detail: `${next} voice selected.` })
  }

  function changeRate(next: number) {
    playlist.current = false
    stopEngines(); clearAudioCaches(); setPlayback(EMPTY_PLAYBACK); setFailedSentence(null); setRate(next)
    setStatus({ kind: 'ready', title: 'Ready', detail: `${next}× speed selected.` })
  }

  function playSentence(index: number, fromWord = 0, continuing = false) {
    setFailedSentence(null)
    if (engine !== 'system' && !installed.includes(engine)) {
      playlist.current = false
      setFailedSentence(index)
      setStatus({ kind: 'stopped', title: 'Voice unavailable', detail: `Install ${engine === 'piper' ? 'Piper' : 'Supertonic HD'} before using it.`, error: true })
      setModelsOpen(true)
      return
    }
    const words = sentences[index]?.words
    if (!words) {
      setStatus({ kind: 'empty', title: 'No text found', detail: 'Paste some French text into the editor first.' })
      return
    }
    const engineLabel = engine === 'system' ? 'System / browser' : engine === 'piper' ? 'Piper · Siwis' : `Supertonic · ${voice}`
    const cached = fromWord === 0 && isSentenceCached(index)
    setStatus(continuing
      ? { kind: 'continuing', title: 'Continuing sentence', detail: `Resuming at word ${fromWord + 1}.` }
      : cached
        ? { kind: 'sentence', title: 'Playing sentence', detail: `Sentence ${index + 1} loaded from the temporary audio cache.` }
        : { kind: 'preparing', title: 'Preparing audio', detail: `${engineLabel} is generating sentence ${index + 1}.` })
    const selectedWords = words.slice(fromWord)
    void speakWithSelectedEngine(selectedWords, {
      onReady: () => setStatus({ kind: 'sentence', title: 'Playing sentence', detail: `Sentence ${index + 1} of ${sentences.length} · ${engineLabel}${playlist.current ? ' · playlist' : ''}.` }),
      onWord: word => setPlayback({ sentence: index, word: fromWord + word, paused: false, hovering: null }),
      onEnd: () => {
        if (playlist.current && index + 1 < sentences.length) {
          playSentence(index + 1)
          return
        }
        const completedPlaylist = playlist.current
        playlist.current = false
        setPlayback(EMPTY_PLAYBACK)
        setStatus({ kind: 'finished', title: 'Finished', detail: completedPlaylist ? `All ${sentences.length} sentences finished playing.` : `Sentence ${index + 1} playback ended.` })
      },
      onError: error => { playlist.current = false; setPlayback(EMPTY_PLAYBACK); setFailedSentence(index); setStatus({ kind: 'stopped', title: 'Playback error', detail: error instanceof Error ? error.message : `${engine} could not generate audio.`, error: true }) },
    })
    setPlayback({ sentence: index, word: fromWord, paused: false, hovering: null })
  }

  function toggleSentence(index: number) {
    if (playback.sentence === index) {
      if (playback.paused) { resumeEngine(); setPlayback(p => ({ ...p, paused: false })); setStatus({ kind: 'sentence', title: 'Playing sentence', detail: `Sentence ${index + 1} of ${sentences.length}${playlist.current ? ' · playlist' : ''}.` }) }
      else { pauseEngine(); setPlayback(p => ({ ...p, paused: true })); setStatus({ kind: 'paused', title: 'Paused', detail: `Sentence ${index + 1} is paused.` }) }
    } else {
      playlist.current = false
      stopEngines()
      playSentence(index)
    }
  }

  function togglePlaylist() {
    if (playback.sentence !== null) {
      toggleSentence(playback.sentence)
      return
    }
    playlist.current = true
    playSentence(0)
  }

  function stop() { playlist.current = false; stopEngines(); setPlayback(EMPTY_PLAYBACK); setFailedSentence(null); setStatus({ kind: 'stopped', title: 'Stopped', detail: 'Playback was stopped.' }) }
  function seek(delta: number) {
    if (playback.sentence === null) return
    const next = Math.max(0, Math.min(sentences[playback.sentence].words.length - 1, playback.word + delta))
    playSentence(playback.sentence, next)
  }
  function playWord(sentenceIndex: number, wordIndex: number) {
    if (playback.sentence !== null) return
    playlist.current = false
    setFailedSentence(null)
    const word = sentences[sentenceIndex].words[wordIndex]
    if (engine !== 'system' && !installed.includes(engine)) { setFailedSentence(sentenceIndex); setModelsOpen(true); setStatus({ kind: 'stopped', title: 'Voice unavailable', detail: `Install ${engine} first.`, error: true }); return }
    setStatus({ kind: 'preparing', title: 'Preparing audio', detail: `Generating “${word}”.` })
    void speakWithSelectedEngine([word], {
      onReady: () => setStatus({ kind: 'word', title: 'Playing word', detail: `“${word}”` }),
      onEnd: () => setStatus({ kind: 'finished', title: 'Finished', detail: `Word “${word}” playback ended.` }),
      onError: error => { setFailedSentence(sentenceIndex); setStatus({ kind: 'stopped', title: 'Playback error', detail: error instanceof Error ? error.message : `${engine} could not generate audio.`, error: true }) },
    })
  }
  function delayedWord(sentenceIndex: number, wordIndex: number) {
    if (clickTimer.current) window.clearTimeout(clickTimer.current)
    clickTimer.current = window.setTimeout(() => playWord(sentenceIndex, wordIndex), 220)
  }
  function startFromWord(sentenceIndex: number, wordIndex: number) {
    if (clickTimer.current) window.clearTimeout(clickTimer.current)
    playlist.current = false
    stopEngines()
    playSentence(sentenceIndex, wordIndex)
  }
  function hoverWord(sentenceIndex: number, wordIndex: number) {
    if (playback.sentence !== sentenceIndex || playback.paused) return
    stopEngines()
    setPlayback(p => ({ ...p, hovering: wordIndex }))
    const repeatedWord = sentences[sentenceIndex].words[wordIndex]
    setStatus({ kind: 'repeating', title: `Repeating “${repeatedWord}”`, detail: 'Move away to continue.' })
    const repeat = () => {
      if (hoverTimer.current === null) return
      void speakWithSelectedEngine([repeatedWord], { onEnd: repeat, onError: error => { setFailedSentence(sentenceIndex); setStatus({ kind: 'stopped', title: 'Playback error', detail: error instanceof Error ? error.message : `${engine} could not repeat the word.`, error: true }) } })
    }
    hoverTimer.current = window.setTimeout(repeat, 80)
  }
  function leaveWord() {
    if (playback.sentence === null || playback.hovering === null) return
    const sentenceIndex = playback.sentence
    const next = playback.hovering + 1
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = null
    stopEngines()
    if (next < sentences[sentenceIndex].words.length) {
      playSentence(sentenceIndex, next, true)
    } else if (playlist.current && sentenceIndex + 1 < sentences.length) {
      playSentence(sentenceIndex + 1, 0, true)
    } else {
      const completedPlaylist = playlist.current
      playlist.current = false
      setPlayback(EMPTY_PLAYBACK)
      setStatus({ kind: 'finished', title: 'Finished', detail: completedPlaylist ? `All ${sentences.length} sentences finished playing.` : `Sentence ${sentenceIndex + 1} playback ended.` })
    }
  }

  const activeSentence = playback.sentence === null ? null : sentences[playback.sentence]
  const showSilentModeHint = engine !== 'system' && isIPad(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
  const textLocked = playback.sentence !== null || status.kind === 'preparing' || status.kind === 'word'
  const isSentenceCached = (index: number) => {
    const words = sentences[index]?.words
    if (!words) return false
    if (engine === 'piper') return piperSpeech.current.hasCached(words, { rate })
    if (engine === 'supertonic') return supertonicSpeech.current.hasCached(words, { rate, voice })
    return false
  }
  const sentenceAudioStatus = (index: number) => {
    if (failedSentence === index) return 'error'
    if (playback.sentence !== index) return isSentenceCached(index) ? 'cached' : engine === 'system' ? 'on demand' : 'not generated'
    if (status.kind === 'preparing') return 'preparing'
    if (status.kind === 'repeating') return 'repeating'
    if (status.kind === 'continuing') return 'continuing'
    if (status.kind === 'word') return 'playing word'
    return playback.paused ? 'paused' : 'playing'
  }

  return <div className="app-shell">
    <header className="nav-edge">
      <a className="wordmark" href="#workspace" onClick={() => setPage('practice')} aria-label="Moshi French TTS home"><span className="wordmark__wave" aria-hidden="true">〰</span>Moshi French TTS</a>
      <nav className="nav-actions" aria-label="App navigation">
        <button className="button button--quiet" aria-current={page === 'guide' ? 'page' : undefined} onClick={openGuide}>Guide</button>
        <button className="button button--quiet" onClick={() => setHistoryOpen(true)}>History</button>
        <button className="button button--quiet" onClick={() => setModelsOpen(true)}><Icon name="settings"/> Voice models</button>
      </nav>
    </header>

    {page === 'guide' ? <GuidePage onBack={() => setPage('practice')} /> : <main id="workspace" className="workspace">
      <section className="composer" aria-labelledby="composer-heading">
        <header className="section-heading"><p className="eyebrow">01 · TEXT</p><h1 id="composer-heading">What would you like to <em>hear</em>?</h1><p>Paste french text. it stays on this device.</p></header>
        <label className="field-label" htmlFor="french-text">French Text</label>
        <textarea id="french-text" value={draft} onChange={e => setDraft(e.target.value)} readOnly={textLocked} spellCheck lang="fr" aria-describedby="text-help" aria-label={textLocked ? 'French text—editing locked during playback' : 'French text'} />
        <div id="text-help" className="field-help"><span>{draft.length.toLocaleString()} characters</span><span>Split automatically at punctuation</span></div>
        <button className="button button--primary prepare" onClick={applyText}><Icon name="speaker"/> Prepare listening</button>
        <aside className="privacy-note"><span aria-hidden="true">◎</span><div><strong>Local by default</strong><p>browser voices and installed models process text without sending it to a speech server.</p></div></aside>
      </section>

      <section className="listener" aria-labelledby="listener-heading">
        <header className="listener__header"><div><p className="eyebrow">02 · LISTEN</p><h2 id="listener-heading">Sentence Practice</h2></div></header>

        <div className="playback-toolbar">
          <div className="voice-controls">
            <label>engine<select value={engine} onChange={e => changeEngine(e.target.value as EngineId)}><option value="system">System / Browser</option><option value="piper">Piper{installed.includes('piper') ? '' : ' · Not Downloaded'}</option><option value="supertonic">Supertonic HD{installed.includes('supertonic') ? '' : ' · Not Downloaded'}</option></select></label>
            <label>voice<select value={voice} onChange={e => changeVoice(e.target.value)} disabled={!engineVoices.length}>{engineVoices.length ? engineVoices.map(v => <option value={v.id} key={v.id}>{v.name} · {v.detail}</option>) : <option>No Voice Available</option>}</select></label>
            <label>speed<select value={rate} onChange={e => changeRate(Number(e.target.value))}>{[0.6, 0.75, 0.85, 1, 1.15].map(x => <option key={x} value={x}>{x}×</option>)}</select></label>
          </div>

          <div className="transport" aria-label="Playback controls">
            <button className="transport__button" onClick={() => seek(-1)} disabled={playback.sentence === null} aria-label="Previous word"><Icon name="back"/></button>
            <button className="transport__button transport__button--main" onClick={togglePlaylist} disabled={!sentences.length} aria-label={playback.sentence === null ? 'Play all sentences' : playback.paused ? 'Resume playback' : 'Pause playback'}><Icon name={playback.paused || playback.sentence === null ? 'play' : 'pause'}/></button>
            <button className="transport__button" onClick={() => seek(1)} disabled={playback.sentence === null} aria-label="Next word"><Icon name="forward"/></button>
            <span className="transport__rule" />
            <button className="transport__button" onClick={stop} disabled={playback.sentence === null} aria-label="Stop"><Icon name="stop"/></button>
          </div>
        </div>

        <div className="now-playing" aria-live="polite"><span>{activeSentence ? `${playback.word + 1} / ${activeSentence.words.length}` : 'ready'}</span><div className="signal" aria-hidden="true">{Array.from({ length: 32 }, (_, i) => <i key={i} style={{ height: `${6 + Math.abs(Math.sin(i * .58)) * 16}px` }} />)}</div><span>{sentences.length} sentences</span></div>

        <div className={`playback-status playback-status--${status.kind}${status.error ? ' playback-status--error' : ''}`} role="status" aria-live="polite" aria-atomic="true">
          <span className="playback-status__light" aria-hidden="true" />
          <div><strong>{status.title}</strong>{status.detail && <span>{status.detail}</span>}{showSilentModeHint && <span className="silent-mode-hint">No sound? Turn off Silent Mode in iPad Control Center.</span>}</div>
        </div>

        <div className="sentences">
          {sentences.length ? sentences.map((sentence, index) => <SentenceRow key={sentence.id} sentence={sentence} expanded={expanded.has(sentence.id)} active={playback.sentence === index} paused={playback.paused} activeWord={playback.sentence === index ? playback.word : -1} hoveredWord={playback.sentence === index ? playback.hovering : null} audioStatus={sentenceAudioStatus(index)} ipa={ipaByText[sentence.text] ?? 'Preparing pronunciation…'} onToggle={() => setExpanded(current => { const next = new Set(current); next.has(sentence.id) ? next.delete(sentence.id) : next.add(sentence.id); return next })} onPlay={() => toggleSentence(index)} onWordClick={i => delayedWord(index, i)} onWordDoubleClick={i => startFromWord(index, i)} onWordEnter={i => hoverWord(index, i)} onWordLeave={leaveWord} />) : <div className="empty-state"><Icon name="speaker"/><p>add some french text to begin.</p></div>}
        </div>
      </section>
    </main>}

    <footer className="foot-line"><p>Moshi French TTS · private listening practice</p><span>made by Alex Lam · works offline after first visit</span></footer>
    <dialog id="history-dialog" className="dialog history-dialog" onClose={() => setHistoryOpen(false)} onClick={event => { if (event.target === event.currentTarget) setHistoryOpen(false) }}>
      <div className="dialog__body history-dialog__body">
        <header className="dialog__header"><div><p className="eyebrow">RECENT TEXT</p><h2>Listening History</h2></div><button className="icon-button" onClick={() => setHistoryOpen(false)} aria-label="Close recent text">×</button></header>
        <p className="dialog__lede">Your latest 20 prepared passages stay in this browser. select one to return it to the editor.</p>
        <div className="history-count"><span>Saved Passages</span><strong>{recentTexts.length} / {RECENT_TEXT_LIMIT}</strong></div>
        {recentTexts.length ? <div className="history-list">
          {recentTexts.map((item, index) => <button key={item} type="button" onClick={() => restoreRecentText(item)} aria-label={`Restore recent text ${index + 1}: ${item}`}>
            <span>{item}</span><small>Restore</small>
          </button>)}
        </div> : <div className="history-empty"><Icon name="speaker"/><p>No recent text yet.</p><span>Prepare a French passage and it will appear here.</span></div>}
      </div>
    </dialog>
    <ModelManager open={modelsOpen} onClose={() => setModelsOpen(false)} onInstalledChange={updateInstalled} />
  </div>
}
