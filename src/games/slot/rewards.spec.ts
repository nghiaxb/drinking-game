import { describe, expect, it } from 'vitest'
import { DICE_CHALLENGES } from './challengeConfig'
import {
  NON_TRIPLE_HEADLINE,
  TRIPLE_REWARD_LABELS,
  buildNonTripleAnnouncement,
  buildNonTripleLabel,
  isTriple,
  pickDiceChallenge,
  pickReelSymbols,
  resolveReward,
} from './rewards'
import { DEFAULT_SYMBOL_WEIGHTS } from './probabilities'

describe('rewards', () => {
  it('maps all six triple combinations to expected labels', () => {
    expect(resolveReward(['beer', 'beer', 'beer'], 0).rewardLabel).toBe(TRIPLE_REWARD_LABELS.beer)
    expect(resolveReward(['skull', 'skull', 'skull'], 0).rewardLabel).toBe(TRIPLE_REWARD_LABELS.skull)
    expect(resolveReward(['clover', 'clover', 'clover'], 0).rewardLabel).toBe(TRIPLE_REWARD_LABELS.clover)
    expect(resolveReward(['crown', 'crown', 'crown'], 0).rewardLabel).toBe(TRIPLE_REWARD_LABELS.crown)
    expect(resolveReward(['fire', 'fire', 'fire'], 0).rewardLabel).toBe(TRIPLE_REWARD_LABELS.fire)
    expect(resolveReward(['dice', 'dice', 'dice'], 0).rewardLabel).toBe(DICE_CHALLENGES[0])
  })

  it('marks triple rewards as jackpot', () => {
    const reward = resolveReward(['beer', 'beer', 'beer'], 0)
    expect(reward.isJackpot).toBe(true)
    expect(reward.outcome).toBe('jackpot')
  })

  it('returns symbol row only for non-triple rewards', () => {
    const reward = resolveReward(['beer', 'skull', 'clover'], 0)
    expect(reward.isJackpot).toBe(false)
    expect(reward.outcome).toBe('non-triple')
    expect(reward.rewardLabel).toBe('🍺 💀 🍀')
    expect(reward.rewardLabel).not.toContain(NON_TRIPLE_HEADLINE)
  })

  it('builds full non-triple announcement for aria without duplicating in reward label', () => {
    expect(buildNonTripleAnnouncement('🍺 💀 🍀')).toBe(`${NON_TRIPLE_HEADLINE} — 🍺 💀 🍀`)
    expect(buildNonTripleAnnouncement('')).toBe(NON_TRIPLE_HEADLINE)
  })

  it('picks dice challenge from config with RNG boundaries', () => {
    expect(pickDiceChallenge(DICE_CHALLENGES, 0)).toBe(DICE_CHALLENGES[0])
    expect(pickDiceChallenge(DICE_CHALLENGES, 0.999999)).toBe(DICE_CHALLENGES[DICE_CHALLENGES.length - 1])
    expect(pickDiceChallenge(DICE_CHALLENGES, Number.POSITIVE_INFINITY)).toBe(
      DICE_CHALLENGES[DICE_CHALLENGES.length - 1],
    )
    expect(pickDiceChallenge(DICE_CHALLENGES, Number.NaN)).toBe(DICE_CHALLENGES[0])
    expect(pickDiceChallenge([], 0.5)).toBe('Thử thách ngẫu nhiên')
  })

  it('handles unknown triple symbol safely without headline duplication', () => {
    const unknownTriple = ['mystery', 'mystery', 'mystery'] as unknown as ['beer', 'beer', 'beer']
    const reward = resolveReward(unknownTriple, 0)
    expect(reward.isJackpot).toBe(false)
    expect(reward.outcome).toBe('non-triple')
    expect(reward.rewardLabel).toBe('❓ ❓ ❓')
    expect(reward.rewardLabel).not.toContain(NON_TRIPLE_HEADLINE)
  })

  it('uses headline-only reward label for invalid symbol length', () => {
    const reward = resolveReward(['beer', 'beer'], 0)
    expect(reward.outcome).toBe('non-triple')
    expect(reward.rewardLabel).toBe('')
  })

  it('detects triple and non-triple rows', () => {
    expect(isTriple(['fire', 'fire', 'fire'])).toBe(true)
    expect(isTriple(['fire', 'fire', 'beer'])).toBe(false)
    expect(isTriple(['beer', 'beer'])).toBe(false)
  })

  it('builds symbol row without headline prefix', () => {
    expect(buildNonTripleLabel(['dice', 'beer', 'fire'])).toBe('🎲 🍺 🔥')
    expect(buildNonTripleLabel(['dice', 'beer', 'fire'])).not.toContain(NON_TRIPLE_HEADLINE)
  })

  it('picks three independent reel symbols via injected RNG', () => {
    const values = [0, 0.22, 0.9]
    const symbols = pickReelSymbols(() => values.shift() ?? 0, DEFAULT_SYMBOL_WEIGHTS)
    expect(symbols).toEqual(['beer', 'skull', 'dice'])
  })
})
