import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WheelDisc from './WheelDisc.vue'
import { DEFAULT_WHEEL_ITEMS, WHEEL_CONFIG, resolveSpinDurationMs } from '../config'
import {
  computeRadialLabelLayout,
  computeSegmentCenterAngle,
  computeSegmentLayouts,
  computeTargetRotation,
  pointerAlignmentAfterRotation,
} from '../logic/wheelGame'

const defaultProps = {
  items: DEFAULT_WHEEL_ITEMS,
  rotation: 0,
  spinning: false,
  spinDurationMs: WHEEL_CONFIG.spinDurationMs,
}

describe('WheelDisc', () => {
  it('renders enabled item labels only', () => {
    const items = [
      ...DEFAULT_WHEEL_ITEMS.slice(0, 3),
      { id: 'off', label: 'Off', enabled: false },
    ]
    const wrapper = mount(WheelDisc, {
      props: { ...defaultProps, items },
    })

    expect(wrapper.find('[data-testid="wheel-label-drink-50"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wheel-label-off"]').exists()).toBe(false)
  })

  it('uses radial label slot structure with exact transforms', () => {
    const wrapper = mount(WheelDisc, { props: defaultProps })
    const firstLayout = computeSegmentLayouts(DEFAULT_WHEEL_ITEMS)[0]
    const radial = computeRadialLabelLayout(firstLayout?.centerDeg ?? 0)

    const slot = wrapper.get('[data-testid="wheel-label-drink-50"]')
    const text = slot.get('.wheel-label-text')

    expect(slot.classes()).toContain('wheel-label-slot')
    expect(slot.classes()).toContain('absolute')
    expect(slot.classes()).toContain('inset-0')
    expect(slot.classes()).not.toContain('-translate-x-1/2')
    expect(slot.attributes('style')).toContain(radial.containerTransform)

    expect(text.classes()).toContain('absolute')
    expect(text.classes()).toContain('left-1/2')
    expect(text.attributes('style')).toContain('top: 10%')
    expect(text.attributes('style')).toContain(radial.textTransform)
  })

  it('uses conic-gradient without from offset', () => {
    const wrapper = mount(WheelDisc, { props: defaultProps })
    const style = wrapper.get('[data-testid="wheel-disc"]').attributes('style') ?? ''
    expect(style).toContain('conic-gradient(')
    expect(style).not.toContain('from -90deg')
  })

  it('applies rotation and duration from props; none transition when duration is 0', () => {
    const reducedDuration = resolveSpinDurationMs(true)
    expect(reducedDuration).toBe(0)

    const wrapper = mount(WheelDisc, {
      props: { ...defaultProps, rotation: 180, spinning: true, spinDurationMs: reducedDuration },
    })
    const style = wrapper.get('[data-testid="wheel-disc"]').attributes('style') ?? ''

    expect(style).toContain('rotate(180deg)')
    expect(style).toContain('transition: none')
    expect(style).not.toContain('4000ms')
  })

  it('does not clip pointer with root overflow hidden', () => {
    const wrapper = mount(WheelDisc, { props: defaultProps })
    const root = wrapper.get('[data-testid="wheel-disc-root"]')
    const pointer = wrapper.get('[data-testid="wheel-pointer"]')

    expect(root.classes()).not.toContain('overflow-hidden')
    expect(pointer.classes()).toContain('wheel-pointer')
    expect(root.find('[data-testid="wheel-pointer"]').exists()).toBe(true)
  })

  it('includes enabled labels in aria-label', () => {
    const wrapper = mount(WheelDisc, { props: defaultProps })
    const label = wrapper.get('[data-testid="wheel-disc-root"]').attributes('aria-label') ?? ''
    expect(label).toContain('Uống 50%')
    expect(label).toContain('Double')
  })

  it('winner target rotation aligns first segment center to pointer', () => {
    const winnerId = 'drink-50'
    const center = computeSegmentCenterAngle(DEFAULT_WHEEL_ITEMS, winnerId)
    const target = computeTargetRotation(0, winnerId, DEFAULT_WHEEL_ITEMS, 0)

    const wrapper = mount(WheelDisc, {
      props: { ...defaultProps, rotation: target },
    })

    expect(pointerAlignmentAfterRotation(center, target)).toBe(0)
    expect(wrapper.get('[data-testid="wheel-disc"]').attributes('style')).toContain(
      `rotate(${target}deg)`,
    )
  })
})
