import { test, expect } from '@playwright/test'
import {
  attachConsoleGuard,
  assertFocusVisibleKeyboard,
  assertDocumentDoesNotScroll,
  assertNoDoubleTapZoom,
  assertNoHorizontalOverflow,
  assertPrimaryControlsMinSize,
  dismissPwaBanners,
  emulateReducedMotion,
  PUBLIC_ROUTES,
  RESPONSIVE_VIEWPORTS,
  ROUTE_PRIMARY_CONTROL_SELECTORS,
} from './helpers'

for (const viewport of RESPONSIVE_VIEWPORTS) {
  test.describe(`responsive ${viewport.label}`, () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} has no horizontal overflow and usable layout`, async ({ page }) => {
        const guard = attachConsoleGuard(page)
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(route)
        await dismissPwaBanners(page)

        await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
        await assertNoHorizontalOverflow(page)
        await assertDocumentDoesNotScroll(page)
        await assertNoDoubleTapZoom(page)

        const mainVisible = await page.evaluate(() => {
          const main = document.querySelector('main')
          if (!(main instanceof HTMLElement)) {
            return false
          }
          const rect = main.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })
        expect(mainVisible, 'main content should be visible').toBe(true)

        if (route !== '/') {
          const selector = ROUTE_PRIMARY_CONTROL_SELECTORS[route]
          expect(selector, `missing primary selector for ${route}`).toBeTruthy()
          await assertPrimaryControlsMinSize(page, selector!)
        } else {
          const homeCards = page.locator('[data-testid^="home-game-"]')
          await expect(homeCards).toHaveCount(5)
          const cardHeight = await homeCards
            .first()
            .evaluate((element) => element.getBoundingClientRect().height)
          expect(cardHeight).toBeGreaterThanOrEqual(43)
        }

        guard.assertClean()
        guard.dispose()
      })
    }
  })
}

test.describe('accessibility basics', () => {
  test('focus-visible works on home card and keyboard activates navigation', async ({ page }) => {
    const guard = attachConsoleGuard(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    await assertFocusVisibleKeyboard(page, '[data-testid="home-game-crocodile"]')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/games\/crocodile/)

    guard.assertClean()
    guard.dispose()
  })

  test('reduced motion keeps slot spin controls usable', async ({ page }) => {
    const guard = attachConsoleGuard(page)
    await emulateReducedMotion(page)
    await page.setViewportSize({ width: 320, height: 740 })
    await page.goto('/games/slot')

    await expect(page.getByTestId('slot-lever')).toBeVisible()
    await page.getByTestId('slot-lever').click()
    await expect(page.getByTestId('slot-result')).toBeVisible()
    await assertNoHorizontalOverflow(page)

    guard.assertClean()
    guard.dispose()
  })
})
