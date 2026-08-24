import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('usePwaInstall', () => {
  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('./usePwaInstall')
    mod.resetPwaInstallForTests()
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    const mod = await import('./usePwaInstall')
    mod.resetPwaInstallForTests()
  })

  it('does not throw when beforeinstallprompt is unavailable', async () => {
    const { usePwaInstall } = await import('./usePwaInstall')
    const state = usePwaInstall()

    await expect(state.promptInstall()).resolves.toBe('unavailable')
    expect(state.canInstall.value).toBe(false)
  })

  it('captures beforeinstallprompt and exposes canInstall', async () => {
    const { initPwaInstall, usePwaInstall } = await import('./usePwaInstall')
    initPwaInstall()

    const event = new Event('beforeinstallprompt') as Event & {
      preventDefault: () => void
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>
    }
    event.preventDefault = vi.fn()
    event.prompt = vi.fn().mockResolvedValue(undefined)
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })

    window.dispatchEvent(event)

    const state = usePwaInstall()
    expect(state.canInstall.value).toBe(true)
    await expect(state.promptInstall()).resolves.toBe('accepted')
    expect(event.prompt).toHaveBeenCalled()
  })

  it('shows iOS guidance on iPhone when not standalone', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      standalone: false,
    })
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))

    vi.resetModules()
    const { initPwaInstall, usePwaInstall } = await import('./usePwaInstall')
    initPwaInstall()

    const state = usePwaInstall()
    expect(state.showIosGuidance.value).toBe(true)
    expect(state.isStandalone.value).toBe(false)
  })

  it('no-ops initPwaInstall during SSR', async () => {
    vi.stubGlobal('window', undefined)
    const { initPwaInstall } = await import('./usePwaInstall')

    expect(() => initPwaInstall()).not.toThrow()
  })

  it('removes appinstalled listener on reset/detach', async () => {
    const removeListener = vi.spyOn(globalThis, 'removeEventListener')
    const { initPwaInstall, resetPwaInstallForTests } = await import('./usePwaInstall')

    initPwaInstall()
    resetPwaInstallForTests()

    expect(
      removeListener.mock.calls.some(
        ([event, handler]) => event === 'appinstalled' && typeof handler === 'function',
      ),
    ).toBe(true)

    removeListener.mockRestore()
  })
})
