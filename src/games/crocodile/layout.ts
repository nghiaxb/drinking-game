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

export interface CrocodileToothSlot {
  index: number
  row: 'upper' | 'lower'
  xPercent: number
  yPercent: number
  scale: number
  heightScale: number
  rotationDeg: number
  sinkDepthPx: number
  pressedOffsetPx: number
  socketWidthPercent: number
  socketHeightPercent: number
  profileIndex: number
  highlightOpacity: number
}

/**
 * Hand-tuned against the twelve raster socket centers in crocodile-base.webp.
 * Values intentionally do not derive from a shared arc/curve formula.
 */
const LOWER_JAW_TOOTH_SLOTS = [
  // Raster socket center (235.5, 373.5): far-left/rear.
  {
    xPercent: 23,
    yPercent: 62.87,
    scale: 0.84,
    heightScale: 0.74,
    rotationDeg: 0.3,
    sinkDepthPx: 3.4,
    pressedOffsetPx: 6.2,
    socketWidthPercent: 5.05,
    socketHeightPercent: 2.47,
    profileIndex: 0,
    highlightOpacity: 0.62,
  },
  // Raster socket center (228.5, 428.5).
  {
    xPercent: 22.31,
    yPercent: 67.48,
    scale: 0.89,
    heightScale: 0.79,
    rotationDeg: 0.2,
    sinkDepthPx: 3.3,
    pressedOffsetPx: 6.4,
    socketWidthPercent: 5.55,
    socketHeightPercent: 2.77,
    profileIndex: 1,
    highlightOpacity: 0.67,
  },
  // Raster socket center (230.2, 489.1).
  {
    xPercent: 22.48,
    yPercent: 72.55,
    scale: 0.945,
    heightScale: 0.82,
    rotationDeg: 0.8,
    sinkDepthPx: 3.2,
    pressedOffsetPx: 6.6,
    socketWidthPercent: 5.95,
    socketHeightPercent: 3.13,
    profileIndex: 1,
    highlightOpacity: 0.71,
  },
  // Raster socket center (264.9, 550.5): the arc turns sharply here.
  {
    xPercent: 25.87,
    yPercent: 77.69,
    scale: 1,
    heightScale: 0.88,
    rotationDeg: 2.8,
    sinkDepthPx: 3,
    pressedOffsetPx: 7,
    socketWidthPercent: 7.05,
    socketHeightPercent: 3.5,
    profileIndex: 2,
    highlightOpacity: 0.76,
  },
  // Raster socket center (352.4, 598.6).
  {
    xPercent: 34.41,
    yPercent: 81.72,
    scale: 1.055,
    heightScale: 0.96,
    rotationDeg: 1.4,
    sinkDepthPx: 2.8,
    pressedOffsetPx: 7.3,
    socketWidthPercent: 7.7,
    socketHeightPercent: 3.31,
    profileIndex: 3,
    highlightOpacity: 0.81,
  },
  // Raster socket center (460.7, 620.7): front-left.
  {
    xPercent: 44.99,
    yPercent: 83.57,
    scale: 1.095,
    heightScale: 1,
    rotationDeg: 0.3,
    sinkDepthPx: 2.6,
    pressedOffsetPx: 7.6,
    socketWidthPercent: 5.7,
    socketHeightPercent: 2.65,
    profileIndex: 4,
    highlightOpacity: 0.86,
  },
  // Raster socket center (559.7, 620.4): front-right.
  {
    xPercent: 54.66,
    yPercent: 83.54,
    scale: 1.075,
    heightScale: 0.98,
    rotationDeg: -0.2,
    sinkDepthPx: 2.7,
    pressedOffsetPx: 7.5,
    socketWidthPercent: 5.3,
    socketHeightPercent: 2.53,
    profileIndex: 3,
    highlightOpacity: 0.82,
  },
  // Raster socket center (657.9, 599.6).
  {
    xPercent: 64.25,
    yPercent: 81.8,
    scale: 1.045,
    heightScale: 0.94,
    rotationDeg: -1.3,
    sinkDepthPx: 2.8,
    pressedOffsetPx: 7.3,
    socketWidthPercent: 7.2,
    socketHeightPercent: 3.31,
    profileIndex: 4,
    highlightOpacity: 0.84,
  },
  // Raster socket center (748.3, 551.4): mirrored perspective turn.
  {
    xPercent: 73.08,
    yPercent: 77.76,
    scale: 0.995,
    heightScale: 0.87,
    rotationDeg: -2.6,
    sinkDepthPx: 3,
    pressedOffsetPx: 7,
    socketWidthPercent: 7.45,
    socketHeightPercent: 3.61,
    profileIndex: 2,
    highlightOpacity: 0.75,
  },
  // Raster socket center (788, 489).
  {
    xPercent: 76.95,
    yPercent: 72.54,
    scale: 0.945,
    heightScale: 0.81,
    rotationDeg: -0.8,
    sinkDepthPx: 3.2,
    pressedOffsetPx: 6.6,
    socketWidthPercent: 6,
    socketHeightPercent: 3.25,
    profileIndex: 1,
    highlightOpacity: 0.7,
  },
  // Raster socket center (791.4, 428.1).
  {
    xPercent: 77.29,
    yPercent: 67.45,
    scale: 0.89,
    heightScale: 0.78,
    rotationDeg: -0.3,
    sinkDepthPx: 3.3,
    pressedOffsetPx: 6.4,
    socketWidthPercent: 5.75,
    socketHeightPercent: 2.95,
    profileIndex: 1,
    highlightOpacity: 0.66,
  },
  // Raster socket center (786, 374): far-right/rear.
  {
    xPercent: 76.76,
    yPercent: 62.91,
    scale: 0.83,
    heightScale: 0.73,
    rotationDeg: -0.4,
    sinkDepthPx: 3.4,
    pressedOffsetPx: 6.2,
    socketWidthPercent: 5.05,
    socketHeightPercent: 2.47,
    profileIndex: 0,
    highlightOpacity: 0.6,
  },
] as const

export function computeToothSlot(row: 'upper' | 'lower', offsetInRow: number): CrocodileToothSlot {
  const index = row === 'upper' ? offsetInRow : CROCODILE_CONFIG.upperRowCount + offsetInRow
  const tuning = LOWER_JAW_TOOTH_SLOTS[index] ?? {
    xPercent: 50,
    yPercent: 72,
    scale: 1,
    heightScale: 1,
    rotationDeg: 0,
    sinkDepthPx: 2,
    pressedOffsetPx: 5,
    socketWidthPercent: 5,
    socketHeightPercent: 2.5,
    profileIndex: 2,
    highlightOpacity: 0.75,
  }
  return { index, row, ...tuning }
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
