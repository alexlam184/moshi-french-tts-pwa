import { describe, expect, it } from 'vitest'
import { detectStandardWasmRuntime, isAppleTouchDevice, isSafariBrowser } from './runtimePlatform'

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

describe('Brave runtime detection', () => {
  const macChromeIdentity = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    maxTouchPoints: 0,
  }

  it('uses standard WASM for Brave even when its user agent says Chrome', async () => {
    expect(await detectStandardWasmRuntime({ ...macChromeIdentity, brave: { isBrave: async () => true } }, false)).toBe(true)
  })

  it('recognizes Brave client hints when its JavaScript API is hidden', async () => {
    expect(await detectStandardWasmRuntime({ ...macChromeIdentity, userAgentData: { brands: [{ brand: 'Brave' }] } }, false)).toBe(true)
  })

  it('uses standard WASM for a Mac standalone app if Brave detection is hidden', async () => {
    expect(await detectStandardWasmRuntime(macChromeIdentity, true)).toBe(true)
  })

  it('still uses standard WASM if Brave detection rejects in a Mac standalone app', async () => {
    expect(await detectStandardWasmRuntime({ ...macChromeIdentity, brave: { isBrave: async () => { throw new Error('blocked') } } }, true)).toBe(true)
  })

  it('keeps WebGPU available in an ordinary desktop Chrome tab', async () => {
    expect(await detectStandardWasmRuntime(macChromeIdentity, false)).toBe(false)
  })
})
