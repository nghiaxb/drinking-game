import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CardsView from './CardsView.vue'

const primeAudio = vi.fn()

vi.mock('@/composables/useGameFeedback', () => ({
  useGameFeedback: () => ({
    primeAudio,
    playClick: vi.fn().mockResolvedValue(undefined),
    vibrateLight: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => ({ value: true }),
}))

describe('CardsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 320,
      writable: true,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 740,
      writable: true,
    })
  })

  it('renders deck selector, truth filters, counter and controls', () => {
    const wrapper = mount(CardsView)

    expect(wrapper.get('[data-testid="cards-view"]')).toBeDefined()
    expect(wrapper.get('[data-testid="cards-deck-selector"]')).toBeDefined()
    expect(wrapper.get('[data-testid="cards-truth-filters"]')).toBeDefined()
    expect(wrapper.get('[data-testid="cards-counter"]').text()).toMatch(/Còn \d+\/\d+ lá/)
    expect(wrapper.get('[data-testid="cards-draw-button"]')).toBeDefined()
    expect(wrapper.get('[data-testid="cards-reshuffle-button"]')).toBeDefined()
    expect(wrapper.get('[data-testid="cards-hint"]')).toBeDefined()
    expect(wrapper.get('[data-testid="card-stack-button"]')).toBeDefined()
  })

  it('meets 320x740 layout contract with touch targets and overflow rules', () => {
    const wrapper = mount(CardsView)
    const root = wrapper.get('[data-testid="cards-view"]')

    expect(root.classes()).toContain('overflow-x-hidden')
    expect(root.classes()).toContain('overflow-y-auto')
    expect(wrapper.get('[data-testid="cards-draw-button"]').classes()).toContain('min-h-11')
    expect(wrapper.get('[data-testid="cards-deck-truth"]').classes()).toContain('min-h-11')
    expect(wrapper.get('[data-testid="cards-reshuffle-button"]').classes()).toContain('min-h-11')
    expect(wrapper.find('.card-stack-root').exists()).toBe(true)
  })

  it('switches deck and hides truth filters for dare', async () => {
    const wrapper = mount(CardsView)

    await wrapper.get('[data-testid="cards-deck-dare"]').trigger('click')
    expect(wrapper.find('[data-testid="cards-truth-filters"]').exists()).toBe(false)

    await wrapper.get('[data-testid="cards-deck-truth"]').trigger('click')
    expect(wrapper.find('[data-testid="cards-truth-filters"]').exists()).toBe(true)
  })

  it('updates counter after draw', async () => {
    const wrapper = mount(CardsView)
    const before = wrapper.get('[data-testid="cards-counter"]').text()

    await wrapper.get('[data-testid="cards-draw-button"]').trigger('click')
    await nextTick()

    const after = wrapper.get('[data-testid="cards-counter"]').text()
    expect(after).not.toBe(before)
  })

  it('reshuffle resets counter to full pool', async () => {
    const wrapper = mount(CardsView)

    await wrapper.get('[data-testid="cards-draw-button"]').trigger('click')
    await nextTick()

    await wrapper.get('[data-testid="cards-reshuffle-button"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="cards-counter"]').text()).toMatch(/Còn 40\/40 lá/)
  })

  it('does not prime audio for deck change or reshuffle', async () => {
    const wrapper = mount(CardsView)

    await wrapper.get('[data-testid="cards-deck-dare"]').trigger('click')
    await wrapper.get('[data-testid="cards-reshuffle-button"]').trigger('click')
    expect(primeAudio).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="cards-draw-button"]').trigger('click')
    expect(primeAudio).toHaveBeenCalledTimes(1)
  })

  it('announces card content only after reveal completes', async () => {
    const wrapper = mount(CardsView)

    await wrapper.get('[data-testid="cards-draw-button"]').trigger('click')
    await nextTick()

    const live = wrapper.get('[data-testid="cards-live-region"]').text()
    expect(live.length).toBeGreaterThan(20)
    expect(live).toMatch(/Còn \d+ lá, chu kỳ 1\./)
    expect(live).not.toBe('Còn 39 lá trong chu kỳ 1. Chạm hoặc vuốt để bốc lá.')
  })

  it('exposes aria pressed on deck and difficulty chips', () => {
    const wrapper = mount(CardsView)

    expect(wrapper.get('[data-testid="cards-deck-truth"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="cards-truth-light"]').attributes('aria-pressed')).toBe('true')
  })
})
