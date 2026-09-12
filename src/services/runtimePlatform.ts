export function isAppleTouchDevice(userAgent: string, platform: string, maxTouchPoints: number) {
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

export function isSafariBrowser(userAgent: string) {
  return /AppleWebKit/i.test(userAgent)
    && /Version\/[\d.]+.*Safari\//i.test(userAgent)
    && !/CriOS|Chrome|Chromium|Edg|FxiOS|Firefox|OPR|OPiOS/i.test(userAgent)
}

export function useStandardWasmRuntime() {
  if (typeof navigator === 'undefined') return false
  return isAppleTouchDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
    || isSafariBrowser(navigator.userAgent)
}
