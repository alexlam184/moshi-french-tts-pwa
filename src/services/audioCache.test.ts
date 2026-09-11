import { describe, expect, it } from 'vitest'
import { MemoryAudioCache } from './audioCache'

describe('MemoryAudioCache', () => {
  it('removes the oldest audio when the memory limit is reached', () => {
    const cache = new MemoryAudioCache(10)
    cache.set('first', new Blob(['123456']))
    cache.set('second', new Blob(['abcdef']))

    expect(cache.has('first')).toBe(false)
    expect(cache.has('second')).toBe(true)
    expect(cache.sizeBytes).toBe(6)
  })

  it('clears all session audio', () => {
    const cache = new MemoryAudioCache(10)
    cache.set('sentence', new Blob(['audio']))
    cache.clear()

    expect(cache.has('sentence')).toBe(false)
    expect(cache.sizeBytes).toBe(0)
  })
})
