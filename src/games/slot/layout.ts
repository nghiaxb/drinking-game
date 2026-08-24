import { SLOT_CONFIG } from './config'

export const SLOT_REELS_MAX_WIDTH_PX = 288
export const SLOT_REEL_GAP_PX = 8
export const SLOT_REEL_COUNT = 3
export const SLOT_VIEWPORT_CONTRACT_PX = 320
export const SLOT_INLINE_PADDING_PX = 8

export function computeReelsGridWidthPx(viewportInnerPx: number): number {
  return Math.min(SLOT_REELS_MAX_WIDTH_PX, viewportInnerPx)
}

export function computeReelCellWidthPx(
  gridWidthPx: number,
  gapPx: number = SLOT_REEL_GAP_PX,
  reelCount: number = SLOT_REEL_COUNT,
): number {
  if (reelCount <= 0) {
    return 0
  }
  return (gridWidthPx - gapPx * (reelCount - 1)) / reelCount
}

export function slotLayoutFitsViewport(
  viewportPx: number,
  inlinePaddingPx: number = SLOT_INLINE_PADDING_PX,
): boolean {
  const inner = viewportPx - inlinePaddingPx * 2
  const gridWidth = computeReelsGridWidthPx(inner)
  return gridWidth <= inner && gridWidth > 0
}

export function leverMeetsTouchTarget(
  minHeightPx: number = SLOT_CONFIG.controlMinSizePx,
): boolean {
  return minHeightPx >= SLOT_CONFIG.controlMinSizePx
}
