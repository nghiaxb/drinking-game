import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppShell from './AppShell.vue'
import { initPwaUpdate, resetPwaUpdateForTests } from '@/pwa/usePwaUpdate'
import { resetPwaInstallForTests } from '@/pwa/usePwaInstall'
import { resetSettingsForTests } from '@/composables/useSettings'

// Captured so a test can fire the callbacks the real service worker would.
const swRegistration = vi.hoisted(() => ({
  options: null as { onOfflineReady?: () => void } | null,
}))

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn((options: { onOfflineReady?: () => void }) => {
    swRegistration.options = options
    return vi.fn().mockResolvedValue(undefined)
  }),
}))

const settingsLoad = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useSettings', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/composables/useSettings')>()
  return {
    ...original,
    useSettings: () => ({
      settings: { value: original.DEFAULT_SETTINGS },
      loaded: { value: true },
      load: settingsLoad,
      setSoundEnabled: vi.fn(),
      setVibrationEnabled: vi.fn(),
      resetGameData: vi.fn(),
      resetAllData: vi.fn(),
    }),
  }
})

vi.mock('@/composables/useAndroidBack', () => ({
  useAndroidBack: vi.fn(),
}))

describe('AppShell', () => {
  beforeEach(() => {
    resetPwaUpdateForTests()
    resetPwaInstallForTests()
    resetSettingsForTests()
    initPwaUpdate()
    settingsLoad.mockClear()
  })

  function createTestRouter(initialPath = '/') {
    return createRouter({
      history: createMemoryHistory(initialPath),
      routes: [
        { path: '/', component: { template: '<p data-testid="page-home">Home</p>' } },
        {
          path: '/settings',
          component: { template: '<p data-testid="page-settings">Settings</p>' },
        },
        {
          path: '/games/wheel',
          component: { template: '<p data-testid="page-wheel">Wheel</p>' },
        },
      ],
    })
  }

  it('renders shell with router outlet content', async () => {
    const router = createTestRouter()
    const wrapper = mount(AppShell, { global: { plugins: [router] } })
    await router.isReady()
    await flushPromises()

    expect(wrapper.find('[data-testid="app-shell"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="page-home"]').exists()).toBe(true)
    expect(settingsLoad).toHaveBeenCalled()
  })

  it('lays the content area out as a flex column so views can fill the viewport', async () => {
    const router = createTestRouter()
    const wrapper = mount(AppShell, { global: { plugins: [router] } })
    await router.isReady()
    await flushPromises()

    // Views size themselves with flex-1 against this box; a plain block would collapse them.
    const main = wrapper.get('main.app-content')
    expect(main.classes()).toContain('flex')
    expect(main.classes()).toContain('flex-col')
    expect(main.classes()).toContain('flex-1')
  })

  it('shows settings control on home and back on game routes', async () => {
    const router = createTestRouter()
    await router.push('/games/wheel')
    await router.isReady()
    const wrapper = mount(AppShell, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('[data-testid="shell-settings"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="shell-back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shell-home"]').exists()).toBe(true)
  })

  it('shows settings link on home route', async () => {
    const router = createTestRouter('/')
    const wrapper = mount(AppShell, { global: { plugins: [router] } })
    await router.isReady()

    expect(wrapper.find('[data-testid="shell-settings"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shell-back"]').exists()).toBe(false)
  })

  it('keeps the offline and iOS install hints off game routes', async () => {
    // The banners are onboarding chrome; on a game screen they push the board down.
    const userAgent = vi.spyOn(globalThis.navigator, 'userAgent', 'get')
    userAgent.mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari')

    const router = createTestRouter()
    const wrapper = mount(AppShell, { global: { plugins: [router] } })
    await router.isReady()
    await flushPromises()
    swRegistration.options?.onOfflineReady?.()
    await flushPromises()

    expect(wrapper.find('[data-testid="pwa-offline-ready"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pwa-ios-guidance"]').exists()).toBe(true)

    await router.push('/games/wheel')
    await flushPromises()

    expect(wrapper.find('[data-testid="pwa-offline-ready"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="pwa-ios-guidance"]').exists()).toBe(false)

    userAgent.mockRestore()
  })

  it('removes router navigation guards on unmount', async () => {
    const router = createTestRouter()
    const beforeRemove = vi.fn()
    const afterRemove = vi.fn()
    vi.spyOn(router, 'beforeEach').mockReturnValue(beforeRemove)
    vi.spyOn(router, 'afterEach').mockReturnValue(afterRemove)

    const wrapper = mount(AppShell, { global: { plugins: [router] } })
    await router.isReady()
    await flushPromises()

    wrapper.unmount()

    expect(beforeRemove).toHaveBeenCalled()
    expect(afterRemove).toHaveBeenCalled()
  })

  it('shows back button on not-found route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<p>Home</p>' } },
        {
          path: '/:pathMatch(.*)*',
          name: 'not-found',
          component: { template: '<p data-testid="page-404">404</p>' },
        },
      ],
    })

    await router.push('/missing-page')
    await router.isReady()

    const wrapper = mount(AppShell, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('[data-testid="shell-back"]').exists()).toBe(true)
  })
})
