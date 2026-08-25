import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CrocodileToy from './CrocodileToy.vue'
import { CROCODILE_CONFIG } from '../config'
import { computeAllToothSlots, computeLaneAnchor, computeToothHitLanes } from '../layout'

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

    const slots = computeAllToothSlots()
    for (const [index, tooth] of teeth.entries()) {
      const anchor = computeLaneAnchor(slots[index]!)
      expect(tooth.attributes('style')).toContain(`left: ${anchor.xPercent}%`)
    }
    // A U around the jaw: the ends sit high and symmetric, the middle sits low.
    expect(slots[0]!.yPercent).toBeLessThan(slots[5]!.yPercent)
    // The arc traces a photograph of a real object, so it is near-symmetric, not symmetric.
    expect(slots[0]!.xPercent + slots[11]!.xPercent).toBeCloseTo(100, 0)
  })

  it('anchors each hit target on its own crown', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })

    for (const slot of computeAllToothSlots()) {
      const anchor = computeLaneAnchor(slot)
      const style = wrapper.get(`[data-testid="crocodile-tooth-${slot.index}"]`).attributes('style')

      expect(style).toContain(`left: ${anchor.xPercent}%`)
      expect(style).toContain(`top: ${anchor.yPercent}%`)
      // The crown stands above its socket, so the target must sit above the socket centre too.
      expect(anchor.yPercent).toBeLessThan(slot.yPercent)
    }
  })

  it('sizes every hit lane in toy percentages without moving its visual center', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })
    const lanes = computeToothHitLanes()

    for (const lane of lanes) {
      const style = wrapper.get(`[data-testid="crocodile-tooth-${lane.index}"]`).attributes('style')

      expect(style).toContain(`--tooth-lane-w: ${lane.widthCqw}cqw`)
      expect(style).toContain(`--tooth-lane-h: ${lane.heightCqw}cqw`)
      expect(style).toContain(`--tooth-lane-x: ${lane.offsetXCqw}cqw`)
      expect(style).toContain(`--tooth-lane-y: ${lane.offsetYCqw}cqw`)
      expect(style).toContain('--tooth-lane-clip: polygon(')
    }

    const slots = computeAllToothSlots()
    expect(wrapper.get('[data-testid="crocodile-tooth-0"]').attributes('style')).toContain(
      `left: ${computeLaneAnchor(slots[0]!).xPercent}%`,
    )
  })

  it('keeps a real viewBox on the jaw drawing', () => {
    // A bound `:view-box` is silently dropped (SVG attribute names are case-sensitive), which
    // leaves the path coordinates to be read as raw pixels: the whole jaw then renders
    // off-register and at the wrong size, with nothing failing anywhere else.
    const wrapper = mount(CrocodileToy, { props: defaultProps })
    const art = wrapper.get('[data-testid="crocodile-jaw-art"]').element

    expect(art.getAttribute('viewBox')).toBe('0 0 100 100')
    expect(art.getAttribute('preserveAspectRatio')).toBe('none')
    expect(art.getAttribute('view-box')).toBeNull()
  })

  it('draws every socket and its crown in the one coordinate system', () => {
    const wrapper = mount(CrocodileToy, { props: defaultProps })
    const art = wrapper.get('[data-testid="crocodile-jaw-art"]')

    for (let index = 0; index < CROCODILE_CONFIG.toothCount; index += 1) {
      expect(art.find(`[data-testid="crocodile-tooth-socket-${index}"]`).exists()).toBe(true)
      expect(art.find(`[data-testid="crocodile-tooth-shape-${index}"]`).exists()).toBe(true)
    }
    // One drawing, not twelve islands: a tooth in its own box can drift out of its hole.
    expect(wrapper.findAll('[data-testid="crocodile-jaw-art"]')).toHaveLength(1)
  })

  it('marks a pressed crown so it sinks into its own socket', () => {
    const wrapper = mount(CrocodileToy, {
      props: { ...defaultProps, pressedIndices: [4] },
    })

    expect(wrapper.get('[data-testid="crocodile-tooth-shape-4"]').classes()).toContain(
      'crocodile-tooth-art--pressed',
    )
    expect(wrapper.get('[data-testid="crocodile-tooth-shape-5"]').classes()).not.toContain(
      'crocodile-tooth-art--pressed',
    )
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
