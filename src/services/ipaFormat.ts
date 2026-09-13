type PhonemizerResult = { phonemes?: unknown }

export function formatFrenchIpa(output: string): string {
  const parsed: PhonemizerResult = JSON.parse(output)
  if (!Array.isArray(parsed.phonemes) || !parsed.phonemes.every(item => typeof item === 'string')) {
    throw new Error('The pronunciation engine returned invalid IPA')
  }
  const phonemes = parsed.phonemes as string[]
  // The phonemizer marks French liaison with a hyphen. An undertie makes that
  // relationship legible in IPA while leaving its stress/phoneme data intact.
  const text = phonemes.join('').replaceAll('-', '‿').replace(/\s+/g, ' ').trim()
    .replace(/^[\s,;:!?…]+|[\s,;:!?….]+$/g, '')
  if (!text) throw new Error('No pronunciation was returned for this sentence')
  return `/${text}/`
}
