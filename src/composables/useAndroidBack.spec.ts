import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setupAndroidBackButton, useAndroidBack } from './useAndroidBack'

function createNativeDeps() {
  const remove = vi.fn().mockResolvedValue(undefined)
  let resolveAddListener: (value: { remove: () => Promise<void> }) => void = () => undefined
  const addListener = vi.fn(
    () =>
      new Promise<{ remove: () => Promise<void> }>((resolve) => {
        resolveAddListener = resolve
      }),
  )

  return {
    remove,
    resolveAddListener: (listener: { remove: () => Promise<void> }) => resolveAddListener(listener),
    deps: {
      isNative: () => true,
      importAppPlugin: async () => ({
        App: {
          addListener,
          exitApp: vi.fn().mockResolvedValue(undefined),
        },
      }),
    },
  }
}

function mountAndroidBackHost(deps: ReturnType<typeof createNativeDeps>['deps']) {
  return defineComponent({
    setup() {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', component: { template: '<div />' } }],
      })
      useAndroidBack(router, deps)
      return () => null
    },
  })
}

describe('useAndroidBack', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null on web without throwing', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })

    const handler = await setupAndroidBackButton(router, { isNative: () => false })
    expect(handler).toBeNull()
  })

  it('navigates back when not on home', async () => {
    const back = vi.fn()
    const router = {
      currentRoute: { value: { path: '/games/wheel' } },
      back,
    } as unknown as ReturnType<typeof createRouter>

    const exitApp = vi.fn().mockResolvedValue(undefined)
    const addListener = vi.fn().mockImplementation((_event, handler: () => void) => {
      handler()
      return Promise.resolve({ remove: vi.fn() })
    })

    await setupAndroidBackButton(router, {
      isNative: () => true,
      importAppPlugin: async () => ({
        App: { addListener, exitApp },
      }),
    })

    expect(back).toHaveBeenCalled()
    expect(exitApp).not.toHaveBeenCalled()
  })

  it('exits app when on home', async () => {
    const back = vi.fn()
    const router = {
      currentRoute: { value: { path: '/' } },
      back,
    } as unknown as ReturnType<typeof createRouter>

    const exitApp = vi.fn().mockResolvedValue(undefined)
    const addListener = vi.fn().mockImplementation((_event, handler: () => void) => {
      handler()
      return Promise.resolve({ remove: vi.fn() })
    })

    await setupAndroidBackButton(router, {
      isNative: () => true,
      importAppPlugin: async () => ({
        App: { addListener, exitApp },
      }),
    })

    expect(back).not.toHaveBeenCalled()
    expect(exitApp).toHaveBeenCalled()
  })

  it('returns null when Capacitor App plugin fails to load', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })

    const handler = await setupAndroidBackButton(router, {
      isNative: () => true,
      importAppPlugin: async () => {
        throw new Error('plugin unavailable')
      },
    })

    expect(handler).toBeNull()
  })

  it('useAndroidBack disposes listener on component unmount', async () => {
    const { remove, resolveAddListener, deps } = createNativeDeps()

    const wrapper = mount(mountAndroidBackHost(deps))
    await flushPromises()
    resolveAddListener({ remove })
    await flushPromises()

    wrapper.unmount()
    await flushPromises()

    expect(remove).toHaveBeenCalled()
  })

  it('useAndroidBack disposes when setup resolves after unmount', async () => {
    const { remove, resolveAddListener, deps } = createNativeDeps()

    const wrapper = mount(mountAndroidBackHost(deps))
    await flushPromises()
    wrapper.unmount()

    resolveAddListener({ remove })
    await flushPromises()

    expect(remove).toHaveBeenCalled()
  })
})
