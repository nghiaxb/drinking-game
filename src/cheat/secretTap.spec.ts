import { describe, it, expect } from 'vitest'
import { createSecretTap, SECRET_TAP_COUNT, SECRET_TAP_WINDOW_MS } from './secretTap'

describe('createSecretTap', () => {
  it('unlocks on the configured tap count', () => {
    const tap = createSecretTap()
    let now = 1_000

    for (let i = 1; i < SECRET_TAP_COUNT; i += 1) {
      expect(tap.tap((now += 100))).toBe(false)
    }
    expect(tap.tap((now += 100))).toBe(true)
  })

  it('forgets taps older than the window', () => {
    const tap = createSecretTap(3, 1_000)

    expect(tap.tap(0)).toBe(false)
    expect(tap.tap(500)).toBe(false)
    // The first tap has aged out, so this is only the second tap in the window.
    expect(tap.tap(1_100)).toBe(false)
    expect(tap.tap(1_200)).toBe(true)
  })

  it('resets after unlocking so a second run needs the full count again', () => {
    const tap = createSecretTap(3, 1_000)

    expect(tap.tap(0)).toBe(false)
    expect(tap.tap(10)).toBe(false)
    expect(tap.tap(20)).toBe(true)

    expect(tap.tap(30)).toBe(false)
    expect(tap.tap(40)).toBe(false)
    expect(tap.tap(50)).toBe(true)
  })

  it('never unlocks on a slow tap that stays one short of the count', () => {
    const tap = createSecretTap(3, 1_000)

    for (let i = 0; i < 20; i += 1) {
      // Two taps per window, then a gap wider than the window.
      expect(tap.tap(i * 2_000)).toBe(false)
      expect(tap.tap(i * 2_000 + 100)).toBe(false)
    }
  })

  it('exposes a window long enough to be reachable but short enough to be deliberate', () => {
    expect(SECRET_TAP_COUNT).toBe(7)
    expect(SECRET_TAP_WINDOW_MS).toBe(3_000)
  })
})
