export type SupertonicStyle = { ttl: unknown; dp: unknown }
export const standardWasmRuntime: boolean
export type SupertonicTts = {
  sampleRate: number
  call(text: string, lang: string, style: SupertonicStyle, totalStep: number, speed?: number, silenceDuration?: number, progressCallback?: (step: number, total: number) => void): Promise<{ wav: number[]; duration: number[] }>
}
export function loadTextToSpeech(onnxDir: string, sessionOptions?: Record<string, unknown>, progressCallback?: (model: string, current: number, total: number) => void): Promise<{ textToSpeech: SupertonicTts; cfgs: unknown }>
export function loadVoiceStyle(paths: string[], verbose?: boolean): Promise<SupertonicStyle>
export function writeWavFile(audioData: number[], sampleRate: number): ArrayBuffer
