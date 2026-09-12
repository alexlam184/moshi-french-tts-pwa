export function isIPad(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPad/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}
