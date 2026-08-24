import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GamePlaceholderView from './GamePlaceholderView.vue'

describe('GamePlaceholderView', () => {
  it('uses section root with game-surface and avoids nested main', () => {
    const wrapper = mount(GamePlaceholderView, {
      props: { gameId: 'crocodile', title: 'Răng cá sấu' },
    })

    const root = wrapper.get('[data-testid="game-placeholder"]')
    expect(root.element.tagName).toBe('SECTION')
    expect(root.classes()).toContain('game-surface')
    expect(wrapper.find('main').exists()).toBe(false)
  })
})
