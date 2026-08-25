import { CROCODILE_CONFIG } from './config'

export const CROCODILE_WIDE_BREAKPOINT_PX = 375
export const CROCODILE_FULL_BLEED_BREAKPOINT_PX = 400
export const CROCODILE_WIDE_TOY_MAX_PX = 384
export const APP_CONTENT_INLINE_PADDING_PX = 16

export interface CrocodileLayoutMode {
  id: 'narrow' | 'wide'
  toyMaxWidthPx: number
  borderPx: number
  jawPaddingPx: number
  gumPaddingPx: number
  gridGapPx: number
}

/** 7×44 + 2px borders, zero gap/padding — fits 320px viewport. */
export const CROCODILE_LAYOUT_NARROW: CrocodileLayoutMode = {
  id: 'narrow',
  toyMaxWidthPx: 320,
  borderPx: 2,
  jawPaddingPx: 0,
  gumPaddingPx: 0,
  gridGapPx: 0,
}

/** Spacious chrome tuned so content width <= 375px at the wide breakpoint. */
export const CROCODILE_LAYOUT_WIDE: CrocodileLayoutMode = {
  id: 'wide',
  toyMaxWidthPx: CROCODILE_WIDE_TOY_MAX_PX,
  borderPx: 4,
  jawPaddingPx: 6,
  gumPaddingPx: 6,
  gridGapPx: 4,
}

export function resolveLayoutForViewport(viewportPx: number): CrocodileLayoutMode {
  return viewportPx >= CROCODILE_WIDE_BREAKPOINT_PX
    ? CROCODILE_LAYOUT_WIDE
    : CROCODILE_LAYOUT_NARROW
}

export function usesFullBleedStage(viewportPx: number): boolean {
  return viewportPx < CROCODILE_FULL_BLEED_BREAKPOINT_PX
}

export function computeAppContentWidthPx(
  viewportPx: number,
  paddingPx: number = APP_CONTENT_INLINE_PADDING_PX,
): number {
  return viewportPx - 2 * paddingPx
}

export function computeToothRowWidthPx(
  teethPerRow: number,
  toothSizePx: number,
  gridGapPx: number,
): number {
  return teethPerRow * toothSizePx + Math.max(0, teethPerRow - 1) * gridGapPx
}

export function computeToyContentWidthPx(layout: CrocodileLayoutMode): number {
  const rowWidth = computeToothRowWidthPx(
    CROCODILE_CONFIG.maxTeethAcross,
    CROCODILE_CONFIG.minTouchTargetPx,
    layout.gridGapPx,
  )
  const horizontalChrome = 2 * (layout.borderPx + layout.jawPaddingPx + layout.gumPaddingPx)
  return rowWidth + horizontalChrome
}

export function computeStageWidthPx(viewportPx: number): number {
  if (usesFullBleedStage(viewportPx)) {
    return viewportPx
  }

  const paddedWidth = computeAppContentWidthPx(viewportPx)
  return Math.min(paddedWidth, CROCODILE_LAYOUT_WIDE.toyMaxWidthPx)
}

export function layoutFitsViewport(layout: CrocodileLayoutMode, viewportPx: number): boolean {
  const contentWidth = computeToyContentWidthPx(layout)
  const toyCap = Math.min(viewportPx, layout.toyMaxWidthPx)
  return contentWidth <= toyCap && contentWidth <= viewportPx
}

export function toyFitsViewportWithoutScroll(viewportPx: number): boolean {
  const layout = resolveLayoutForViewport(viewportPx)
  const contentWidth = computeToyContentWidthPx(layout)
  const stageWidth = computeStageWidthPx(viewportPx)
  return contentWidth <= stageWidth && contentWidth <= viewportPx
}

export const CROCODILE_ART_WIDTH = 320
export const CROCODILE_ART_HEIGHT = 330

/** Toy box aspect from `.crocodile-toy--layout-responsive`. */
export const CROCODILE_TOY_ASPECT = 420 / 360

export type CrocodileLanePoint = readonly [number, number]
type Point = CrocodileLanePoint

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * The jaw arc follows the photograph's own tooth line; only the *spacing* along it is redrawn.
 *
 * The raster's twelve sockets sit anywhere from 17px to 35px apart at a 320px toy, so teeth pinned
 * to them are crowded at the back and roomy at the front - no hit-testing scheme fixes that. But
 * replacing the curve with a rounded-rect U (which is the longest path through this box, and so the
 * roomiest) reads as a rectangular frame and loses the toy's shape entirely. So: keep the measured
 * curve, spline through it, and place the teeth by equal arc length. Every tooth ends up the same
 * ~28px apart instead of some at 17px, and the jaw still looks like a jaw.
 */
const PHOTO_TOOTH_LINE: readonly Point[] = [
  [24.12, 62.33],
  [22.41, 67.23],
  [22.8, 72.38],
  [26.27, 77.53],
  [34.47, 81.42],
  [44.87, 83.3],
  [55.13, 83.22],
  [64.7, 81.5],
  [73.29, 77.61],
  [76.76, 72.42],
  [77.0, 66.85],
  [76.46, 62.46],
]

/**
 * Widening about the arc's own centroid, to buy back a little spacing without changing its shape.
 * Capped so the crowns keep a margin of gum outside them: pushed further, the outermost teeth
 * spill off the plate onto the green shell.
 */
export const CROCODILE_ARC_WIDENING = 1.06

/**
 * Camera model: the gum is a horizontal plane seen from above at a fixed elevation, so every
 * socket is an axis-aligned superellipse squashed by the same factor, and each tooth is that same
 * superellipse extruded straight up. A tooth cannot mis-fit its socket - it *is* its socket.
 */
export const CROCODILE_VIEW_SQUASH = 0.55
/** Socket half-width as a share of the tooth spacing, so the gum walls between them stay even. */
export const CROCODILE_SOCKET_PITCH_SHARE = 0.475
/** How much farther sockets shrink with depth (weak perspective). */
export const CROCODILE_DEPTH_FALLOFF = 0.22
/** Crown height as a multiple of its own width - a tooth stands up, it is not a tablet. */
export const CROCODILE_CROWN_ASPECT = 1.2
/**
 * Crown inset inside its socket. A crown that nearly fills its hole hides it, and then nothing
 * tells the eye the tooth is *in* something - it reads as a pale tablet lying on flat red. The
 * visible ring of dark hole is what sells the depth.
 */
export const CROCODILE_TOOTH_SOCKET_INSET = 0.88
/** Superellipse exponent: 2 is an ellipse, higher is a rounded rectangle. */
export const CROCODILE_SUPERELLIPSE_N = 3.4

export interface CrocodileArcPoint {
  point: Point
  tangent: Point
}

/** Isotropic space: x is % of toy width (centred on 0), y is % of toy height at the same scale. */
function toIsotropic([x, y]: Point): Point {
  return [x - 50, y * CROCODILE_TOY_ASPECT]
}

function catmullRom(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const t2 = t * t
  const t3 = t2 * t
  const axis = (i: 0 | 1) =>
    0.5 *
    (2 * p1[i] +
      (-p0[i] + p2[i]) * t +
      (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
      (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)
  return [axis(0), axis(1)]
}

function buildArcPolyline(): Point[] {
  const knots = PHOTO_TOOTH_LINE.map(toIsotropic)
  const beyond = (a: Point, b: Point): Point => [a[0] + (a[0] - b[0]), a[1] + (a[1] - b[1])]
  const control: Point[] = [
    beyond(knots[0]!, knots[1]!),
    ...knots,
    beyond(knots[knots.length - 1]!, knots[knots.length - 2]!),
  ]

  const steps = 60
  const dense: Point[] = []
  for (let segment = 0; segment < control.length - 3; segment += 1) {
    for (let i = 0; i < steps; i += 1) {
      dense.push(
        catmullRom(
          i / steps,
          control[segment]!,
          control[segment + 1]!,
          control[segment + 2]!,
          control[segment + 3]!,
        ),
      )
    }
  }
  dense.push(control[control.length - 2]!)

  const cx = dense.reduce((sum, q) => sum + q[0], 0) / dense.length
  const cy = dense.reduce((sum, q) => sum + q[1], 0) / dense.length
  return dense.map(([x, y]) => [
    cx + (x - cx) * CROCODILE_ARC_WIDENING,
    cy + (y - cy) * CROCODILE_ARC_WIDENING,
  ])
}

const ARC_POLYLINE = buildArcPolyline()
const ARC_CUMULATIVE = ARC_POLYLINE.reduce<number[]>((acc, point, index) => {
  if (index === 0) {
    acc.push(0)
    return acc
  }
  const previous = ARC_POLYLINE[index - 1]!
  acc.push(acc[index - 1]! + Math.hypot(point[0] - previous[0], point[1] - previous[1]))
  return acc
}, [])
export const CROCODILE_JAW_ARC_LENGTH_CQW = ARC_CUMULATIVE[ARC_CUMULATIVE.length - 1]!

/** Point and unit tangent at arc distance `u` from the left rear end. */
export function jawArcAt(u: number): CrocodileArcPoint {
  const clamped = Math.max(0, Math.min(CROCODILE_JAW_ARC_LENGTH_CQW, u))
  let hi = ARC_CUMULATIVE.length - 1
  let lo = 0
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (ARC_CUMULATIVE[mid]! <= clamped) lo = mid
    else hi = mid
  }
  const a = ARC_POLYLINE[lo]!
  const b = ARC_POLYLINE[Math.min(lo + 1, ARC_POLYLINE.length - 1)]!
  const span = ARC_CUMULATIVE[lo + 1]! - ARC_CUMULATIVE[lo]!
  const k = span ? (clamped - ARC_CUMULATIVE[lo]!) / span : 0
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return {
    point: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k],
    tangent: [(b[0] - a[0]) / length, (b[1] - a[1]) / length],
  }
}

/** Even spacing along the arc, in cqw. */
export const CROCODILE_TOOTH_PITCH_CQW =
  CROCODILE_JAW_ARC_LENGTH_CQW / CROCODILE_CONFIG.lowerRowCount
export const CROCODILE_SOCKET_RX_CQW = CROCODILE_TOOTH_PITCH_CQW * CROCODILE_SOCKET_PITCH_SHARE

export interface CrocodileToothSlot {
  index: number
  row: 'upper' | 'lower'
  /** Visual centre, as percentages of the toy box. */
  xPercent: number
  yPercent: number
  /** 0 at the front centre of the arc, 1 at the rear ends. */
  depth: number
  socketRxCqw: number
  socketRyCqw: number
  toothRxCqw: number
  toothRyCqw: number
  toothHeightCqw: number
}

export function computeToothSlot(row: 'upper' | 'lower', offsetInRow: number): CrocodileToothSlot {
  const index = row === 'upper' ? offsetInRow : CROCODILE_CONFIG.upperRowCount + offsetInRow
  const { point } = jawArcAt(CROCODILE_TOOTH_PITCH_CQW * (offsetInRow + 0.5))
  const ys = ARC_POLYLINE.map((q) => q[1])
  const yr = Math.min(...ys)
  const yf = Math.max(...ys)
  const depth = Math.max(0, Math.min(1, (yf - point[1]) / (yf - yr)))
  const shrink = 1 - CROCODILE_DEPTH_FALLOFF * depth
  const socketRx = CROCODILE_SOCKET_RX_CQW * shrink

  return {
    index,
    row,
    xPercent: roundTo(point[0] + 50, 3),
    yPercent: roundTo(point[1] / CROCODILE_TOY_ASPECT, 3),
    depth: roundTo(depth, 4),
    socketRxCqw: roundTo(socketRx, 3),
    socketRyCqw: roundTo(socketRx * CROCODILE_VIEW_SQUASH, 3),
    toothRxCqw: roundTo(socketRx * CROCODILE_TOOTH_SOCKET_INSET, 3),
    toothRyCqw: roundTo(socketRx * CROCODILE_VIEW_SQUASH * CROCODILE_TOOTH_SOCKET_INSET, 3),
    toothHeightCqw: roundTo(
      socketRx * 2 * CROCODILE_TOOTH_SOCKET_INSET * CROCODILE_CROWN_ASPECT,
      3,
    ),
  }
}

export function computeAllToothSlots(): CrocodileToothSlot[] {
  const upper = Array.from({ length: CROCODILE_CONFIG.upperRowCount }, (_, offset) =>
    computeToothSlot('upper', offset),
  )
  const lower = Array.from({ length: CROCODILE_CONFIG.lowerRowCount }, (_, offset) =>
    computeToothSlot('lower', offset),
  )
  return [...upper, ...lower]
}

export function toothSlotFitsArt(
  slot: CrocodileToothSlot,
  artWidthPx = CROCODILE_ART_WIDTH,
): boolean {
  const hitPx = CROCODILE_CONFIG.minTouchTargetPx
  const centerX = (slot.xPercent / 100) * artWidthPx
  return centerX - hitPx / 2 >= 0 && centerX + hitPx / 2 <= artWidthPx
}

/** Even spacing along the arc, in px, at a given toy width. */
export function computeToothPitchPx(toyWidthPx: number): number {
  return (CROCODILE_TOOTH_PITCH_CQW / 100) * toyWidthPx
}

// ---------------------------------------------------------------------------
// Path builders. Output is in toy percentages, for an SVG whose viewBox is
// `0 0 100 100` with `preserveAspectRatio="none"`, so x maps to width and y to height.
// ---------------------------------------------------------------------------

function toPathData(points: readonly Point[], close: boolean): string {
  const body = points
    .map(
      ([x, y], index) =>
        `${index ? 'L' : 'M'}${roundTo(x + 50, 3)} ${roundTo(y / CROCODILE_TOY_ASPECT, 3)}`,
    )
    .join('')
  return close ? `${body}Z` : body
}

/** Superellipse arc in isotropic space, sampled into a polyline. */
function superellipsePoints(
  centre: Point,
  rx: number,
  ry: number,
  fromAngle: number,
  toAngle: number,
  steps: number,
): Point[] {
  const exponent = 2 / CROCODILE_SUPERELLIPSE_N
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = fromAngle + ((toAngle - fromAngle) * i) / steps
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return [
      centre[0] + rx * Math.sign(c) * Math.abs(c) ** exponent,
      centre[1] + ry * Math.sign(s) * Math.abs(s) ** exponent,
    ] as Point
  })
}

function slotCentre(slot: CrocodileToothSlot): Point {
  return [slot.xPercent - 50, slot.yPercent * CROCODILE_TOY_ASPECT]
}

/** A socket opening: the full rounded-rect ring, squashed by the view angle. */
export function buildSocketPath(slot: CrocodileToothSlot, scale = 1): string {
  return toPathData(
    superellipsePoints(
      slotCentre(slot),
      slot.socketRxCqw * scale,
      slot.socketRyCqw * scale,
      0,
      Math.PI * 2,
      72,
    ),
    true,
  )
}

/**
 * The near lip of a socket, as a crescent between the hole and a slightly larger ring. Drawn *over*
 * the crown, it is the one cue that makes a tooth read as standing inside a hole rather than
 * floating above a dark smudge.
 */
export function buildSocketRimPath(
  slot: CrocodileToothSlot,
  from: number,
  to: number,
  half: 'near' | 'far',
): string {
  const centre = slotCentre(slot)
  const [a, b] = half === 'near' ? [0, Math.PI] : [Math.PI, Math.PI * 2]
  const inner = superellipsePoints(
    centre,
    slot.socketRxCqw * from,
    slot.socketRyCqw * from,
    a,
    b,
    36,
  )
  const outer = superellipsePoints(centre, slot.socketRxCqw * to, slot.socketRyCqw * to, b, a, 36)
  return `${toPathData(inner, false)}${toPathData(outer, false).replace('M', 'L')}Z`
}

export interface CrocodileToothSprite {
  /** Sprite box in toy percentages, ready for an SVG `<image>` in the 0 0 100 100 viewBox. */
  x: number
  y: number
  width: number
  height: number
}

/**
 * Box for the photographed crown. Its base sits almost on the socket's *near* edge, not its centre:
 * a peg standing in a hole shows the hole's dark interior behind it and nothing in front, so the
 * visible crescent of well has to fall on the far side. Putting the base mid-socket puts the dark
 * band under the tooth instead, which reads as a drop shadow and makes the tooth look pasted on.
 */
export function computeToothSprite(
  slot: CrocodileToothSlot,
  heightScale = 1,
): CrocodileToothSprite {
  const width = slot.toothRxCqw * 2
  const height = width * CROCODILE_CROWN_ASPECT * heightScale
  const baseY = slot.yPercent + (slot.socketRyCqw * 0.92) / CROCODILE_TOY_ASPECT
  return {
    x: roundTo(slot.xPercent - width / 2, 3),
    y: roundTo(baseY - height / CROCODILE_TOY_ASPECT, 3),
    width: roundTo(width, 3),
    height: roundTo(height / CROCODILE_TOY_ASPECT, 3),
  }
}

/**
 * Hit lanes.
 *
 * The raster sockets sit only ~17px apart along the rear of the arc at the 320px toy width, so a
 * 44px AAA square per tooth is geometrically impossible — the previous axis-aligned rectangles
 * bought their size by overlapping (~10px between teeth 4 and 5), which let a tap on one tooth
 * fire its neighbour. In a game where picking the wrong tooth is the whole point, that is worse
 * than a small target, so lanes now tile the arc exactly: adjacent lanes share one seam segment,
 * leaving no overlap and no dead gap. Depth is spent perpendicular to the arc, out over the dead
 * green shell, where there is room.
 */
export const CROCODILE_LANE_OUTWARD_CQW = 11.5
export const CROCODILE_LANE_INWARD_CQW = 6.5
/** End teeth have open space behind them, so their outer seam runs past the mirrored midpoint. */
export const CROCODILE_LANE_END_EXTENSION = 1.45
/** Amplifies how much of a shared seam the larger of two neighbouring teeth claims. */
export interface CrocodileToothHitLane {
  index: number
  /** Offsets/size in cqw (1cqw = 1% of toy width), relative to the tooth's visual centre. */
  offsetXCqw: number
  offsetYCqw: number
  widthCqw: number
  heightCqw: number
  /** `clip-path` polygon, vertices as percentages of the lane's bounding box. */
  clipPath: string
}

/**
 * Isotropic cqw space, centred on the *visible crown* rather than on the socket: the crown stands
 * up out of its hole, so a lane centred on the socket would sit below what the player is aiming at.
 */
function toLaneSpace(slot: CrocodileToothSlot): Point {
  return [slot.xPercent, slot.yPercent * CROCODILE_TOY_ASPECT - slot.toothHeightCqw / 2]
}

/** Where the hit lane is anchored, as toy percentages — the button is positioned here. */
export function computeLaneAnchor(slot: CrocodileToothSlot): {
  xPercent: number
  yPercent: number
} {
  const [x, y] = toLaneSpace(slot)
  return { xPercent: roundTo(x, 3), yPercent: roundTo(y / CROCODILE_TOY_ASPECT, 3) }
}

function outwardNormal(from: Point, to: Point, at: Point, centroid: Point): Point {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  const tangent: Point = [(to[0] - from[0]) / length, (to[1] - from[1]) / length]
  const normal: Point = [-tangent[1], tangent[0]]
  const facesOutward = (at[0] - centroid[0]) * normal[0] + (at[1] - centroid[1]) * normal[1] >= 0
  return facesOutward ? normal : [-normal[0], -normal[1]]
}

interface Seam {
  outer: Point
  inner: Point
}

/** Seam `i` separates tooth `i - 1` from tooth `i`, so there is one more seam than teeth. */
function computeLaneSeams(centers: readonly Point[]): Seam[] {
  const centroid: Point = [
    centers.reduce((sum, point) => sum + point[0], 0) / centers.length,
    centers.reduce((sum, point) => sum + point[1], 0) / centers.length,
  ]

  return Array.from({ length: centers.length + 1 }, (_, seamIndex) => {
    const isFirst = seamIndex === 0
    const isLast = seamIndex === centers.length

    let fromIndex = seamIndex - 1
    let toIndex = seamIndex
    if (isFirst) {
      fromIndex = 0
      toIndex = 1
    } else if (isLast) {
      fromIndex = centers.length - 2
      toIndex = centers.length - 1
    }
    const from = centers[fromIndex]!
    const to = centers[toIndex]!

    let midpoint: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
    if (isFirst || isLast) {
      const anchor = isFirst ? from : to
      const halfStep: Point = [(to[0] - from[0]) / 2, (to[1] - from[1]) / 2]
      const direction = isFirst ? -CROCODILE_LANE_END_EXTENSION : CROCODILE_LANE_END_EXTENSION
      midpoint = [anchor[0] + halfStep[0] * direction, anchor[1] + halfStep[1] * direction]
    }

    const normal = outwardNormal(from, to, midpoint, centroid)
    return {
      outer: [
        midpoint[0] + normal[0] * CROCODILE_LANE_OUTWARD_CQW,
        midpoint[1] + normal[1] * CROCODILE_LANE_OUTWARD_CQW,
      ],
      inner: [
        midpoint[0] - normal[0] * CROCODILE_LANE_INWARD_CQW,
        midpoint[1] - normal[1] * CROCODILE_LANE_INWARD_CQW,
      ],
    }
  })
}

export function computeToothHitLanes(
  slots: readonly CrocodileToothSlot[] = computeAllToothSlots(),
): CrocodileToothHitLane[] {
  const centers = slots.map(toLaneSpace)
  const seams = computeLaneSeams(centers)

  return slots.map((slot, index) => {
    const center = centers[index]!
    const quad: Point[] = [
      seams[index]!.outer,
      seams[index + 1]!.outer,
      seams[index + 1]!.inner,
      seams[index]!.inner,
    ]

    const minX = Math.min(...quad.map((point) => point[0]))
    const maxX = Math.max(...quad.map((point) => point[0]))
    const minY = Math.min(...quad.map((point) => point[1]))
    const maxY = Math.max(...quad.map((point) => point[1]))
    const width = maxX - minX
    const height = maxY - minY

    const clipPath = quad
      .map(
        (point) =>
          `${roundTo(((point[0] - minX) / width) * 100, 2)}% ${roundTo(((point[1] - minY) / height) * 100, 2)}%`,
      )
      .join(', ')

    return {
      index: slot.index,
      offsetXCqw: roundTo(minX - center[0], 2),
      offsetYCqw: roundTo(minY - center[1], 2),
      widthCqw: roundTo(width, 2),
      heightCqw: roundTo(height, 2),
      clipPath: `polygon(${clipPath})`,
    }
  })
}

/** Lane corners in cqw space — exposed so tests can assert the tiling has no overlap or gap. */
export function computeToothLaneQuads(
  slots: readonly CrocodileToothSlot[] = computeAllToothSlots(),
): Point[][] {
  const seams = computeLaneSeams(slots.map(toLaneSpace))
  return slots.map((_, index) => [
    seams[index]!.outer,
    seams[index + 1]!.outer,
    seams[index + 1]!.inner,
    seams[index]!.inner,
  ])
}

export function computeLaneAreaCqw2(quad: readonly Point[]): number {
  let doubleArea = 0
  for (let index = 0; index < quad.length; index += 1) {
    const current = quad[index]!
    const next = quad[(index + 1) % quad.length]!
    doubleArea += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(doubleArea) / 2
}

export function laneContainsPoint(quad: readonly Point[], point: Point): boolean {
  let inside = false
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
    const [xi, yi] = quad[i]!
    const [xj, yj] = quad[j]!
    if (yi > point[1] !== yj > point[1]) {
      const crossX = ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
      if (point[0] < crossX) {
        inside = !inside
      }
    }
  }
  return inside
}
