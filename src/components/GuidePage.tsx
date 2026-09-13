export function GuidePage({ onBack }: { onBack: () => void }) {
  return <main id="guide" className="guide-page" aria-labelledby="guide-title">
    <header className="guide-hero">
      <p className="eyebrow">GUIDE · MOSHI FRENCH TTS</p>
      <h1 id="guide-title">listen, repeat,<br/><em>make it yours.</em></h1>
      <p>Everything happens in this browser. Start with the system voice, then install a local model when you want a different sound.</p>
      <small className="guide-credit">made by Alex Lam</small>
      <button className="button button--primary" onClick={onBack}>Start listening</button>
    </header>

    <section className="guide-section" aria-labelledby="guide-start">
      <div><p className="eyebrow">01 · START</p><h2 id="guide-start">prepare a passage</h2></div>
      <ol className="guide-steps">
        <li><b>Paste French text</b><span>Write or paste a short passage into the editor.</span></li>
        <li><b>Prepare listening</b><span>The app separates it into clean sentence rows.</span></li>
        <li><b>Open a sentence</b><span>See French IPA generated on your device using the app’s Piper/eSpeak phonemizer. It works for your own text without installing a voice model. The estimate may differ from the selected voice.</span></li>
        <li><b>Play all sentences</b><span>The large blue button plays the complete passage in order.</span></li>
      </ol>
    </section>

    <section className="guide-section" aria-labelledby="guide-controls">
      <div><p className="eyebrow">02 · CONTROLS</p><h2 id="guide-controls">choose your pace</h2></div>
      <div className="guide-grid">
        <article><strong>large play</strong><p>Starts the full playlist. Use it again to pause or resume.</p></article>
        <article><strong>sentence play</strong><p>Plays only that row. It does not start the playlist.</p></article>
        <article><strong>previous / next</strong><p>Moves through the words in the active sentence.</p></article>
        <article><strong>stop</strong><p>Ends playback immediately and keeps your text ready.</p></article>
      </div>
    </section>

    <section className="guide-section" aria-labelledby="guide-words">
      <div><p className="eyebrow">03 · WORD PRACTICE</p><h2 id="guide-words">zoom in on a word</h2></div>
      <div className="guide-grid guide-grid--wide">
        <article><strong>single-click</strong><p>When nothing is playing, hear that word by itself.</p></article>
        <article><strong>double-click</strong><p>Begin the full sentence from that exact word.</p></article>
        <article><strong>hover during playback</strong><p>The word repeats. Move away and the sentence continues from the next word.</p></article>
      </div>
    </section>

    <section className="guide-section" aria-labelledby="guide-voices">
      <div><p className="eyebrow">04 · VOICES</p><h2 id="guide-voices">pick an engine</h2></div>
      <div className="guide-grid">
        <article><strong>system / browser</strong><p>Available straight away. Choose any French voice installed on your device.</p></article>
        <article><strong>piper · siwis</strong><p>A compact French model for local, offline playback after installation.</p></article>
        <article><strong>supertonic hd</strong><p>Ten local voice styles: F1–F5 and M1–M5. Install it from Voice models first.</p></article>
        <article><strong>speed</strong><p>Slow down for dictation or raise the pace as your listening improves.</p></article>
      </div>
    </section>

    <section className="guide-section guide-section--status" aria-labelledby="guide-status">
      <div><p className="eyebrow">05 · LIVE STATUS</p><h2 id="guide-status">know what is happening</h2></div>
      <p>The status strip above the sentence rows explains each step: ready, sentence cards ready, preparing audio, playing sentence or word, repeating, continuing, paused, finished, stopped, or a clear playback error.</p>
    </section>
  </main>
}
