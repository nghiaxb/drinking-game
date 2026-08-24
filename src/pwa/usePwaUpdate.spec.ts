import { describe, it, expect, vi, beforeEach } from 'vitest'

const registerSWMock = vi.fn()

vi.mock('virtual:pwa-register', () => ({
  registerSW: (...args: unknown[]) => registerSWMock(...args),
}))

describe('usePwaUpdate', () => {
  beforeEach(async () => {
    registerSWMock.mockReset()
    vi.resetModules()
    const mod = await import('./usePwaUpdate')
    mod.resetPwaUpdateForTests()
  })

  it('exposes reactive needRefresh and offlineReady flags', async () => {
    registerSWMock.mockReturnValue(vi.fn().mockResolvedValue(undefined))

    const { initPwaUpdate, usePwaUpdate } = await import('./usePwaUpdate')
    initPwaUpdate()

    const callbacks = registerSWMock.mock.calls[0]?.[0] as {
      onNeedRefresh?: () => void
      onOfflineReady?: () => void
    }

    const state = usePwaUpdate()
    expect(state.needRefresh.value).toBe(false)
    expect(state.offlineReady.value).toBe(false)

    callbacks.onNeedRefresh?.()
    expect(state.needRefresh.value).toBe(true)

    callbacks.onOfflineReady?.()
    expect(state.offlineReady.value).toBe(true)
  })

  it('exposes updateServiceWorker callback wired to registerSW', async () => {
    const updateSW = vi.fn().mockResolvedValue(undefined)
    registerSWMock.mockReturnValue(updateSW)

    const { initPwaUpdate, usePwaUpdate } = await import('./usePwaUpdate')
    initPwaUpdate()

    const state = usePwaUpdate()
    await state.updateServiceWorker(true)

    expect(updateSW).toHaveBeenCalledWith(true)
  })

  it('throws when used before initPwaUpdate on client', async () => {
    const { usePwaUpdate } = await import('./usePwaUpdate')

    expect(() => usePwaUpdate()).toThrow(/initPwaUpdate/i)
  })
})
