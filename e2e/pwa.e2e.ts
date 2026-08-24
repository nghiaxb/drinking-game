import { test, expect } from '@playwright/test'
import { PWA_MANIFEST } from '../src/pwa/manifest'
import { verifyManifestContent } from '../src/build/dist-verification'
import {
  activatePwaForOffline,
  attachConsoleGuard,
  blockExternalOrigins,
  waitForServiceWorkerController,
} from './helpers'

test.describe.configure({ mode: 'serial' })

test.describe('PWA production', () => {
  test.beforeEach(async ({ context }) => {
    await blockExternalOrigins(context)
  })

  test('manifest fetch returns required fields and icons HTTP 200', async ({ request, baseURL }) => {
    const manifestResponse = await request.get(`${baseURL}/manifest.webmanifest`)
    expect(manifestResponse.status()).toBe(200)

    const manifest = await manifestResponse.json()
    expect(verifyManifestContent(manifest)).toEqual([])

    expect(manifest.name).toBe(PWA_MANIFEST.name)
    expect(manifest.short_name).toBe(PWA_MANIFEST.short_name)
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')

    for (const icon of PWA_MANIFEST.icons) {
      const iconResponse = await request.get(`${baseURL}${icon.src}`)
      expect(iconResponse.status(), icon.src).toBe(200)
    }
  })

  test('service worker registers, becomes ready, and controls the page', async ({ page }) => {
    const guard = attachConsoleGuard(page)
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

    const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    expect(controlled).toBe(true)

    guard.assertClean()
    guard.dispose()
  })

  test('offline after first load keeps primary UI visible on cards and wheel', async ({ page, context }) => {
    const guard = attachConsoleGuard(page)
    await activatePwaForOffline(page)

    await context.setOffline(true)

    await page.goto('/games/cards')
    await expect(page.getByTestId('cards-view')).toBeVisible()
    await expect(page.getByTestId('cards-draw-button')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('cards-view')).toBeVisible()

    await page.goto('/games/wheel')
    await expect(page.getByTestId('wheel-view')).toBeVisible()
    await expect(page.getByTestId('wheel-spin-button')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('wheel-view')).toBeVisible()

    await context.setOffline(false)

    guard.assertClean()
    guard.dispose()
  })

  test('blocks network requests to external origins', async ({ page }) => {
    const guard = attachConsoleGuard(page)
    await page.goto('/')
    await expect(page.getByTestId('app-shell')).toBeVisible()

    const probe = page.waitForEvent('requestfailed', {
      predicate: (request) => request.url().includes('example.com'),
      timeout: 5_000,
    })
    await page.evaluate(() => {
      void fetch('https://example.com/drinking-games-probe')
    })
    const failedRequest = await probe
    expect(failedRequest.failure()?.errorText ?? '').toMatch(/ERR_BLOCKED_BY_CLIENT/i)

    guard.assertClean()
    guard.dispose()
  })
})
