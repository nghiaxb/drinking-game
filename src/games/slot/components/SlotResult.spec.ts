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
    expect(wrapper.get('[data-testid="slot-result"]').attributes('aria-label')).toBe('Jackpot! Uống 3 ngụm')
    expect(wrapper.text()).toContain('JACKPOT!')
    expect(wrapper.text()).toContain('Uống 3 ngụm')
  })

  it('shows non-jackpot headline once with symbol row below', () => {
    const wrapper = mount(SlotResult, {
      props: {
        rewardLabel: '🍺 💀 🍀',
        outcome: 'non-triple',
        isJackpot: false,
      },
    })

    const text = wrapper.text()
    expect(text.match(/Không trúng jackpot/g)?.length).toBe(1)
    expect(text).toContain('🍺 💀 🍀')
    expect(wrapper.get('[data-testid="slot-result-symbol-row"]').text()).toBe('🍺 💀 🍀')
    expect(wrapper.get('[data-testid="slot-result"]').attributes('aria-label')).toBe(
      'Không trúng jackpot — 🍺 💀 🍀',
    )
  })

  it('announces headline only when symbol row is empty', () => {
    const wrapper = mount(SlotResult, {
      props: {
        rewardLabel: '',
        outcome: 'non-triple',
        isJackpot: false,
      },
    })

    expect(wrapper.text()).toContain('Không trúng jackpot')
    expect(wrapper.find('[data-testid="slot-result-symbol-row"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="slot-result"]').attributes('aria-label')).toBe('Không trúng jackpot')
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
