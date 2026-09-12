import { describe, expect, it } from 'vitest'
import { isAppleTouchDevice } from './runtimePlatform'

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
