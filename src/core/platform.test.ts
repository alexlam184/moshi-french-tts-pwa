import { describe, expect, it } from 'vitest'
import { isIPad } from './platform'

describe('isIPad', () => {
  it('recognizes iPad user agents and desktop-style iPad identification', () => {
    expect(isIPad('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 'iPad', 5)).toBe(true)
    expect(isIPad('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 5)).toBe(true)
  })

  it('does not show the iPad warning on a Mac or iPhone', () => {
    expect(isIPad('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 0)).toBe(false)
    expect(isIPad('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'iPhone', 5)).toBe(false)
  })
})
