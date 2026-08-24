import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGameFeedback, type GameFeedbackDeps } from './useGameFeedback'

function createDeps(overrides: Partial<GameFeedbackDeps> = {}): GameFeedbackDeps {
  return {
    isNative: () => false,
    playSound: vi.fn().mockResolvedValue(undefined),
    vibrateWeb: vi.fn().mockReturnValue(true),
    impactNative: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('useGameFeedback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes the public feedback API', () => {
    const feedback = createGameFeedback(createDeps())

    expect(typeof feedback.configure).toBe('function')
    expect(typeof feedback.primeAudio).toBe('function')
    expect(typeof feedback.playClick).toBe('function')
    expect(typeof feedback.playTick).toBe('function')
    expect(typeof feedback.playWin).toBe('function')
    expect(typeof feedback.playLose).toBe('function')
    expect(typeof feedback.playChomp).toBe('function')
    expect(typeof feedback.playExplosion).toBe('function')
    expect(typeof feedback.playSpin).toBe('function')
    expect(typeof feedback.vibrateLight).toBe('function')
    expect(typeof feedback.vibrateHeavy).toBe('function')
  })

  it('plays sounds when sound is enabled', async () => {
    const playSound = vi.fn().mockResolvedValue(undefined)
    const feedback = createGameFeedback(createDeps({ playSound }))

    feedback.configure({ soundEnabled: true })
    await feedback.playClick()
    await feedback.playTick()
    await feedback.playWin()
    await feedback.playLose()
    await feedback.playChomp()
    await feedback.playExplosion()
    await feedback.playSpin()

    expect(playSound).toHaveBeenCalledTimes(7)
    expect(playSound).toHaveBeenCalledWith('click')
    expect(playSound).toHaveBeenCalledWith('tick')
    expect(playSound).toHaveBeenCalledWith('win')
    expect(playSound).toHaveBeenCalledWith('lose')
    expect(playSound).toHaveBeenCalledWith('chomp')
    expect(playSound).toHaveBeenCalledWith('explosion')
    expect(playSound).toHaveBeenCalledWith('spin')
  })

  it('skips explosion when sound is disabled', async () => {
    const playSound = vi.fn().mockResolvedValue(undefined)
    const feedback = createGameFeedback(createDeps({ playSound }))

    feedback.configure({ soundEnabled: false })
    await feedback.playExplosion()

    expect(playSound).not.toHaveBeenCalled()
  })

  it('skips chomp when sound is disabled', async () => {
    const playSound = vi.fn().mockResolvedValue(undefined)
    const feedback = createGameFeedback(createDeps({ playSound }))

    feedback.configure({ soundEnabled: false })
    await feedback.playChomp()

    expect(playSound).not.toHaveBeenCalled()
  })

  it('skips sounds when sound is disabled', async () => {
    const playSound = vi.fn().mockResolvedValue(undefined)
    const feedback = createGameFeedback(createDeps({ playSound }))

    feedback.configure({ soundEnabled: false })
    await feedback.playClick()
    await feedback.playWin()

    expect(playSound).not.toHaveBeenCalled()
  })

  it('uses web vibrate on non-native platforms when enabled', async () => {
    const vibrateWeb = vi.fn().mockReturnValue(true)
    const impactNative = vi.fn().mockResolvedValue(undefined)
    const feedback = createGameFeedback(
      createDeps({ isNative: () => false, vibrateWeb, impactNative }),
    )

    feedback.configure({ vibrationEnabled: true })
    await feedback.vibrateLight()
    await feedback.vibrateHeavy()

    expect(vibrateWeb).toHaveBeenCalledWith(10)
    expect(vibrateWeb).toHaveBeenCalledWith(40)
    expect(impactNative).not.toHaveBeenCalled()
  })

  it('uses native haptics when on native platform and enabled', async () => {
    const vibrateWeb = vi.fn().mockReturnValue(true)
    const impactNative = vi.fn().mockResolvedValue(undefined)
    const feedback = createGameFeedback(
      createDeps({ isNative: () => true, vibrateWeb, impactNative }),
    )

    feedback.configure({ vibrationEnabled: true })
    await feedback.vibrateLight()
    await feedback.vibrateHeavy()

    expect(impactNative).toHaveBeenCalledWith('light')
    expect(impactNative).toHaveBeenCalledWith('heavy')
    expect(vibrateWeb).not.toHaveBeenCalled()
  })

  it('skips vibration when disabled', async () => {
    const vibrateWeb = vi.fn().mockReturnValue(true)
    const impactNative = vi.fn().mockResolvedValue(undefined)
    const feedback = createGameFeedback(createDeps({ vibrateWeb, impactNative }))

    feedback.configure({ vibrationEnabled: false })
    await feedback.vibrateLight()
    await feedback.vibrateHeavy()

    expect(vibrateWeb).not.toHaveBeenCalled()
    expect(impactNative).not.toHaveBeenCalled()
  })

  it('no-ops when sound playback fails', async () => {
    const playSound = vi.fn().mockRejectedValue(new Error('audio blocked'))
    const feedback = createGameFeedback(createDeps({ playSound }))

    feedback.configure({ soundEnabled: true })
    await expect(feedback.playClick()).resolves.toBeUndefined()
  })

  it('no-ops when haptic APIs fail or are unsupported', async () => {
    const vibrateWeb = vi.fn().mockImplementation(() => {
      throw new Error('unsupported')
    })
    const impactNative = vi.fn().mockRejectedValue(new Error('native haptics unavailable'))
    const feedback = createGameFeedback(
      createDeps({ isNative: () => true, vibrateWeb, impactNative }),
    )

    feedback.configure({ vibrationEnabled: true })
    await expect(feedback.vibrateLight()).resolves.toBeUndefined()
    await expect(feedback.vibrateHeavy()).resolves.toBeUndefined()
  })

  it('no-ops when web vibrate returns false', async () => {
    const vibrateWeb = vi.fn().mockReturnValue(false)
    const feedback = createGameFeedback(createDeps({ vibrateWeb }))

    feedback.configure({ vibrationEnabled: true })
    await expect(feedback.vibrateLight()).resolves.toBeUndefined()
    expect(vibrateWeb).toHaveBeenCalledWith(10)
  })

  it('returns the same singleton instance from useGameFeedback', async () => {
    vi.resetModules()
    const mod = await import('./useGameFeedback')
    const first = mod.useGameFeedback()
    const second = mod.useGameFeedback()

    expect(first).toBe(second)
  })
})
