import { describe, expect, it } from 'vitest'
import { formatFrenchIpa } from './ipaFormat'

describe('French IPA formatting', () => {
  it('formats phonemes returned by the local French phonemizer', () => {
    expect(formatFrenchIpa(JSON.stringify({ phonemes: ['b', 'ɔ', '̃', 'ʒ', 'ˈ', 'u', 'ʁ', '!'] }))).toBe('/bɔ̃ʒˈuʁ/')
  })
  it('shows liaison without a spelling hyphen', () => {
    expect(formatFrenchIpa(JSON.stringify({ phonemes: ['l', 'e', '-', 'z', ' ', 'a', 'm', 'i', '.'] }))).toBe('/le‿z ami/')
  })
  it('rejects a malformed response', () => {
    expect(() => formatFrenchIpa('{"phonemes":[]}')).toThrow('No pronunciation')
  })
})
