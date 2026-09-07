import { test, expect, type Page } from '@playwright/test'
import {
  attachConsoleGuard,
  clearAppStorage,
  dismissPwaBanners,
  emulateReducedMotion,
  playUntilVisible,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await clearAppStorage(page)
})

async function prepareGamePage(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await dismissPwaBanners(page)
}

test('crocodile: click teeth until result then replay', async ({ page }) => {
  const guard = attachConsoleGuard(page)
  await prepareGamePage(page, '/games/crocodile')
  await expect(page.getByTestId('crocodile-view')).toBeVisible()

  for (let index = 0; index < 14; index += 1) {
    await dismissPwaBanners(page)
    if (await page.getByTestId('crocodile-result').isVisible()) {
      break
    }
    const tooth = page.getByTestId(`crocodile-tooth-${index}`)
    if (await tooth.isEnabled()) {
      await tooth.click()
    }
  }

  await expect(page.getByTestId('crocodile-result')).toBeVisible()

  await expect(page.getByTestId('crocodile-result')).toContainText('CÁ SẤU CẮN')
  await page.getByTestId('crocodile-replay').click()
  await expect(page.getByTestId('crocodile-result')).not.toBeVisible()
  await expect(page.getByTestId('crocodile-toy')).toBeVisible()

  guard.assertClean()
  guard.dispose()
})

test('mine: click cells until result then replay', async ({ page }) => {
  const guard = attachConsoleGuard(page)
  await prepareGamePage(page, '/games/mine')
  await expect(page.getByTestId('mine-view')).toBeVisible()

  await playUntilVisible(
    page,
    async () => {
      const cell = page.locator('[data-testid^="mine-cell-"]:not([disabled])').first()
      if (await cell.count()) {
        await cell.click()
      }
    },
    'mine-result',
  )

  await expect(page.getByTestId('mine-result')).toContainText('ẾCH KHÓC')
  await page.getByTestId('mine-replay').click()
  await expect(page.getByTestId('mine-result')).not.toBeVisible()
  await expect(page.getByTestId('mine-grid')).toBeVisible()

  guard.assertClean()
  guard.dispose()
})

test('wheel: reduced-motion spin, editor add id persist reload and reset', async ({ page }) => {
  const guard = attachConsoleGuard(page)
  await emulateReducedMotion(page)
  await prepareGamePage(page, '/games/wheel')
  await expect(page.getByTestId('wheel-view')).toBeVisible()

  await page.getByTestId('wheel-spin-button').click()
  await expect(page.getByTestId('wheel-result')).toBeVisible()
  await expect(page.getByTestId('wheel-result')).not.toBeEmpty()
  await page.getByTestId('wheel-dismiss-result').click()
  await expect(page.getByTestId('wheel-result')).not.toBeVisible()

  const customLabel = 'Playwright Item'
  await page.getByTestId('wheel-editor-add').click()
  await page.getByTestId('wheel-editor-label').fill(customLabel)
  await page.getByTestId('wheel-editor-save').click()
  await expect(page.getByTestId('wheel-item-row-playwright-item')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('wheel-view')).toBeVisible()
  await expect(page.getByTestId('wheel-item-row-playwright-item')).toBeVisible()

  await page.getByTestId('wheel-editor-reset').click()
  await expect(page.getByTestId('wheel-item-row-playwright-item')).toHaveCount(0)

  guard.assertClean()
  guard.dispose()
})

test('cards: draw, deck/filter/reshuffle, keyboard on draw button', async ({ page }) => {
  const guard = attachConsoleGuard(page)
  await emulateReducedMotion(page)
  await prepareGamePage(page, '/games/cards')
  await expect(page.getByTestId('cards-view')).toBeVisible()

  const counterBefore = await page.getByTestId('cards-counter').innerText()

  await page.getByTestId('cards-draw-button').click()
  await expect(page.getByTestId('card-face-front')).toBeVisible()
  await expect(page.locator('.card-front-text')).not.toBeEmpty()
  await expect(page.getByTestId('cards-counter').innerText()).not.toBe(counterBefore)

  await page.getByTestId('cards-deck-dare').click()
  await expect(page.getByTestId('cards-deck-dare')).toHaveAttribute('aria-pressed', 'true')

  await page.getByTestId('cards-deck-truth').click()
  await expect(page.getByTestId('cards-truth-filters')).toBeVisible()
  await page.getByTestId('cards-truth-medium').click()
  await expect(page.getByTestId('cards-truth-medium')).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId('cards-truth-medium').click()
  await expect(page.getByTestId('cards-truth-medium')).toHaveAttribute('aria-pressed', 'true')

  await page.getByTestId('cards-reshuffle-button').click()
  await expect(page.getByTestId('cards-counter')).toContainText('Còn')

  const drawButton = page.getByTestId('cards-draw-button')
  await drawButton.focus()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('card-face-front')).toBeVisible()

  guard.assertClean()
  guard.dispose()
})

test('bomb: pass the phone, blast on a hidden fuse, then replay', async ({ page }) => {
  const guard = attachConsoleGuard(page)
  await emulateReducedMotion(page)
  // Fake clock: the fuse is tens of seconds of real time, and the test must not wait it out.
  await page.clock.install()
  await prepareGamePage(page, '/games/bomb')

  await expect(page.getByTestId('bomb-view')).toBeVisible()
  await expect(page.getByTestId('bomb-intro')).toBeVisible()
  await expect(page.getByTestId('bomb-fuse')).toContainText('15–35 giây')

  // Narrow the window so the round is short, and check the setting survives a reload.
  await page.getByTestId('bomb-fuse-max').fill('20000')
  await expect(page.getByTestId('bomb-fuse')).toContainText('15–20 giây')
  await page.reload()
  await dismissPwaBanners(page)
  await expect(page.getByTestId('bomb-fuse')).toContainText('15–20 giây')

  await page.getByTestId('bomb-start').click()
  await expect(page.getByTestId('bomb-stage')).toBeVisible()
  await expect(page.getByTestId('bomb-fuse')).toHaveCount(0)
  await expect(page.getByTestId('bomb-topic')).not.toBeEmpty()
  await expect(page.getByTestId('bomb-category')).not.toBeEmpty()

  // Nothing on screen may count down: knowing when it blows would end the game.
  await expect(page.getByTestId('bomb-stage')).toContainText('????')
  await expect(page.locator('[role="progressbar"], [role="meter"], progress')).toHaveCount(0)

  await page.clock.fastForward(21_000)
  await expect(page.getByTestId('bomb-result')).toBeVisible()

  // Guarded so a tap already heading for the replay button cannot wipe the result on landing.
  await expect(page.getByTestId('bomb-replay')).toBeDisabled()
  await page.clock.fastForward(600)
  await expect(page.getByTestId('bomb-replay')).toBeEnabled()

  await page.getByTestId('bomb-replay').click()
  await expect(page.getByTestId('bomb-topic')).not.toBeEmpty()

  guard.assertClean()
  guard.dispose()
})
