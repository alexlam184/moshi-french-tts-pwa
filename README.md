# moshi-french-tts-pwa

A local-first, installable French listening-practice PWA. It uses the browser's French speech voices immediately and includes clean model lifecycle/adaptor boundaries for Piper and Supertonic HD.

Use the in-app **Guide** button for a short walkthrough of text preparation, playlists, word practice, voices, and playback statuses.

## French IPA

Expand any sentence row to see its IPA pronunciation. The app generates IPA for arbitrary French text on demand in a background worker, using the French eSpeak phonemizer already bundled for Piper. No Piper voice model, account, or online API is required. The phonemizer's WASM and data assets are included in the offline PWA cache after the first complete visit. IPA is a rule-based estimate and may differ from the pronunciation of the selected TTS voice, especially for names and context-dependent liaisons. The separate English-translation placeholder is unchanged.

The [Wiktionary pronunciation app](https://github.com/hellpanderrr/hellpanderrr.github.io/tree/main/wiktionary_pron) inspired this feature, but its GPL-licensed Lua code is not copied into this project.

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

## Deploy to Vercel

Import this folder as a new Vercel project. The checked-in `vercel.json` selects the Vite build automatically. No environment variables are needed for browser TTS.

## Local model integration

The model manager stores verified install state in IndexedDB and reports browser storage. Piper downloads Siwis into origin-private storage; Supertonic downloads its pinned ONNX snapshot and voice styles into Cache Storage. Playback runs locally through Piper WASM/ONNX or Supertonic ONNX Runtime Web.

Each engine has its own voice list. System voices come from the browser, Piper exposes its installed voice package, and Supertonic HD exposes all ten bundled styles (`F1`–`F5` and `M1`–`M5`). Piper and Supertonic remain unavailable in the engine selector until their corresponding model is installed.

Piper uses a voice `.onnx` file plus its `.onnx.json` configuration. Supertonic HD uses four ONNX graphs, Unicode tokenizer data, configuration, and ten voice-style assets. The Supertonic model source is pinned to an archived official revision so deployments do not silently change model weights.

## Playback behavior

- The large center play button plays every sentence in order as a playlist.
- Sentence play toggles pause/resume.
- Active words follow browser boundary events when the selected voice exposes them.
- Hovering a word during playback loops that word; leaving continues from the next word.
- Clicking a word while idle speaks just that word.
- Double-clicking begins the sentence at that word.
- The app caches its shell for offline use after the first successful visit.
