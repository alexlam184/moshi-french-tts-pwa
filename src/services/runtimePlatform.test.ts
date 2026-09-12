import { describe, expect, it } from 'vitest'
import { isAppleTouchDevice, isSafariBrowser } from './runtimePlatform'

describe('Apple touch device detection', () => {
  it('recognizes iPad and iPhone user agents', () => {
    expect(isAppleTouchDevice('Mozilla/5.0 (iPad; CPU OS 18_0)', 'iPad', 5)).toBe(true)
    expect(isAppleTouchDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', 'iPhone', 5)).toBe(true)
  })

  it('recognizes desktop-class iPad user agents without affecting Macs', () => {
    expect(isAppleTouchDevice('Mozilla/5.0 (Macintosh)', 'MacIntel', 5)).toBe(true)
    expect(isAppleTouchDevice('Mozilla/5.0 (Macintosh)', 'MacIntel', 0)).toBe(false)
  })

  it('keeps other devices on the existing runtime', () => {
    expect(isAppleTouchDevice('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 10)).toBe(false)
  })
})

describe('Safari runtime detection', () => {
  it('uses standard WASM for Mac Safari', () => {
    expect(isSafariBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15')).toBe(true)
  })

  it('keeps WebGPU available to desktop Chrome', () => {
    expect(isSafariBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')).toBe(false)
  })
})
