export function isAppleTouchDevice(userAgent: string, platform: string, maxTouchPoints: number) {
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

export function isSafariBrowser(userAgent: string) {
  return /AppleWebKit/i.test(userAgent)
    && /Version\/[\d.]+.*Safari\//i.test(userAgent)
    && !/CriOS|Chrome|Chromium|Edg|FxiOS|Firefox|OPR|OPiOS/i.test(userAgent)
}

type BrowserIdentity = {
  userAgent: string
  platform: string
  maxTouchPoints: number
  brave?: { isBrave?: () => Promise<boolean> }
  userAgentData?: { brands?: readonly { brand: string }[] }
}

export async function detectStandardWasmRuntime(browser: BrowserIdentity, standalone: boolean) {
  if (isAppleTouchDevice(browser.userAgent, browser.platform, browser.maxTouchPoints)
    || isSafariBrowser(browser.userAgent)) return true

  if (browser.userAgentData?.brands?.some(item => item.brand === 'Brave')) return true

  try {
    if (await browser.brave?.isBrave?.()) return true
  } catch { /* Brave detection can be unavailable in an installed app */ }

  // Brave's desktop user agent resembles Chrome. A Mac standalone app is a
  // conservative fallback if Brave does not expose its detection API there.
  return standalone && (/Macintosh/i.test(browser.userAgent) || browser.platform === 'MacIntel')
}
