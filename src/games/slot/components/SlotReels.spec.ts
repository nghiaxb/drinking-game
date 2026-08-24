import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SLOT_CONFIG } from '../config'
import {
  SLOT_INLINE_PADDING_PX,
  SLOT_REEL_COUNT,
  SLOT_REEL_GAP_PX,
  SLOT_REELS_MAX_WIDTH_PX,
  SLOT_VIEWPORT_CONTRACT_PX,
  computeReelCellWidthPx,
  computeReelsGridWidthPx,
  leverMeetsTouchTarget,
  slotLayoutFitsViewport,
} from '../layout'
import SlotReels from './SlotReels.vue'

describe('SlotReels', () => {
  it('renders three large reels with emoji symbols and idle a11y labels', () => {
    const wrapper = mount(SlotReels, {
      props: {
        displaySymbols: ['beer', 'skull', 'dice'],
        stoppedReels: [true, true, true],
        spinning: false,
        gamePhase: 'idle',
      },
    })

    expect(wrapper.get('[data-testid="slot-reels"]').attributes('role')).toBe('group')
    expect(wrapper.findAll('[data-testid^="slot-reel-"]')).toHaveLength(3)
    expect(wrapper.get('[data-testid="slot-reel-0"]').attributes('aria-label')).toContain('sẵn sàng')
    expect(wrapper.get('[data-testid="slot-reel-0"]').attributes('aria-label')).not.toContain('đang quay')
    expect(wrapper.get('[data-testid="slot-reel-0"]').attributes('data-reel-status')).toBe('idle')
  })

  it('applies continuous spin motion class while spinning and not stopped', () => {
    const wrapper = mount(SlotReels, {
      props: {
        displaySymbols: ['beer', 'skull', 'dice'],
        stoppedReels: [false, true, false],
        spinning: true,
        gamePhase: 'spinning',
        reducedMotion: false,
      },
    })

    const activeSymbol = wrapper.get('[data-testid="slot-reel-0"] .slot-reel-symbol')
    const stoppedSymbol = wrapper.get('[data-testid="slot-reel-1"] .slot-reel-symbol')

    expect(activeSymbol.classes()).toContain('slot-reel-symbol--cycle')
    expect(stoppedSymbol.classes()).toContain('slot-reel-symbol--shake')
    expect(wrapper.get('[data-testid="slot-reel-0"]').attributes('data-reel-status')).toBe('spinning')
    expect(wrapper.get('[data-testid="slot-reel-1"]').attributes('data-reel-status')).toBe('stopped')
  })

  it('skips spin motion classes when reduced motion is enabled', () => {
    const wrapper = mount(SlotReels, {
      props: {
        displaySymbols: ['beer', 'skull', 'dice'],
        stoppedReels: [false, false, false],
        spinning: true,
        gamePhase: 'spinning',
        reducedMotion: true,
      },
    })

    expect(wrapper.get('[data-testid="slot-reel-0"] .slot-reel-symbol').classes()).not.toContain(
      'slot-reel-symbol--cycle',
    )
  })

  it('applies jackpot styling when active on stopped reels', () => {
    const wrapper = mount(SlotReels, {
      props: {
        displaySymbols: ['fire', 'fire', 'fire'],
        stoppedReels: [true, true, true],
        spinning: false,
        gamePhase: 'result',
        jackpotActive: true,
      },
    })

    expect(wrapper.get('[data-testid="slot-reel-2"]').classes()).toContain('slot-reel--jackpot')
    expect(wrapper.get('[data-testid="slot-reel-2"]').attributes('data-reel-status')).toBe('stopped')
  })
})

describe('slot layout contract', () => {
  it('fits three reels and two gaps within a 320px viewport', () => {
    const inner = SLOT_VIEWPORT_CONTRACT_PX - SLOT_INLINE_PADDING_PX * 2
    const gridWidth = computeReelsGridWidthPx(inner)
    const cellWidth = computeReelCellWidthPx(gridWidth, SLOT_REEL_GAP_PX, SLOT_REEL_COUNT)

    expect(slotLayoutFitsViewport(SLOT_VIEWPORT_CONTRACT_PX)).toBe(true)
    expect(gridWidth).toBeLessThanOrEqual(SLOT_REELS_MAX_WIDTH_PX)
    expect(gridWidth + SLOT_REEL_GAP_PX * (SLOT_REEL_COUNT - 1)).toBeLessThanOrEqual(inner)
    expect(cellWidth).toBeGreaterThan(0)
  })

  it('requires lever touch target at least 44px', () => {
    expect(leverMeetsTouchTarget()).toBe(true)
    expect(SLOT_CONFIG.controlMinSizePx).toBeGreaterThanOrEqual(44)
  })
})
