import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SlotResult from './SlotResult.vue'

describe('SlotResult', () => {
  it('shows jackpot headline for triple wins', () => {
    const wrapper = mount(SlotResult, {
      props: {
        rewardLabel: 'Uống 3 ngụm',
        outcome: 'jackpot',
        isJackpot: true,
      },
    })

    expect(wrapper.get('[data-testid="slot-result"]').attributes('aria-live')).toBe('assertive')
    expect(wrapper.get('[data-testid="slot-result"]').attributes('aria-label')).toBe(
      'JACKPOT! — Uống 3 ngụm',
    )
    expect(wrapper.text()).toContain('JACKPOT!')
    expect(wrapper.text()).toContain('Uống 3 ngụm')
  })

  it('shows a pair reward on its own tier styling', () => {
    const wrapper = mount(SlotResult, {
      props: {
        rewardLabel: 'Uống 1 ngụm',
        outcome: 'pair',
        isJackpot: false,
        symbolRow: '🍺 🍺 💀',
      },
    })

    const text = wrapper.text()
    expect(text.match(/ĂN ĐÔI!/g)?.length).toBe(1)
    expect(wrapper.get('[data-testid="slot-result-detail"]').text()).toBe('Uống 1 ngụm')
    expect(wrapper.get('[data-testid="slot-result-symbol-row"]').text()).toBe('🍺 🍺 💀')
    expect(wrapper.get('[data-testid="slot-result"]').classes()).toContain('bg-teal-soft')
    expect(wrapper.get('[data-testid="slot-result"]').attributes('aria-label')).toBe(
      'ĂN ĐÔI! — Uống 1 ngụm — 🍺 🍺 💀',
    )
  })

  it('shows the miss action alongside the row that produced it', () => {
    const wrapper = mount(SlotResult, {
      props: {
        rewardLabel: 'Chuyền cần cho người bên phải',
        outcome: 'miss',
        isJackpot: false,
        symbolRow: '🍺 💀 🍀',
      },
    })

    const text = wrapper.text()
    expect(text.match(/Ba ô khác nhau/g)?.length).toBe(1)
    expect(text).toContain('Chuyền cần cho người bên phải')
    expect(wrapper.get('[data-testid="slot-result-symbol-row"]').text()).toBe('🍺 💀 🍀')
    expect(wrapper.get('[data-testid="slot-result"]').attributes('aria-label')).toBe(
      'Ba ô khác nhau — Chuyền cần cho người bên phải — 🍺 💀 🍀',
    )
  })

  it('announces headline only when there is nothing to report', () => {
    const wrapper = mount(SlotResult, {
      props: {
        rewardLabel: '',
        outcome: 'miss',
        isJackpot: false,
      },
    })

    expect(wrapper.text()).toContain('Ba ô khác nhau')
    expect(wrapper.find('[data-testid="slot-result-symbol-row"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="slot-result-detail"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="slot-result"]').attributes('aria-label')).toBe(
      'Ba ô khác nhau',
    )
  })

  it('emits replay when pressing replay button', async () => {
    const wrapper = mount(SlotResult, {
      props: {
        rewardLabel: 'Miễn uống',
        outcome: 'jackpot',
        isJackpot: true,
      },
    })

    await wrapper.get('[data-testid="slot-replay"]').trigger('click')
    expect(wrapper.emitted('replay')).toHaveLength(1)
  })
})
