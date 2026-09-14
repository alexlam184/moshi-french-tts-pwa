import { beforeEach, describe, expect, it, vi } from 'vitest'

const tensors = vi.hoisted(() => [] as { data: ArrayLike<number>; dims: number[]; dispose: ReturnType<typeof vi.fn> }[])
vi.mock('../runtimePlatform', () => ({ detectStandardWasmRuntime: async () => true, isAppleTouchDevice: () => false, isSafariBrowser: () => false }))
vi.mock('onnxruntime-web/wasm', () => ({
  env: { wasm: {} },
  Tensor: class {
    dispose = vi.fn()
    constructor(public type: string, public data: ArrayLike<number>, public dims: number[]) { tensors.push(this) }
  },
}))
// The app's declaration exposes its loader; this test exercises the vendor class.
// @ts-expect-error Internal implementation export.
import { TextToSpeech } from './vendor-helper.js'
import { Tensor } from 'onnxruntime-web/wasm'

function fixture() {
  let previous: unknown
  const vector = { run: vi.fn(async (feeds: { noisy_latent: Tensor }) => {
    if (previous) expect(feeds.noisy_latent).toBe(previous)
    const next = new Tensor('float32', new Float32Array([Number(feeds.noisy_latent.data[0]) + 1]), [1, 1, 1])
    previous = next
    return { denoised_latent: next }
  }) }
  const vocoder = { run: vi.fn(async (feeds: { latent: Tensor }) => ({ wav_tts: new Tensor('float32', new Float32Array([Number(feeds.latent.data[0])]), [1]) })) }
  const tts = new TextToSpeech(
    { ae: { sample_rate: 1, base_chunk_size: 1 }, ttl: { chunk_compress_factor: 1, latent_dim: 1 } },
    { call: () => ({ textIds: [[1]], textMask: [[[1]]] }) },
    { run: async () => ({ duration: new Tensor('float32', new Float32Array([1]), [1]) }) },
    { run: async () => ({ text_emb: new Tensor('float32', new Float32Array([1]), [1]) }) },
    vector, vocoder,
  )
  tts.sampleNoisyLatent = () => ({ xt: [[[0]]], latentMask: [[[1]]] })
  return { tts, vector, vocoder }
}

describe('Supertonic inference memory lifecycle', () => {
  beforeEach(() => { tensors.length = 0 })
  it.each([4, 8])('runs exactly %i denoising steps and disposes temporary tensors once', async steps => {
    const { tts, vector } = fixture()
    const result = await tts._infer(['bonjour'], ['fr'], { dp: {}, ttl: {} }, steps, 1)
    expect(result).toEqual({ wav: [steps], duration: [1] })
    expect(vector.run).toHaveBeenCalledTimes(steps)
    for (const tensor of tensors) expect(tensor.dispose).toHaveBeenCalledTimes(1)
  })
  it('releases tensors and skips remaining work when cancelled between steps', async () => {
    const { tts, vector, vocoder } = fixture()
    await expect(tts._infer(['bonjour'], ['fr'], { dp: {}, ttl: {} }, 8, 1, (step: number) => {
      if (step === 2) throw new Error('cancelled')
    })).rejects.toThrow('cancelled')
    expect(vector.run).toHaveBeenCalledTimes(1)
    expect(vocoder.run).not.toHaveBeenCalled()
    for (const tensor of tensors) expect(tensor.dispose).toHaveBeenCalledTimes(1)
  })
})
