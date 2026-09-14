import { describe, expect, it } from 'vitest'
import { charIndexToWord, splitIntoSentences } from './text'

describe('text parsing', () => {
  it('splits French punctuation into sentences', () => expect(splitIntoSentences('Bonjour ! Comment allez-vous ?')).toHaveLength(2))
  it('keeps a trailing sentence without punctuation', () => expect(splitIntoSentences('Une phrase')).toHaveLength(1))
  it('splits at line breaks even without punctuation and skips empty lines', () => {
    expect(splitIntoSentences('Bonjour\n\nComment allez-vous ? Merci\r\nÀ bientôt\rSalut').map(sentence => sentence.text))
      .toEqual(['Bonjour', 'Comment allez-vous ?', 'Merci', 'À bientôt', 'Salut'])
  })
  it('maps synthesis boundaries to words', () => expect(charIndexToWord(['Bonjour', 'tout', 'le', 'monde'], 9)).toBe(1))
})
