import { describe, it, expect } from 'vitest'
import { CROCODILE_CONFIG } from './config'
import {
  APP_CONTENT_INLINE_PADDING_PX,
  CROCODILE_FULL_BLEED_BREAKPOINT_PX,
  CROCODILE_LAYOUT_NARROW,
  CROCODILE_LAYOUT_WIDE,
  CROCODILE_WIDE_BREAKPOINT_PX,
  computeAllToothSlots,
  computeAppContentWidthPx,
  computeToothRowWidthPx,
  computeToyContentWidthPx,
  layoutFitsViewport,
  resolveLayoutForViewport,
  toothSlotFitsArt,
  toyFitsViewportWithoutScroll,
  usesFullBleedStage,
} from './layout'

describe('crocodile layout', () => {
  it('computes 7×44 tooth row width with optional gaps', () => {
    expect(
      computeToothRowWidthPx(CROCODILE_CONFIG.maxTeethAcross, CROCODILE_CONFIG.minTouchTargetPx, 0),
    ).toBe(308)

    expect(
      computeToothRowWidthPx(
        CROCODILE_CONFIG.maxTeethAcross,
        CROCODILE_CONFIG.minTouchTargetPx,
        CROCODILE_LAYOUT_WIDE.gridGapPx,
      ),
    ).toBe(332)
  })

  it('fits narrow chrome inside a 320px viewport without scaling teeth', () => {
    expect(computeToyContentWidthPx(CROCODILE_LAYOUT_NARROW)).toBeLessThanOrEqual(320)
    expect(layoutFitsViewport(CROCODILE_LAYOUT_NARROW, 320)).toBe(true)
  })

  it('fits wide chrome inside a 375px viewport without scaling teeth', () => {
    expect(computeToyContentWidthPx(CROCODILE_LAYOUT_WIDE)).toBeLessThanOrEqual(375)
    expect(layoutFitsViewport(CROCODILE_LAYOUT_WIDE, CROCODILE_WIDE_BREAKPOINT_PX)).toBe(true)
  })

  it('allows wide toy to grow up to 24rem on larger viewports', () => {
    expect(CROCODILE_LAYOUT_WIDE.toyMaxWidthPx).toBe(384)
    expect(layoutFitsViewport(CROCODILE_LAYOUT_WIDE, 390)).toBe(true)
  })

  it('uses full-bleed stage below 400px viewport', () => {
    expect(CROCODILE_FULL_BLEED_BREAKPOINT_PX).toBe(400)
    expect(usesFullBleedStage(320)).toBe(true)
    expect(usesFullBleedStage(375)).toBe(true)
    expect(usesFullBleedStage(390)).toBe(true)
    expect(usesFullBleedStage(400)).toBe(false)
  })

  it('resolves layout mode at the wide chrome breakpoint', () => {
    expect(resolveLayoutForViewport(320).id).toBe('narrow')
    expect(resolveLayoutForViewport(374).id).toBe('narrow')
    expect(resolveLayoutForViewport(375).id).toBe('wide')
    expect(resolveLayoutForViewport(400).id).toBe('wide')
  })

  it('fits toy at 320, 375, 390, and 400 without horizontal overflow', () => {
    for (const viewportPx of [320, 375, 390, 400]) {
      expect(toyFitsViewportWithoutScroll(viewportPx)).toBe(true)
    }
  })

  it('accounts for app-content inline padding in padded stage width', () => {
    expect(computeAppContentWidthPx(400, APP_CONTENT_INLINE_PADDING_PX)).toBe(368)
    expect(computeToyContentWidthPx(CROCODILE_LAYOUT_WIDE)).toBeLessThanOrEqual(368)
  })

  it('places twelve accessible teeth around the lower jaw at 320px', () => {
    const slots = computeAllToothSlots()
    expect(slots).toHaveLength(CROCODILE_CONFIG.toothCount)
    expect(new Set(slots.map((slot) => slot.index)).size).toBe(CROCODILE_CONFIG.toothCount)

    for (const slot of slots) {
      expect(toothSlotFitsArt(slot)).toBe(true)
      expect(slot.xPercent).toBeGreaterThan(10)
      expect(slot.xPercent).toBeLessThan(90)
    }

    expect(slots.every((slot) => slot.row === 'lower')).toBe(true)
    expect(slots[5]?.yPercent).toBeGreaterThan(slots[0]?.yPercent ?? 0)
    expect(slots.map((slot) => slot.yPercent)).toEqual([
      62.87, 67.48, 72.55, 77.69, 81.72, 83.57, 83.54, 81.8, 77.76, 72.54, 67.45, 62.91,
    ])

    const renderedWidth = 320
    const renderedHeight = renderedWidth * (420 / 360)
    for (let first = 0; first < slots.length; first += 1) {
      for (let second = first + 1; second < slots.length; second += 1) {
        const a = slots[first]!
        const b = slots[second]!
        const dx = ((a.xPercent - b.xPercent) / 100) * renderedWidth
        const dy = ((a.yPercent - b.yPercent) / 100) * renderedHeight
        // The enlarged mobile hit areas may overlap slightly along the receding sides of the
        // perspective jaw, while the visible tooth centers remain clearly separated.
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(
          CROCODILE_CONFIG.compactTouchTargetPx * 0.4,
        )
      }
    }
  })

  it('stores per-socket perspective tuning instead of deriving one shared tooth curve', () => {
    const slots = computeAllToothSlots()

    expect(slots.map((slot) => slot.scale)).toEqual([
      0.84, 0.89, 0.945, 1, 1.055, 1.095, 1.075, 1.045, 0.995, 0.945, 0.89, 0.83,
    ])
    expect(slots[0]?.rotationDeg).toBeGreaterThan(0)
    expect(slots[11]?.rotationDeg).toBeLessThan(0)
    expect(slots[5]?.scale).toBeGreaterThan(slots[0]?.scale ?? 0)
    expect(slots[5]?.heightScale).toBeGreaterThan(slots[0]?.heightScale ?? 0)
    expect(slots[6]?.heightScale).toBeGreaterThan(slots[11]?.heightScale ?? 0)
    expect(slots.every((slot) => slot.sinkDepthPx >= 2.6 && slot.sinkDepthPx <= 3.4)).toBe(true)
    expect(slots.every((slot) => slot.pressedOffsetPx >= 6.2 && slot.pressedOffsetPx <= 7.6)).toBe(
      true,
    )
    expect(new Set(slots.map((slot) => `${slot.xPercent}:${slot.yPercent}`)).size).toBe(12)
  })
})
