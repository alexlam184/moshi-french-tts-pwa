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

  it('reports cache changes when audio is added, evicted, or cleared', () => {
    const cache = new MemoryAudioCache(10)
    const sizes: number[] = []
    const unsubscribe = cache.subscribe(() => sizes.push(cache.sizeBytes))

    cache.set('first', new Blob(['123456']))
    cache.set('second', new Blob(['abcdef']))
    cache.clear()
    unsubscribe()
    cache.set('third', new Blob(['123']))

    expect(sizes).toEqual([6, 6, 0])
  })

  it('updates the reported size when an oversized replacement removes cached audio', () => {
    const cache = new MemoryAudioCache(5)
    const sizes: number[] = []
    cache.subscribe(() => sizes.push(cache.sizeBytes))
    cache.set('word', new Blob(['123']))
    cache.set('word', new Blob(['123456']))

    expect(sizes).toEqual([3, 0])
  })
})
