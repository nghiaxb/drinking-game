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
})
