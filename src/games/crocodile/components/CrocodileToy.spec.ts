import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CrocodileToy from './CrocodileToy.vue'
import { CROCODILE_CONFIG } from '../config'

const defaultProps = {
  upperRowCount: CROCODILE_CONFIG.upperRowCount,
  lowerRowCount: CROCODILE_CONFIG.lowerRowCount,
  pressedIndices: [] as number[],
  disabledIndices: [] as number[],
  jawClosed: false,
}

describe('CrocodileToy', () => {
  it('does not hide interactive jaws from assistive tech', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })

    const upperJaw = wrapper.get('[data-testid="crocodile-jaw-upper"]')
    const lowerJaw = wrapper.get('[data-testid="crocodile-jaw-lower"]')

    expect(upperJaw.attributes('aria-hidden')).toBeUndefined()
    expect(lowerJaw.attributes('aria-hidden')).toBeUndefined()
  })

  it('keeps raster artwork decorative for assistive tech', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })

    const assets = wrapper.findAll('img')
    expect(assets).toHaveLength(2)
    for (const asset of assets) {
      expect(asset.attributes('alt')).toBe('')
    }
  })

  it('exposes accessible labels on every tooth button', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })

    for (let index = 0; index < CROCODILE_CONFIG.toothCount; index += 1) {
      const tooth = wrapper.get(`[data-testid="crocodile-tooth-${index}"]`)
      expect(tooth.attributes('aria-label')).toBeTruthy()
      expect(tooth.attributes('aria-pressed')).toBe('false')
    }
  })

  it('uses layout-responsive structure without scaling teeth', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })

    const toy = wrapper.get('[data-testid="crocodile-toy"]')
    expect(toy.classes()).toContain('crocodile-toy--layout-responsive')
    expect(toy.classes()).not.toContain('crocodile-toy--fit-narrow')

    const upperGrid = wrapper.get('[data-testid="crocodile-tooth-grid-upper"]')
    expect(upperGrid.classes()).toContain('crocodile-tooth-grid--layout')

    const tooth = wrapper.get('[data-testid="crocodile-tooth-0"]')
    expect(tooth.classes()).toContain('crocodile-tooth--touch')
    expect(tooth.classes()).not.toContain('scale-')
  })

  it('exposes wide layout contract tuned for 375px viewport', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })
    const toy = wrapper.get('[data-testid="crocodile-toy"]')

    expect(toy.attributes('data-layout-wide-max-px')).toBe('384')
    expect(toy.attributes('data-layout-wide-content-px')).toBe('364')
    expect(toy.attributes('data-layout-narrow-content-px')).toBe('312')
  })

  it('applies bitten closed end-state classes for reduced-motion jaw snap', () => {
    const wrapper = mount(CrocodileToy, {
      props: { ...defaultProps, jawClosed: true },
    })

    const toy = wrapper.get('[data-testid="crocodile-toy"]')
    expect(toy.classes()).toContain('crocodile-toy--bitten')

    const upper = wrapper.get('[data-testid="crocodile-jaw-upper"]')
    expect(upper.classes()).toContain('crocodile-jaw--closed-upper')
    expect(upper.classes()).toContain('crocodile-jaw--hinged')
  })

  it('renders separate raster product-toy layers instead of a flat vector mascot', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })

    const base = wrapper.get('[data-testid="crocodile-base-asset"]')
    const upper = wrapper.get('[data-testid="crocodile-upper-jaw-asset"]')

    expect(base.attributes('src')).toBe('/assets/crocodile/crocodile-base.webp')
    expect(upper.attributes('src')).toBe('/assets/crocodile/upper-jaw.webp')
    expect(wrapper.find('.crocodile-svg--base').exists()).toBe(false)
    expect(wrapper.find('.crocodile-svg--upper').exists()).toBe(false)

    const upperJaw = wrapper.get('[data-testid="crocodile-jaw-upper"]')
    expect(upperJaw.classes()).not.toContain('bg-teal')
    expect(upperJaw.classes()).not.toContain('rounded-t-[2.5rem]')
  })

  it('keeps every tooth as an independent native button with a tooth-shaped graphic', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })
    const teeth = wrapper.findAll('button[data-testid^="crocodile-tooth-"]')

    expect(teeth).toHaveLength(CROCODILE_CONFIG.toothCount)
    for (const tooth of teeth) {
      expect(tooth.element.tagName).toBe('BUTTON')
      expect(tooth.find('[data-testid="crocodile-tooth-shape"]').exists()).toBe(true)
      expect(tooth.classes()).toContain('crocodile-tooth--touch')
    }
  })

  it('keeps the upper teeth decorative and every playable tooth on the lower jaw', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })
    const upperJaw = wrapper.get('[data-testid="crocodile-jaw-upper"]')
    const lowerJaw = wrapper.get('[data-testid="crocodile-jaw-lower"]')

    expect(upperJaw.findAll('button[data-testid^="crocodile-tooth-"]')).toHaveLength(0)
    expect(lowerJaw.findAll('button[data-testid^="crocodile-tooth-"]')).toHaveLength(
      CROCODILE_CONFIG.toothCount,
    )
  })

  it('lays out playable teeth as an accessible U around the lower jaw', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })
    const teeth = wrapper.findAll('button[data-testid^="crocodile-tooth-"]')

    expect(teeth[0]?.attributes('style')).toContain('left: 23%')
    expect(teeth[0]?.attributes('style')).toContain('top: 62.87%')
    expect(teeth[5]?.attributes('style')).toContain('left: 44.99%')
    expect(teeth[5]?.attributes('style')).toContain('top: 83.57%')
    expect(teeth[11]?.attributes('style')).toContain('left: 76.76%')
  })

  it('keeps each molded socket centered under its matching interactive tooth', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })

    for (let index = 0; index < CROCODILE_CONFIG.toothCount; index += 1) {
      const toothStyle =
        wrapper.get(`[data-testid="crocodile-tooth-${index}"]`).attributes('style') ?? ''
      const socketStyle =
        wrapper.get(`[data-testid="crocodile-tooth-socket-${index}"]`).attributes('style') ?? ''
      const toothPosition = toothStyle.match(/left: [^;]+; top: [^;]+/u)?.[0]

      expect(socketStyle).toContain(toothPosition)
      expect(socketStyle).toContain('--socket-rotate:')
    }
  })

  it('extends rear-tooth hit lanes outward without moving their visual centers', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })
    const farLeftStyle = wrapper.get('[data-testid="crocodile-tooth-0"]').attributes('style')
    const farRightStyle = wrapper.get('[data-testid="crocodile-tooth-11"]').attributes('style')

    expect(farLeftStyle).toContain('--tooth-hit-width: 58px')
    expect(farLeftStyle).toContain('--tooth-hit-offset-x: -8px')
    expect(farLeftStyle).toContain('left: 23%')
    expect(farRightStyle).toContain('--tooth-hit-width: 58px')
    expect(farRightStyle).toContain('--tooth-hit-offset-x: 8px')
    expect(farRightStyle).toContain('left: 76.76%')
  })

  it('lets lower teeth receive clicks through the upper jaw overlay', async () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })

    expect(wrapper.get('[data-testid="crocodile-jaw-upper"]').classes()).toContain(
      'crocodile-jaw--pass-hits',
    )
    expect(wrapper.get('[data-testid="crocodile-jaw-lower"]').classes()).toContain(
      'crocodile-jaw--pass-hits',
    )
    expect(wrapper.get('[data-testid="crocodile-tooth-grid-upper"]').classes()).toContain(
      'crocodile-tooth-grid--pass-hits',
    )

    await wrapper.get('[data-testid="crocodile-tooth-5"]').trigger('click')
    expect(wrapper.emitted('press')?.[0]).toEqual([5])
  })
})
