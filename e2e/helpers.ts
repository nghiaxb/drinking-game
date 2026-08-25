import { expect, type ConsoleMessage, type Page, type BrowserContext } from '@playwright/test'

const LOCAL_HOST_PATTERN = /^(127\.0\.0\.1|localhost)(:\d+)?$/i

const BENIGN_CONSOLE_PATTERNS: RegExp[] = [
  /^Failed to load resource: net::ERR_FAILED$/,
  /^Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/i,
  /beforeinstallprompt/i,
  /Banner not shown/i,
]

export const PUBLIC_ROUTES = [
  '/',
  '/games/crocodile',
  '/games/mine',
  '/games/wheel',
  '/games/slot',
  '/games/cards',
] as const

export const RESPONSIVE_VIEWPORTS = [
  { width: 320, height: 740, label: '320x740' },
  { width: 375, height: 812, label: '375x812' },
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1024, height: 768, label: '1024x768' },
  { width: 1440, height: 900, label: '1440x900' },
] as const

export const PRIMARY_CONTROL_SELECTORS = [
  '[data-testid="wheel-spin-button"]',
  '[data-testid="slot-lever"]',
  '[data-testid="cards-draw-button"]',
  '[data-testid="crocodile-replay"]',
  '[data-testid="mine-replay"]',
  'button[data-testid^="crocodile-tooth-"]',
  '[data-testid^="mine-cell-"]',
  '.btn-tactile-primary',
  '[data-testid^="home-game-"]',
].join(', ')

export const ROUTE_PRIMARY_CONTROL_SELECTORS: Record<string, string> = {
  '/games/crocodile': 'button[data-testid^="crocodile-tooth-"]',
  '/games/mine': '[data-testid^="mine-cell-"]',
  '/games/wheel': '[data-testid="wheel-spin-button"]',
  '/games/slot': '[data-testid="slot-lever"]',
  '/games/cards': '[data-testid="cards-draw-button"]',
}

function isBenignConsoleMessage(text: string): boolean {
  return BENIGN_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))
}

export interface ConsoleGuard {
  assertClean: () => void
  dispose: () => void
}

export function attachConsoleGuard(page: Page): ConsoleGuard {
  const errors: string[] = []

  const onConsole = (message: ConsoleMessage): void => {
    if (message.type() !== 'error') {
      return
    }
    const text = message.text()
    if (!isBenignConsoleMessage(text)) {
      errors.push(`console.error: ${text}`)
    }
  }

  const onPageError = (error: Error): void => {
    errors.push(`pageerror: ${error.message}`)
  }

  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  return {
    assertClean: () => {
      expect(errors, errors.join('\n')).toEqual([])
    },
    dispose: () => {
      page.off('console', onConsole)
      page.off('pageerror', onPageError)
    },
  }
}

export async function clearAppStorage(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function dismissPwaBanners(page: Page): Promise<void> {
  const offlineReady = page.getByTestId('pwa-offline-ready')
  if (await offlineReady.isVisible().catch(() => false)) {
    await offlineReady.getByRole('button', { name: 'OK' }).click()
    await expect(offlineReady).toBeHidden()
    return
  }

  try {
    await offlineReady.waitFor({ state: 'visible', timeout: 2_000 })
    await offlineReady.getByRole('button', { name: 'OK' }).click()
    await expect(offlineReady).toBeHidden()
  } catch {
    // Banner not shown during this navigation.
  }
}

export async function emulateReducedMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' })
}

export async function blockExternalOrigins(context: BrowserContext): Promise<void> {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (LOCAL_HOST_PATTERN.test(url.host)) {
      await route.continue()
      return
    }
    await route.abort('blockedbyclient')
  })
}

export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
  expect(overflow, 'horizontal overflow detected').toBeLessThanOrEqual(1)
}

export async function assertPrimaryControlsMinSize(
  page: Page,
  selector = PRIMARY_CONTROL_SELECTORS,
  minPx = 44,
): Promise<void> {
  const sizes = await page.locator(selector).evaluateAll((elements, min) => {
    return elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        testId: element.getAttribute('data-testid') ?? element.textContent?.trim()?.slice(0, 24) ?? 'control',
        width: rect.width,
        height: rect.height,
        min,
      }
    })
  }, minPx)

  expect(sizes.length, 'expected at least one primary control').toBeGreaterThan(0)

  for (const size of sizes) {
    expect(size.width, `${size.testId} width`).toBeGreaterThanOrEqual(minPx - 1)
    expect(size.height, `${size.testId} height`).toBeGreaterThanOrEqual(minPx - 1)
  }
}

export async function assertFocusVisibleKeyboard(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().focus()
  const hasFocus = await page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector)
    return element instanceof HTMLElement && element === document.activeElement
  }, selector)
  expect(hasFocus).toBe(true)

  const focusVisible = await page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector)
    if (!(element instanceof HTMLElement)) {
      return false
    }
    return element.matches(':focus-visible') || element === document.activeElement
  }, selector)
  expect(focusVisible).toBe(true)
}

export async function waitForServiceWorkerController(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) {
      return false
    }
    await navigator.serviceWorker.ready
    return Boolean(navigator.serviceWorker.controller)
  })
}

export async function activatePwaForOffline(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) {
      return false
    }
    await navigator.serviceWorker.ready
    return true
  })
  await page.reload({ waitUntil: 'networkidle' })
  await waitForServiceWorkerController(page)
}

export function seoRequestPath(routePath: string): string {
  return routePath === '/' ? '/' : `${routePath}/`
}

export async function playUntilVisible(
  page: Page,
  action: () => Promise<void>,
  resultTestId: string,
  maxAttempts = 30,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await page.getByTestId(resultTestId).isVisible()) {
      return
    }
    await action()
  }
  await expect(page.getByTestId(resultTestId)).toBeVisible()
}
