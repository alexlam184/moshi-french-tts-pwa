export type Sentence = { id: string; text: string; words: string[]; ipa: string; translation: string }

const SAMPLE_DETAILS: Record<string, [string, string]> = {
  "Bonjour !": ["/bɔ̃.ʒuʁ/", "Hello!"],
  "Je m'appelle Alex et j'apprends le français.": ["/ʒə ma.pɛl a.lɛks e ʒa.pʁɑ̃ lə fʁɑ̃.sɛ/", "My name is Alex and I am learning French."],
  "Chaque jour, j'écoute quelques phrases.": ["/ʃak ʒuʁ ʒe.kut kɛlk fʁaz/", "Every day, I listen to a few sentences."],
  "Puis, je répète les mots à voix haute.": ["/pɥi ʒə ʁe.pɛt le mo a vwa ot/", "Then, I repeat the words out loud."],
}

export const SAMPLE_TEXT = Object.keys(SAMPLE_DETAILS).join(' ')

export function splitIntoSentences(input: string): Sentence[] {
  const text = input.trim()
  if (!text) return []
  const parts = text.match(/[^.!?…]+[.!?…]+[”»]?|[^.!?…]+$/g) ?? [text]
  return parts.map((part, index) => {
    const clean = part.trim()
    const details = SAMPLE_DETAILS[clean] ?? ["pronunciation available when a language model is connected", "translation available when a language model is connected"]
    return {
      id: `${index}-${clean.slice(0, 16)}`,
      text: clean,
      words: clean.split(/\s+/),
      ipa: details[0],
      translation: details[1],
    }
  })
}

export function charIndexToWord(words: string[], charIndex: number) {
  let cursor = 0
  for (let i = 0; i < words.length; i += 1) {
    const end = cursor + words[i].length
    if (charIndex <= end) return i
    cursor = end + 1
  }
  return Math.max(0, words.length - 1)
}
