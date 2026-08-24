import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  it('exposes stable aria-labelledby and aria-describedby from testId', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        testId: 'confirm-dialog-game',
        title: 'Reset game?',
        message: 'This clears game data.',
      },
    })

    const dialog = wrapper.get('dialog')
    expect(dialog.attributes('aria-labelledby')).toBe('confirm-dialog-game-title')
    expect(dialog.attributes('aria-describedby')).toBe('confirm-dialog-game-message')
    expect(wrapper.find('#confirm-dialog-game-title').text()).toBe('Reset game?')
    expect(wrapper.find('#confirm-dialog-game-message').text()).toBe('This clears game data.')
  })

  it('emits confirm once via form submit without double emit from button click', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        title: 'Confirm',
        message: 'Proceed?',
      },
    })

    const accept = wrapper.get('[data-testid="confirm-accept"]')
    expect(accept.attributes('type')).toBe('submit')

    await wrapper.get('form').trigger('submit.prevent')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})
