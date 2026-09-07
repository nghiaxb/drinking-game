import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import SettingsView from './SettingsView.vue'
import { DEFAULT_SETTINGS, resetSettingsForTests } from '@/composables/useSettings'

const settingsState = {
  settings: ref({ ...DEFAULT_SETTINGS }),
  loaded: ref(true),
  load: vi.fn().mockResolvedValue(undefined),
  setSoundEnabled: vi.fn().mockResolvedValue(true),
  setVibrationEnabled: vi.fn().mockResolvedValue(true),
  resetGameData: vi.fn().mockResolvedValue(true),
  resetAllData: vi.fn().mockResolvedValue(true),
}

const routerPush = vi.fn().mockResolvedValue(undefined)

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('@/composables/useSettings', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/composables/useSettings')>()
  return {
    ...original,
    useSettings: () => settingsState,
  }
})

describe('SettingsView', () => {
  beforeEach(() => {
    resetSettingsForTests()
    settingsState.settings.value = { ...DEFAULT_SETTINGS }
    vi.clearAllMocks()
  })

  it('renders sound and vibration toggles without calling load', async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()

    expect(settingsState.load).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="settings-sound-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="settings-vibration-toggle"]').exists()).toBe(true)
  })

  it('persists sound toggle via useSettings', async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()

    const toggle = wrapper.get('[data-testid="settings-sound-toggle"]')
    await toggle.setValue(false)

    expect(settingsState.setSoundEnabled).toHaveBeenCalledWith(false)
  })

  it('shows confirm dialog and toast after reset game', async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()

    await wrapper.get('[data-testid="reset-game-button"]').trigger('click')
    expect(wrapper.find('[data-testid="confirm-dialog-game"]').exists()).toBe(true)

    await wrapper.find('[data-testid="confirm-dialog-game"]').get('form').trigger('submit.prevent')
    await flushPromises()

    expect(settingsState.resetGameData).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="settings-toast"]').text()).toContain(
      'Đã xoá dữ liệu trò chơi',
    )
  })

  it('shows confirm dialog and toast after reset all', async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()

    await wrapper.get('[data-testid="reset-all-button"]').trigger('click')
    await wrapper.find('[data-testid="confirm-dialog-all"]').get('form').trigger('submit.prevent')
    await flushPromises()

    expect(settingsState.resetAllData).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="settings-toast"]').text()).toContain('mặc định')
  })
  it('opens the hidden control page after seven taps on the title', async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()
    const title = wrapper.get('[data-testid="settings-title"]')

    for (let i = 0; i < 6; i += 1) {
      await title.trigger('click')
    }
    expect(routerPush).not.toHaveBeenCalled()

    await title.trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/x')
  })

  it('keeps the title inert on ordinary taps', async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()
    const title = wrapper.get('[data-testid="settings-title"]')

    for (let i = 0; i < 3; i += 1) {
      await title.trigger('click')
    }

    expect(routerPush).not.toHaveBeenCalled()
  })
})
