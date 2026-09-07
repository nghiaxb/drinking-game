import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CheatView from './CheatView.vue'

/*
 * No WebSocket mock on purpose: VITE_CHEAT_SOCKET_URL is unset in tests, so getCheatSocketUrl()
 * returns '' and no socket is ever opened. If this file ever needs a mock, the off-by-default
 * branch has broken — fix that branch, do not add the mock.
 */
describe('CheatView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  async function adminView() {
    const wrapper = mount(CheatView)
    await flushPromises()
    await wrapper.find('[data-testid="cheat-secret-input"]').setValue('nhaucc')
    await wrapper.find('[data-testid="cheat-role-admin"]').setValue(true)
    await wrapper.find('[data-testid="cheat-save"]').trigger('click')
    await flushPromises()
    return wrapper
  }

  it('asks for a secret and a role before showing any control', async () => {
    const wrapper = mount(CheatView)
    await flushPromises()

    expect(wrapper.find('[data-testid="cheat-secret-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-crocodile-lose"]').exists()).toBe(false)
  })

  it('shows the four arm buttons once configured as the admin device', async () => {
    const wrapper = mount(CheatView)
    await flushPromises()

    await wrapper.find('[data-testid="cheat-secret-input"]').setValue('nhaucc')
    await wrapper.find('[data-testid="cheat-role-admin"]').setValue(true)
    await wrapper.find('[data-testid="cheat-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="cheat-arm-crocodile-lose"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-crocodile-win"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-mine-lose"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-mine-win"]').exists()).toBe(true)
  })

  it('hides the arm buttons when this device is the game device', async () => {
    const wrapper = mount(CheatView)
    await flushPromises()

    await wrapper.find('[data-testid="cheat-secret-input"]').setValue('nhaucc')
    await wrapper.find('[data-testid="cheat-role-game"]').setValue(true)
    await wrapper.find('[data-testid="cheat-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="cheat-arm-crocodile-lose"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cheat-role-note"]').text()).toContain('máy chơi')
  })

  it('refuses a blank secret and keeps the form unconfigured', async () => {
    const wrapper = mount(CheatView)
    await flushPromises()

    await wrapper.find('[data-testid="cheat-secret-input"]').setValue('   ')
    await wrapper.find('[data-testid="cheat-role-admin"]').setValue(true)
    await wrapper.find('[data-testid="cheat-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="cheat-arm-crocodile-lose"]').exists()).toBe(false)
  })

  it('restores a previously saved role on mount', async () => {
    const first = mount(CheatView)
    await flushPromises()
    await first.find('[data-testid="cheat-secret-input"]').setValue('nhaucc')
    await first.find('[data-testid="cheat-role-admin"]').setValue(true)
    await first.find('[data-testid="cheat-save"]').trigger('click')
    await flushPromises()

    const second = mount(CheatView)
    await flushPromises()

    expect(second.find('[data-testid="cheat-arm-mine-lose"]').exists()).toBe(true)
  })
  it('shows the mode selector and defaults to once', async () => {
    const wrapper = await adminView()

    expect(wrapper.find('[data-testid="cheat-mode-once"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-mode-sticky"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="cheat-mode-once"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="cheat-mode-sticky"]').attributes('aria-pressed')).toBe(
      'false',
    )
  })

  it('reports that nothing is armed and that presence is separate', async () => {
    const wrapper = await adminView()
    const status = wrapper.get('[data-testid="cheat-status"]').text()

    expect(status).toContain('Chưa gài')
    expect(status).toContain('chưa online')
  })

  it('marks the active arm button so a tap is visibly acknowledged', async () => {
    const wrapper = await adminView()
    const button = wrapper.get('[data-testid="cheat-arm-mine-lose"]')

    expect(button.attributes('aria-pressed')).toBe('false')

    await button.trigger('click')
    await flushPromises()

    expect(button.attributes('aria-pressed')).toBe('true')
  })

  it('turns the arm off when the active button is tapped again', async () => {
    const wrapper = await adminView()
    const button = wrapper.get('[data-testid="cheat-arm-crocodile-win"]')

    await button.trigger('click')
    await flushPromises()
    expect(button.attributes('aria-pressed')).toBe('true')

    await button.trigger('click')
    await flushPromises()
    expect(button.attributes('aria-pressed')).toBe('false')
  })

  it('disables the off button until something is armed', async () => {
    const wrapper = await adminView()
    const off = wrapper.get('[data-testid="cheat-disarm"]')

    expect(off.attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="cheat-arm-mine-lose"]').trigger('click')
    await flushPromises()

    expect(off.attributes('disabled')).toBeUndefined()
  })
  it('explains that the wheel list has not arrived instead of showing an empty section', async () => {
    const wrapper = await adminView()

    expect(wrapper.find('[data-testid="cheat-wheel-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-wheel-item-drink-50"]').exists()).toBe(false)
  })

  it('keeps the wheel section separate from the two press games', async () => {
    const wrapper = await adminView()

    // The press games use lose/win; the wheel names a segment, so it gets its own block.
    expect(wrapper.find('[data-testid="cheat-arm-wheel-lose"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cheat-arm-crocodile-lose"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cheat-arm-mine-lose"]').exists()).toBe(true)
  })
})
