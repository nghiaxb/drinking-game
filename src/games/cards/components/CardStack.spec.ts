import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { CARDS_CONFIG, DRINKING_CATEGORY_LABELS, resolveFlipDurationMs } from '../config'
import { DRINKING_CARDS, TRUTH_CARDS } from '../data'
import { buildCardFrontLabel, resolveCardPipPath } from '../presentation'
import CardStack from './CardStack.vue'

const sampleCard = TRUTH_CARDS[0]!
const drinkingSample = DRINKING_CARDS.find((card) => card.category === 'choose')!

describe('CardStack', () => {
  it('uses a native semantic button without aria-pressed', () => {
    const wrapper = mount(CardStack, {
      props: { card: null, isFlipped: false },
    })
    const button = wrapper.get('[data-testid="card-stack-button"]')

    expect(button.element.tagName).toBe('BUTTON')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-pressed')).toBeUndefined()
  })

  it('renders back face initially and front when flipped', async () => {
    const wrapper = mount(CardStack, {
      props: {
        card: sampleCard,
        isFlipped: false,
      },
    })

    expect(wrapper.get('[data-testid="card-face-back"]')).toBeDefined()
    expect(wrapper.get('[data-testid="card-face-front"]').attributes('aria-hidden')).toBe('true')

    await wrapper.setProps({ isFlipped: true })
    expect(wrapper.get('[data-testid="card-face-front"]').text()).toContain(sampleCard.text)
    expect(wrapper.get('[data-testid="card-face-front"]').attributes('aria-hidden')).toBe('false')
  })

  it('emits draw on click tap', async () => {
    const wrapper = mount(CardStack, {
      props: { card: null, isFlipped: false },
    })

    await wrapper.get('[data-testid="card-stack-button"]').trigger('click')
    expect(wrapper.emitted('draw')).toHaveLength(1)
  })

  it('emits draw on horizontal swipe left and right', async () => {
    const wrapper = mount(CardStack, {
      props: { card: null, isFlipped: false },
      attachTo: document.body,
    })
    const button = wrapper.get('[data-testid="card-stack-button"]').element as HTMLButtonElement

    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 100, pointerId: 1, button: 0 }),
    )
    button.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 40, pointerId: 1, button: 0 }),
    )
    button.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: 40, pointerId: 1, button: 0 }),
    )
    await nextTick()
    expect(wrapper.emitted('draw')).toHaveLength(1)

    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 40, pointerId: 2, button: 0 }),
    )
    button.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 120, pointerId: 2, button: 0 }),
    )
    button.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: 120, pointerId: 2, button: 0 }),
    )
    await nextTick()
    expect(wrapper.emitted('draw')).toHaveLength(2)

    wrapper.unmount()
  })

  it('does not double emit draw on swipe pointerup followed by click', async () => {
    const wrapper = mount(CardStack, {
      props: { card: null, isFlipped: false },
      attachTo: document.body,
    })
    const button = wrapper.get('[data-testid="card-stack-button"]').element as HTMLButtonElement

    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 100, pointerId: 3, button: 0 }),
    )
    button.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 100 - CARDS_CONFIG.swipeThresholdPx - 4,
        pointerId: 3,
        button: 0,
      }),
    )
    button.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 100 - CARDS_CONFIG.swipeThresholdPx - 4,
        pointerId: 3,
        button: 0,
      }),
    )
    await button.click()
    await nextTick()

    expect(wrapper.emitted('draw')).toHaveLength(1)
    wrapper.unmount()
  })

  it('resets drag state on pointer cancel without draw', async () => {
    const wrapper = mount(CardStack, {
      props: { card: null, isFlipped: false },
      attachTo: document.body,
    })
    const button = wrapper.get('[data-testid="card-stack-button"]').element as HTMLButtonElement

    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 80, pointerId: 4, button: 0 }),
    )
    button.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 120, pointerId: 4, button: 0 }),
    )
    button.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 4 }))
    await nextTick()

    expect(wrapper.emitted('draw')).toBeUndefined()
    wrapper.unmount()
  })

  it('locks interaction while locked prop is true', async () => {
    const wrapper = mount(CardStack, {
      props: { card: null, isFlipped: false, locked: true },
    })

    await wrapper.get('[data-testid="card-stack-button"]').trigger('click')
    expect(wrapper.emitted('draw')).toBeUndefined()
  })

  it('uses reduced motion static end state styling', async () => {
    const duration = resolveFlipDurationMs(true)
    expect(duration).toBe(0)

    const wrapper = mount(CardStack, {
      props: { card: sampleCard, isFlipped: true, flipDurationMs: duration },
    })

    const style = wrapper.get('[data-testid="card-stack-inner"]').attributes('style') ?? ''
    expect(style).toContain('transition: none')
    expect(style).toContain('rotateY(180deg)')
  })

  it('sets touch-action pan-y on button', () => {
    const wrapper = mount(CardStack, {
      props: { card: null, isFlipped: false },
    })

    const style = wrapper.get('[data-testid="card-stack-button"]').attributes('style') ?? ''
    expect(style).toContain('touch-action: pan-y')
  })

  it('shows Vietnamese drinking category labels on front', () => {
    const wrapper = mount(CardStack, {
      props: { card: drinkingSample, isFlipped: true },
    })

    expect(wrapper.get('[data-testid="card-face-front"]').text()).toContain(
      DRINKING_CATEGORY_LABELS.choose,
    )
    expect(buildCardFrontLabel(drinkingSample)).not.toContain('choose')
  })

  it('draws the tone pip as corner index and watermark on the front', () => {
    const wrapper = mount(CardStack, {
      props: { card: drinkingSample, isFlipped: true },
    })
    const paths = wrapper
      .findAll('[data-testid="card-face-front"] .card-pip path')
      .map((path) => path.attributes('d'))

    expect(paths).toHaveLength(3)
    expect(new Set(paths)).toEqual(new Set([resolveCardPipPath(drinkingSample)]))
  })
})
