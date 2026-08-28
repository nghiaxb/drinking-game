import { describe, expect, it } from 'vitest'
import { DICE_CHALLENGES, MISS_ACTIONS } from './challengeConfig'
import {
  JACKPOT_HEADLINE,
  MISS_HEADLINE,
  PAIR_HEADLINE,
  PAIR_REWARD_LABELS,
  TRIPLE_REWARD_LABELS,
  buildResultAnnouncement,
  findPairSymbol,
  isTriple,
  pickDiceChallenge,
  pickMissAction,
  pickReelSymbols,
  resolveOutcomeLabel,
  resolveReward,
} from './rewards'
import { DEFAULT_SYMBOL_WEIGHTS } from './probabilities'

describe('rewards', () => {
  it('maps all six triple combinations to expected labels', () => {
    expect(resolveReward(['beer', 'beer', 'beer'], 0).rewardLabel).toBe(TRIPLE_REWARD_LABELS.beer)
    expect(resolveReward(['skull', 'skull', 'skull'], 0).rewardLabel).toBe(
      TRIPLE_REWARD_LABELS.skull,
    )
    expect(resolveReward(['clover', 'clover', 'clover'], 0).rewardLabel).toBe(
      TRIPLE_REWARD_LABELS.clover,
    )
    expect(resolveReward(['crown', 'crown', 'crown'], 0).rewardLabel).toBe(
      TRIPLE_REWARD_LABELS.crown,
    )
    expect(resolveReward(['fire', 'fire', 'fire'], 0).rewardLabel).toBe(TRIPLE_REWARD_LABELS.fire)
    expect(resolveReward(['dice', 'dice', 'dice'], 0).rewardLabel).toBe(DICE_CHALLENGES[0])
  })

  it('marks triple rewards as jackpot', () => {
    const reward = resolveReward(['beer', 'beer', 'beer'], 0)
    expect(reward.isJackpot).toBe(true)
    expect(reward.outcome).toBe('jackpot')
  })

  it('gives a pair its own tier and a smaller version of the same reward', () => {
    for (const row of [
      ['beer', 'beer', 'skull'],
      ['skull', 'beer', 'beer'],
      ['beer', 'skull', 'beer'],
    ] as const) {
      const reward = resolveReward(row, 0)
      expect(reward.outcome, row.join()).toBe('pair')
      expect(reward.isJackpot).toBe(false)
      expect(reward.rewardLabel).toBe(PAIR_REWARD_LABELS.beer)
    }
  })

  it('names the duplicated symbol regardless of where it sits', () => {
    expect(findPairSymbol(['crown', 'crown', 'fire'])).toBe('crown')
    expect(findPairSymbol(['fire', 'crown', 'crown'])).toBe('crown')
    expect(findPairSymbol(['crown', 'fire', 'crown'])).toBe('crown')
    expect(findPairSymbol(['beer', 'skull', 'clover'])).toBeNull()
    expect(findPairSymbol(['beer', 'beer', 'beer'])).toBeNull()
  })

  it('hands three different symbols a light action instead of nothing', () => {
    const reward = resolveReward(['beer', 'skull', 'clover'], 0)
    expect(reward.outcome).toBe('miss')
    expect(reward.isJackpot).toBe(false)
    expect(MISS_ACTIONS).toContain(reward.rewardLabel)
  })

  it('labels each tier distinctly', () => {
    expect(resolveOutcomeLabel('jackpot', true)).toBe(JACKPOT_HEADLINE)
    expect(resolveOutcomeLabel('pair', false)).toBe(PAIR_HEADLINE)
    expect(resolveOutcomeLabel('miss', false)).toBe(MISS_HEADLINE)
  })

  it('builds an announcement without repeating the headline in the reward', () => {
    expect(buildResultAnnouncement('pair', false, 'Uống 25%', '🍺 🍺 💀')).toBe(
      `${PAIR_HEADLINE} — Uống 25% — 🍺 🍺 💀`,
    )
    expect(buildResultAnnouncement('miss', false, '', '')).toBe(MISS_HEADLINE)
    expect(buildResultAnnouncement('jackpot', true, 'Uống 100%')).toBe(
      `${JACKPOT_HEADLINE} — Uống 100%`,
    )
  })

  it('picks miss actions from the deck with RNG boundaries', () => {
    expect(pickMissAction(MISS_ACTIONS, 0)).toBe(MISS_ACTIONS[0])
    expect(pickMissAction(MISS_ACTIONS, 0.999999)).toBe(MISS_ACTIONS[MISS_ACTIONS.length - 1])
    expect(pickMissAction(MISS_ACTIONS, Number.NaN)).toBe(MISS_ACTIONS[0])
    expect(pickMissAction([], 0.5)).toBe(MISS_ACTIONS[0])
  })

  it('picks dice challenge from config with RNG boundaries', () => {
    expect(pickDiceChallenge(DICE_CHALLENGES, 0)).toBe(DICE_CHALLENGES[0])
    expect(pickDiceChallenge(DICE_CHALLENGES, 0.999999)).toBe(
      DICE_CHALLENGES[DICE_CHALLENGES.length - 1],
    )
    expect(pickDiceChallenge(DICE_CHALLENGES, Number.POSITIVE_INFINITY)).toBe(
      DICE_CHALLENGES[DICE_CHALLENGES.length - 1],
    )
    expect(pickDiceChallenge(DICE_CHALLENGES, Number.NaN)).toBe(DICE_CHALLENGES[0])
    expect(pickDiceChallenge([], 0.5)).toBe('Thử thách ngẫu nhiên')
  })

  it('never awards a jackpot for a symbol id with no reward mapping', () => {
    const unknownTriple = ['mystery', 'mystery', 'mystery'] as unknown as ['beer', 'beer', 'beer']
    const reward = resolveReward(unknownTriple, 0)
    expect(reward.isJackpot).toBe(false)
    expect(reward.outcome).toBe('miss')
    expect(MISS_ACTIONS).toContain(reward.rewardLabel)
  })

  it('stays inert for an invalid symbol length rather than handing out an action', () => {
    const reward = resolveReward(['beer', 'beer'], 0)
    expect(reward.outcome).toBe('miss')
    expect(reward.rewardLabel).toBe('')
  })

  it('detects triple rows', () => {
    expect(isTriple(['fire', 'fire', 'fire'])).toBe(true)
    expect(isTriple(['fire', 'fire', 'beer'])).toBe(false)
    expect(isTriple(['beer', 'beer'])).toBe(false)
  })

  it('picks three independent reel symbols via injected RNG', () => {
    const values = [0, 0.22, 0.9]
    const symbols = pickReelSymbols(() => values.shift() ?? 0, DEFAULT_SYMBOL_WEIGHTS)
    expect(symbols).toEqual(['beer', 'skull', 'dice'])
  })
})
