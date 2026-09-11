import { describe, expect, it } from 'vitest'
import { voicesForEngine } from './models'

describe('engine voice catalog', () => {
  it('keeps Piper voices separate from Supertonic styles', () => {
    expect(voicesForEngine('piper', []).map(v => v.id)).toEqual(['fr_FR-siwis-medium'])
    expect(voicesForEngine('supertonic', []).map(v => v.id)).toEqual([
      'F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5',
    ])
  })
})
