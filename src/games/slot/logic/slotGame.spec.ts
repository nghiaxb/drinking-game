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
import { JACKPOT_HEADLINE, MISS_HEADLINE, PAIR_HEADLINE, TRIPLE_REWARD_LABELS } from '../rewards'

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
    expect(plan.rewardLabel).toBe(TRIPLE_REWARD_LABELS.beer)
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

  it('builds reel labels', () => {
    expect(buildReelAriaLabel(0, '🍺', 'idle')).toContain('sẵn sàng')
    expect(buildReelAriaLabel(0, '🍺', 'idle')).not.toContain('đang quay')
    expect(buildReelAriaLabel(1, '💀', 'spinning')).toContain('đang quay')
    expect(buildReelAriaLabel(2, '🎲', 'stopped')).toContain('đã dừng')
  })

  it('announces every tier with its reward and the row that produced it', () => {
    const empty = { outcome: null, rewardLabel: null, isJackpot: false, symbols: null }

    expect(buildStatusAriaLabel('spinning', empty)).toContain('Đang quay')
    expect(buildStatusAriaLabel('idle', empty)).toContain('Sẵn sàng')

    expect(
      buildStatusAriaLabel('result', {
        outcome: 'jackpot',
        rewardLabel: 'Uống 100%',
        isJackpot: true,
        symbols: ['beer', 'beer', 'beer'],
      }),
    ).toBe(`${JACKPOT_HEADLINE} — Uống 100% — 🍺 🍺 🍺`)

    expect(
      buildStatusAriaLabel('result', {
        outcome: 'pair',
        rewardLabel: 'Uống 25%',
        isJackpot: false,
        symbols: ['beer', 'beer', 'skull'],
      }),
    ).toBe(`${PAIR_HEADLINE} — Uống 25% — 🍺 🍺 💀`)

    expect(
      buildStatusAriaLabel('result', {
        outcome: 'miss',
        rewardLabel: 'Chuyền cần cho người bên phải',
        isJackpot: false,
        symbols: ['beer', 'skull', 'clover'],
      }),
    ).toBe(`${MISS_HEADLINE} — Chuyền cần cho người bên phải — 🍺 💀 🍀`)

    // Nothing resolved yet must not invent a reward or a row.
    expect(buildStatusAriaLabel('result', empty)).toBe(MISS_HEADLINE)
  })
})
