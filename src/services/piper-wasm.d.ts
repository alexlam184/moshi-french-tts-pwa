declare module '@diffusionstudio/piper-wasm/build/piper_phonemize.js' {
  type PiperPhonemize = { callMain: (args: string[]) => void }
  export default function createPiperPhonemize(options: {
    noInitialRun?: boolean
    print?: (value: string) => void
    printErr?: (value: string) => void
    locateFile?: (name: string) => string
  }): Promise<PiperPhonemize>
}
