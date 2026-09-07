import { test, expect } from '@playwright/test'
import { HOME_GAME_CARDS } from '../src/app/homeGames'
import { attachConsoleGuard, clearAppStorage } from './helpers'

test.describe.configure({ mode: 'serial' })

test.describe('home and settings', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page)
  })

  test('home renders a card for every game with correct routes', async ({ page }) => {
    const guard = attachConsoleGuard(page)
    await page.goto('/')

    await expect(page.getByTestId('home-view')).toBeVisible()
    // Derived, not hardcoded: the real contract is that every card in the data renders, and that
    // the page shows no extras.
    await expect(page.locator('[data-testid^="home-game-"]')).toHaveCount(HOME_GAME_CARDS.length)

    for (const game of HOME_GAME_CARDS) {
      const card = page.getByTestId(`home-game-${game.id}`)
      await expect(card).toBeVisible()
      await expect(card).toContainText(game.label)
      await expect(card).toContainText(game.emoji)
      await expect(card).toHaveAttribute('href', game.path)
    }

    guard.assertClean()
    guard.dispose()
  })

  test('settings toggles persist across reload', async ({ page }) => {
    const guard = attachConsoleGuard(page)
    await page.goto('/settings')

    const soundToggle = page.getByTestId('settings-sound-toggle')
    const vibrationToggle = page.getByTestId('settings-vibration-toggle')

    await expect(soundToggle).toBeChecked()
    await expect(vibrationToggle).toBeChecked()

    await soundToggle.uncheck()
    await vibrationToggle.uncheck()

    await page.reload()
    await expect(page.getByTestId('settings-view')).toBeVisible()
    await expect(soundToggle).not.toBeChecked()
    await expect(vibrationToggle).not.toBeChecked()

    guard.assertClean()
    guard.dispose()
  })

  test('settings reset shows confirm dialog and toast', async ({ page }) => {
    const guard = attachConsoleGuard(page)
    await page.goto('/settings')

    await page.getByTestId('reset-game-button').click()
    await expect(page.getByTestId('confirm-dialog-game')).toBeVisible()
    await page.getByTestId('confirm-dialog-game').getByTestId('confirm-accept').click()
    await expect(page.getByTestId('settings-toast')).toContainText('Đã xoá dữ liệu trò chơi')

    await page.getByTestId('reset-all-button').click()
    await expect(page.getByTestId('confirm-dialog-all')).toBeVisible()
    await page.getByTestId('confirm-dialog-all').getByTestId('confirm-accept').click()
    await expect(page.getByTestId('settings-toast')).toContainText('mặc định')
    await expect(page.getByTestId('settings-sound-toggle')).toBeChecked()
    await expect(page.getByTestId('settings-vibration-toggle')).toBeChecked()

    guard.assertClean()
    guard.dispose()
  })
})
