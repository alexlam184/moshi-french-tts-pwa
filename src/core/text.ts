export type Sentence = { id: string; text: string; words: string[]; translation: string }

const SAMPLE_TRANSLATIONS: Record<string, string> = {
  "Bonjour !": "Hello!",
  "Je m'appelle Alex et j'apprends le français.": "My name is Alex and I am learning French.",
  "Chaque jour, j'écoute quelques phrases.": "Every day, I listen to a few sentences.",
  "Puis, je répète les mots à voix haute.": "Then, I repeat the words out loud.",
}

export const SAMPLE_TEXT = Object.keys(SAMPLE_TRANSLATIONS).join(' ')

export function splitIntoSentences(input: string): Sentence[] {
  const text = input.trim()
  if (!text) return []
  const parts = text.match(/[^.!?…]+[.!?…]+[”»]?|[^.!?…]+$/g) ?? [text]
  return parts.map((part, index) => {
    const clean = part.trim()
    return {
      id: `${index}-${clean.slice(0, 16)}`,
      text: clean,
      words: clean.split(/\s+/),
      translation: SAMPLE_TRANSLATIONS[clean] ?? 'translation available when a language model is connected',
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
