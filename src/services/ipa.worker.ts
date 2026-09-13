import createPiperPhonemize from '@diffusionstudio/piper-wasm/build/piper_phonemize.js'
import { formatFrenchIpa } from './ipaFormat'

type Request = { id: number; text: string }
type Phonemizer = { callMain: (args: string[]) => void }

let printed = ''
let errorText = ''
let runtime: Promise<Phonemizer> | null = null
let queue = Promise.resolve()

function loadRuntime() {
  if (!runtime) {
    runtime = createPiperPhonemize({
      noInitialRun: true,
      print: (value: string) => { printed = value },
      printErr: (value: string) => { errorText = value },
      locateFile: (name: string) => `/piper/${name}`,
    }).catch((error: unknown) => {
      runtime = null
      throw error
    })
  }
  return runtime
}

self.onmessage = (event: MessageEvent<Request>) => {
  const { id, text } = event.data
  queue = queue.catch(() => undefined).then(async () => {
    try {
      printed = ''
      errorText = ''
      const module = await loadRuntime()
      module.callMain(['-l', 'fr', '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data'])
      if (!printed) throw new Error(errorText || 'No pronunciation was returned')
      self.postMessage({ id, ipa: formatFrenchIpa(printed) })
    } catch (error) {
      self.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
    }
  })
}
