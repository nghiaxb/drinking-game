import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import App from './App.vue'
import { initPwaUpdate, resetPwaUpdateForTests } from '@/pwa/usePwaUpdate'

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(undefined)),
}))

vi.mock('@/composables/useSettings', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/composables/useSettings')>()
  return {
    ...original,
    useSettings: () => ({
      settings: { value: original.DEFAULT_SETTINGS },
      loaded: { value: true },
      load: vi.fn().mockResolvedValue(undefined),
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

describe('App', () => {
  beforeEach(() => {
    resetPwaUpdateForTests()
    initPwaUpdate()
  })

  it('renders app root with AppShell and routed content', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: { template: '<p data-testid="home-page">Home</p>' },
        },
      ],
    })

    const head = createHead()

    const wrapper = mount(App, {
      global: {
        plugins: [router, head],
      },
    })

    await router.isReady()
    await flushPromises()

    expect(wrapper.find('[data-testid="app-root"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-shell"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-page"]').exists()).toBe(true)
  })
})
