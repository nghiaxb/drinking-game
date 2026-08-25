import { describe, it, expect } from 'vitest'
import { CROCODILE_CONFIG } from './config'
import {
  APP_CONTENT_INLINE_PADDING_PX,
  buildSocketRimPath,
  buildSocketPath,
  computeToothSprite,
  CROCODILE_FULL_BLEED_BREAKPOINT_PX,
  CROCODILE_TOOTH_PITCH_CQW,
  CROCODILE_LAYOUT_NARROW,
  CROCODILE_LAYOUT_WIDE,
  CROCODILE_TOOTH_SOCKET_INSET,
  CROCODILE_TOY_ASPECT,
  CROCODILE_VIEW_SQUASH,
  CROCODILE_WIDE_BREAKPOINT_PX,
  computeAllToothSlots,
  computeAppContentWidthPx,
  computeLaneAreaCqw2,
  computeToothHitLanes,
  computeToothLaneQuads,
  computeToothPitchPx,
  computeToothRowWidthPx,
  computeToyContentWidthPx,
  laneContainsPoint,
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

  it('places twelve teeth around the lower jaw, all inside the art', () => {
    const slots = computeAllToothSlots()
    expect(slots).toHaveLength(CROCODILE_CONFIG.toothCount)
    expect(new Set(slots.map((slot) => slot.index)).size).toBe(CROCODILE_CONFIG.toothCount)
    expect(slots.every((slot) => slot.row === 'lower')).toBe(true)

    for (const slot of slots) {
      expect(toothSlotFitsArt(slot)).toBe(true)
      expect(slot.xPercent).toBeGreaterThan(10)
      expect(slot.xPercent).toBeLessThan(90)
      expect(slot.yPercent).toBeGreaterThan(58)
      expect(slot.yPercent).toBeLessThan(86)
    }
    // Symmetric about the toy centre, front-centre lowest on screen.
    // The arc traces a photograph of a real object, so it is near-symmetric, not symmetric.
    expect(slots[0]!.xPercent + slots[11]!.xPercent).toBeCloseTo(100, 0)
    expect(slots[5]!.yPercent).toBeGreaterThan(slots[0]!.yPercent)
  })

  it('spaces the teeth evenly by arc length', () => {
    // Pinning teeth to the photo's own sockets left gaps of 17px to 35px at a 320px toy: the rear
    // teeth touched while the front ones had room to spare. Even spacing is the whole point of
    // drawing the arc, so it is worth asserting rather than eyeballing.
    const slots = computeAllToothSlots()
    const pitches: number[] = []
    for (let index = 0; index < slots.length - 1; index += 1) {
      const a = slots[index]!
      const b = slots[index + 1]!
      pitches.push(
        Math.hypot(a.xPercent - b.xPercent, (a.yPercent - b.yPercent) * CROCODILE_TOY_ASPECT),
      )
    }
    const min = Math.min(...pitches)
    const max = Math.max(...pitches)
    expect(max / min).toBeLessThan(1.2)
    // Straight-line spacing is a chord, so it sits just under the arc-length pitch.
    expect(min).toBeGreaterThan(CROCODILE_TOOTH_PITCH_CQW * 0.85)
  })

  it('clears the WCAG 24px floor on tooth spacing at the smallest toy width', () => {
    // 44px AAA is out of reach: the photo's tooth line is only ~330px long at a 320px toy and
    // twelve teeth need 484px of it. Even spacing gets every tooth the same ~28px, not some at 17px.
    expect(computeToothPitchPx(320)).toBeGreaterThan(24)
    expect(computeToothPitchPx(384)).toBeGreaterThan(24)
  })

  it('derives every tooth from one camera model, so no tooth can mis-fit its socket', () => {
    const slots = computeAllToothSlots()

    for (const slot of slots) {
      // Same squash for every socket: the gum is one plane seen at one elevation.
      expect(slot.socketRyCqw / slot.socketRxCqw).toBeCloseTo(CROCODILE_VIEW_SQUASH, 3)
      expect(slot.toothRyCqw / slot.toothRxCqw).toBeCloseTo(CROCODILE_VIEW_SQUASH, 3)
      // The crown is the socket, inset and extruded — it cannot drift out of the hole.
      expect(slot.toothRxCqw / slot.socketRxCqw).toBeCloseTo(CROCODILE_TOOTH_SOCKET_INSET, 3)
      expect(slot.toothHeightCqw).toBeGreaterThan(slot.socketRyCqw * 2)
    }
  })

  it('recedes size with depth, front centre largest', () => {
    const slots = computeAllToothSlots()
    const widths = slots.map((slot) => slot.socketRxCqw)
    const front = widths.indexOf(Math.max(...widths))

    for (let index = 1; index <= front; index += 1) {
      expect(widths[index]!).toBeGreaterThanOrEqual(widths[index - 1]!)
    }
    for (let index = front + 1; index < widths.length; index += 1) {
      expect(widths[index]!).toBeLessThanOrEqual(widths[index - 1]!)
    }
    expect(Math.min(...widths) / Math.max(...widths)).toBeLessThan(0.9)
    expect(slots[0]!.depth).toBeGreaterThan(slots[5]!.depth)
  })

  it('emits closed path data for every socket and its rims', () => {
    for (const slot of computeAllToothSlots()) {
      const paths = [
        buildSocketPath(slot),
        buildSocketRimPath(slot, 0.62, 1, 'far'),
        buildSocketRimPath(slot, 0.8, 1.08, 'near'),
      ]
      for (const d of paths) {
        expect(d.startsWith('M')).toBe(true)
        expect(d.endsWith('Z')).toBe(true)
        expect(d).not.toContain('NaN')
      }
    }
  })

  it('keeps the near and far rims on opposite sides of the socket', () => {
    // The dark interior of a hole shows behind a peg, never in front of it. Getting these the wrong
    // way round puts the shadow under the tooth, which reads as a drop shadow on flat gum.
    const slot = computeAllToothSlots()[5]!
    const midY = (d: string) => {
      const ys = [...d.matchAll(/[ML](?:-?[\d.]+) (-?[\d.]+)/gu)].map((m) => Number(m[1]))
      return ys.reduce((sum, y) => sum + y, 0) / ys.length
    }
    expect(midY(buildSocketRimPath(slot, 0.62, 1, 'far'))).toBeLessThan(slot.yPercent)
    expect(midY(buildSocketRimPath(slot, 0.8, 1.08, 'near'))).toBeGreaterThan(slot.yPercent)
  })

  it('plants every crown on its own socket, and sinks it when pressed', () => {
    for (const slot of computeAllToothSlots()) {
      const resting = computeToothSprite(slot)
      const pressed = computeToothSprite(slot, 0.34)

      // Same width and same base line: pressing shortens the crown, it does not move the tooth.
      expect(pressed.width).toBe(resting.width)
      expect(pressed.y + pressed.height).toBeCloseTo(resting.y + resting.height, 2)
      expect(pressed.height).toBeLessThan(resting.height)
      // The crown stands up out of the hole and is centred on it.
      expect(resting.y + resting.height).toBeGreaterThan(slot.yPercent)
      expect(resting.x + resting.width / 2).toBeCloseTo(slot.xPercent, 3)
    }
  })
})

describe('crocodile hit lanes', () => {
  const NARROW_TOY_PX = CROCODILE_LAYOUT_NARROW.toyMaxWidthPx
  const cqwToPx = (value: number) => (value / 100) * NARROW_TOY_PX

  function laneCentroid(quad: readonly (readonly [number, number])[]): [number, number] {
    return [
      quad.reduce((sum, point) => sum + point[0], 0) / quad.length,
      quad.reduce((sum, point) => sum + point[1], 0) / quad.length,
    ]
  }

  it('tiles the jaw arc so no point can resolve to two teeth', () => {
    const quads = computeToothLaneQuads()

    // Sample toward each lane's centroid from each corner: every sample must have exactly one owner.
    for (const [index, quad] of quads.entries()) {
      const centroid = laneCentroid(quad)
      for (const corner of quad) {
        for (const t of [0.08, 0.25, 0.5, 0.75, 0.92]) {
          const point: [number, number] = [
            corner[0] + (centroid[0] - corner[0]) * t,
            corner[1] + (centroid[1] - corner[1]) * t,
          ]
          const owners = quads
            .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
            .filter(({ candidate }) => laneContainsPoint(candidate, point))
            .map(({ candidateIndex }) => candidateIndex)

          expect(owners).toEqual([index])
        }
      }
    }
  })

  it('keeps every visible crown centre inside its own lane', () => {
    // Lanes are anchored on the crown, not the socket: the crown stands up out of the hole, so a
    // socket-centred lane would sit below what the player is aiming at.
    const slots = computeAllToothSlots()
    const quads = computeToothLaneQuads(slots)

    for (const [index, slot] of slots.entries()) {
      const crownCentre: [number, number] = [
        slot.xPercent,
        slot.yPercent * CROCODILE_TOY_ASPECT - slot.toothHeightCqw / 2,
      ]
      expect(laneContainsPoint(quads[index]!, crownCentre)).toBe(true)
    }
  })

  it('spends lane depth perpendicular to the arc, where the raster leaves room', () => {
    // Along the arc the raster sockets are only ~17px apart at the 320px toy width, so the short
    // axis is pitch-limited and a 44px AAA square is geometrically impossible. The long axis runs
    // out over the dead green shell, so it must still clear 44px.
    for (const lane of computeToothHitLanes()) {
      expect(cqwToPx(Math.max(lane.widthCqw, lane.heightCqw))).toBeGreaterThanOrEqual(44)
      expect(cqwToPx(Math.min(lane.widthCqw, lane.heightCqw))).toBeGreaterThanOrEqual(20)
    }
  })

  it('gives every lane at least a 24x24px worth of area at the smallest toy width', () => {
    const areas = computeToothLaneQuads().map(
      (quad) => computeLaneAreaCqw2(quad) * (NARROW_TOY_PX / 100) ** 2,
    )

    for (const area of areas) {
      expect(area).toBeGreaterThanOrEqual(24 * 24)
    }
    // Even arc spacing means the lanes are near-identical too: no tooth is the awkward one.
    expect(Math.max(...areas) / Math.min(...areas)).toBeLessThan(1.35)
    expect(Math.min(...areas)).toBeGreaterThan(1200)
  })

  it('emits a clip-path polygon per lane', () => {
    for (const lane of computeToothHitLanes()) {
      expect(lane.clipPath).toMatch(/^polygon\((?:-?[\d.]+% -?[\d.]+%, ){3}-?[\d.]+% -?[\d.]+%\)$/u)
    }
  })
})
