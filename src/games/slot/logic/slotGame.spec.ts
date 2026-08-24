import { describe, expect, it } from 'vitest'
import { DICE_CHALLENGES } from '../challengeConfig'
import { DEFAULT_SYMBOL_WEIGHTS } from '../probabilities'
import {
  buildReelAriaLabel,
  buildStatusAriaLabel,
  computeSpinPlan,
  createInitialState,
  resolveReelVisualStatus,
} from './slotGame'
import { NON_TRIPLE_HEADLINE } from '../rewards'

describe('slotGame', () => {
  it('creates idle initial state', () => {
    expect(createInitialState()).toEqual({
      phase: 'idle',
      symbols: null,
      outcome: null,
      rewardLabel: null,
      isJackpot: false,
    })
  })

  it('computes spin plan with three symbols before animation concerns', () => {
    const plan = computeSpinPlan(() => 0, DEFAULT_SYMBOL_WEIGHTS, DICE_CHALLENGES)
    expect(plan.symbols).toEqual(['beer', 'beer', 'beer'])
    expect(plan.isJackpot).toBe(true)
    expect(plan.rewardLabel).toBe('Uống 3 ngụm')
  })

  it('resolves dice triple with challenge RNG', () => {
    const plan = computeSpinPlan(
      () => 0.95,
      {
        beer: 0,
        skull: 0,
        clover: 0,
        crown: 0,
        fire: 0,
        dice: 100,
      },
      DICE_CHALLENGES,
    )
    expect(plan.symbols).toEqual(['dice', 'dice', 'dice'])
    expect(plan.isJackpot).toBe(true)
    expect(DICE_CHALLENGES).toContain(plan.rewardLabel)
  })

  it('resolves reel visual status for idle, spinning, and stopped', () => {
    expect(resolveReelVisualStatus('idle', false, true)).toBe('idle')
    expect(resolveReelVisualStatus('spinning', true, false)).toBe('spinning')
    expect(resolveReelVisualStatus('result', false, true)).toBe('stopped')
  })

  it('builds reel labels and full non-triple status announcements', () => {
    expect(buildReelAriaLabel(0, '🍺', 'idle')).toContain('sẵn sàng')
    expect(buildReelAriaLabel(0, '🍺', 'idle')).not.toContain('đang quay')
    expect(buildReelAriaLabel(1, '💀', 'spinning')).toContain('đang quay')
    expect(buildReelAriaLabel(2, '🎲', 'stopped')).toContain('đã dừng')
    expect(buildStatusAriaLabel('spinning', null, false)).toContain('Đang quay')
    expect(buildStatusAriaLabel('result', 'Uống 3 ngụm', true)).toContain('Jackpot')
    expect(buildStatusAriaLabel('result', '🍺 💀 🍀', false)).toBe(
      `${NON_TRIPLE_HEADLINE} — 🍺 💀 🍀`,
    )
    expect(buildStatusAriaLabel('result', '', false)).toBe(NON_TRIPLE_HEADLINE)
    expect(buildStatusAriaLabel('result', null, false)).toBe(NON_TRIPLE_HEADLINE)
  })
})
