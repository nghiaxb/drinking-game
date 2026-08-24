import { describe, expect, it } from 'vitest'
import { ALL_CARDS } from '../data'
import type { Card, TruthDifficulty } from '../types'
import {
  appendRecentId,
  buildShuffledBag,
  cloneEngineState,
  createEngineState,
  drawCard,
  filterCards,
  manualReshuffle,
  normalizeRngValue,
  setDeckType,
  setTruthDifficulties,
  shuffleInPlace,
  toggleTruthDifficulty,
} from './cardsEngine'

function seqRng(values: number[]): () => number {
  let index = 0
  return () => values[index++] ?? 0
}

describe('normalizeRngValue', () => {
  it('clamps invalid and boundary RNG values', () => {
    expect(normalizeRngValue(Number.NaN)).toBe(0)
    expect(normalizeRngValue(Number.POSITIVE_INFINITY)).toBe(0)
    expect(normalizeRngValue(Number.NEGATIVE_INFINITY)).toBe(0)
    expect(normalizeRngValue(0)).toBe(0)
    expect(normalizeRngValue(-1)).toBe(0)
    expect(normalizeRngValue(1)).toBe(0.9999999999999999)
    expect(normalizeRngValue(2)).toBe(0.9999999999999999)
    expect(normalizeRngValue(0.5)).toBe(0.5)
  })
})

describe('shuffleInPlace', () => {
  it('is deterministic for a fixed RNG sequence', () => {
    const first = ['a', 'b', 'c', 'd']
    const second = ['a', 'b', 'c', 'd']
    const rng = seqRng([0.1, 0.2, 0.3])

    shuffleInPlace(first, rng)
    shuffleInPlace(second, rng)

    expect(first).toEqual(second)
    expect(first).not.toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('buildShuffledBag recent avoidance', () => {
  const cards: Card[] = [
    { id: 'a', deck: 'dare', text: 'A' },
    { id: 'b', deck: 'dare', text: 'B' },
    { id: 'c', deck: 'dare', text: 'C' },
    { id: 'd', deck: 'dare', text: 'D' },
    { id: 'e', deck: 'dare', text: 'E' },
  ]

  it('places non-recent cards before recent when deck is large enough', () => {
    const bag = buildShuffledBag(cards, ['c', 'd', 'e'], () => 0.99)
    const recentIndex = Math.max(
      bag.findIndex((card) => card.id === 'c'),
      bag.findIndex((card) => card.id === 'd'),
      bag.findIndex((card) => card.id === 'e'),
    )
    const nonRecentIndex = Math.min(
      bag.findIndex((card) => card.id === 'a'),
      bag.findIndex((card) => card.id === 'b'),
    )
    expect(nonRecentIndex).toBeLessThan(recentIndex)
  })

  it('first card after reshuffle is never a recent id when pool is large enough', () => {
    const bag = buildShuffledBag(cards, ['c', 'd', 'e'], () => 0.5)
    const recentSet = new Set(['c', 'd', 'e'])
    expect(recentSet.has(bag[0]?.id ?? '')).toBe(false)
  })

  it('falls back to plain shuffle for tiny decks', () => {
    const tiny: Card[] = [
      { id: 'a', deck: 'dare', text: 'A' },
      { id: 'b', deck: 'dare', text: 'B' },
    ]
    const bag = buildShuffledBag(tiny, ['a', 'b'], () => 0)
    expect(bag.map((card) => card.id).sort()).toEqual(['a', 'b'])
  })

  it('terminates without infinite loop when recent covers entire deck', () => {
    const bag = buildShuffledBag(cards, ['a', 'b', 'c', 'd', 'e'], () => 0.42)
    expect(bag).toHaveLength(5)
  })
})

describe('appendRecentId', () => {
  it('keeps only the last three ids rolling', () => {
    expect(appendRecentId([], 'a')).toEqual(['a'])
    expect(appendRecentId(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(appendRecentId(['a', 'b', 'c'], 'd')).toEqual(['b', 'c', 'd'])
  })
})

describe('filterCards', () => {
  it('filters truth cards by selected difficulties', () => {
    const truth = filterCards(ALL_CARDS, 'truth', ['light', 'spicy'])
    expect(truth.every((card) => card.deck === 'truth')).toBe(true)
    expect(
      truth.every(
        (card) => card.deck !== 'truth' || card.difficulty === 'light' || card.difficulty === 'spicy',
      ),
    ).toBe(true)
  })

  it('returns dare and drinking pools without difficulty filter', () => {
    expect(filterCards(ALL_CARDS, 'dare', ['light']).every((card) => card.deck === 'dare')).toBe(
      true,
    )
    expect(
      filterCards(ALL_CARDS, 'drinking', ['light']).every((card) => card.deck === 'drinking'),
    ).toBe(true)
  })
})

describe('toggleTruthDifficulty', () => {
  it('keeps at least one difficulty selected', () => {
    expect(toggleTruthDifficulty(['light'], 'light')).toEqual(['light'])
    expect(toggleTruthDifficulty(['light', 'medium'], 'light')).toEqual(['medium'])
    expect(toggleTruthDifficulty(['medium'], 'spicy')).toEqual(['medium', 'spicy'])
  })
})

describe('drawCard', () => {
  it('draws from the front of the shuffled bag without replacement', () => {
    const pool = filterCards(ALL_CARDS, 'dare', ['light', 'medium', 'spicy']).slice(0, 3)
    const state = createEngineState({
      deckType: 'dare',
      truthDifficulties: ['light', 'medium', 'spicy'],
      pool,
      rng: () => 0,
    })

    const expectedOrder = [...state.bag]
    const drawnIds: string[] = []

    let current = state
    for (let index = 0; index < 3; index += 1) {
      const result = drawCard(current, () => 0)
      drawnIds.push(result.card?.id ?? '')
      current = result.state
    }

    expect(drawnIds).toEqual(expectedOrder.map((card) => card.id))
    expect(current.bag).toHaveLength(0)
  })

  it('auto reshuffles using rolling recent ids and avoids recent at bag head', () => {
    const pool: Card[] = [
      { id: 'a', deck: 'dare', text: 'A' },
      { id: 'b', deck: 'dare', text: 'B' },
      { id: 'c', deck: 'dare', text: 'C' },
      { id: 'd', deck: 'dare', text: 'D' },
      { id: 'e', deck: 'dare', text: 'E' },
    ]

    let state = createEngineState({
      deckType: 'dare',
      truthDifficulties: ['light', 'medium', 'spicy'],
      pool,
      rng: () => 0,
    })

    for (let index = 0; index < 6; index += 1) {
      const result = drawCard(state, () => 0.25)
      state = result.state
    }

    expect(state.cycleNumber).toBe(2)
    expect(state.recentIds).toHaveLength(3)
    const recentSet = new Set(state.recentIds)
    expect(recentSet.has(state.bag[0]?.id ?? '')).toBe(false)
  })

  it('invokes shuffle rng only when bag reshuffles', () => {
    const pool: Card[] = [
      { id: 'a', deck: 'dare', text: 'A' },
      { id: 'b', deck: 'dare', text: 'B' },
      { id: 'c', deck: 'dare', text: 'C' },
      { id: 'd', deck: 'dare', text: 'D' },
    ]
    const callOrder: string[] = []
    const rng = () => {
      callOrder.push('rng')
      return 0
    }

    let state = createEngineState({
      deckType: 'dare',
      truthDifficulties: ['light'],
      pool,
      rng,
    })
    callOrder.length = 0

    for (let index = 0; index < 4; index += 1) {
      state = drawCard(state, rng).state
    }
    expect(callOrder).toHaveLength(0)

    state = drawCard(state, rng).state
    expect(callOrder.includes('rng')).toBe(true)
  })

  it('updates rolling recent ids after every draw', () => {
    const pool = filterCards(ALL_CARDS, 'dare', ['light', 'medium', 'spicy']).slice(0, 4)
    const state = createEngineState({
      deckType: 'dare',
      truthDifficulties: ['light', 'medium', 'spicy'],
      pool,
      rng: () => 0,
    })

    const first = drawCard(state, () => 0)
    expect(first.state.recentIds).toEqual([first.card?.id])

    const second = drawCard(first.state, () => 0)
    expect(second.state.recentIds).toEqual([first.card?.id, second.card?.id])

    const third = drawCard(second.state, () => 0)
    expect(third.state.recentIds).toHaveLength(3)
  })
})

describe('manualReshuffle and deck/filter changes', () => {
  it('manual reshuffle rebuilds bag, uses rolling recent, and bumps cycle', () => {
    let state = createEngineState({
      deckType: 'dare',
      truthDifficulties: ['light', 'medium', 'spicy'],
      pool: filterCards(ALL_CARDS, 'dare', ['light', 'medium', 'spicy']).slice(0, 5),
      rng: () => 0,
    })
    const draw = drawCard(state, () => 0)
    const cycleBefore = draw.state.cycleNumber
    state = manualReshuffle(draw.state, () => 0.5)

    expect(state.bag).toHaveLength(state.pool.length)
    expect(state.drawnThisCycle).toBe(0)
    expect(state.cycleNumber).toBe(cycleBefore + 1)
    expect(new Set(state.recentIds).has(state.bag[0]?.id ?? '')).toBe(false)
  })

  it('deck change creates a fresh bag', () => {
    const state = createEngineState({
      deckType: 'dare',
      truthDifficulties: ['light', 'medium', 'spicy'],
      pool: filterCards(ALL_CARDS, 'dare', ['light', 'medium', 'spicy']),
      rng: () => 0,
    })
    const next = setDeckType(state, 'drinking', () => 0.2, ALL_CARDS)
    expect(next.deckType).toBe('drinking')
    expect(next.bag).toHaveLength(next.pool.length)
    expect(next.currentCard).toBeNull()
    expect(next.drawnThisCycle).toBe(0)
  })

  it('truth filter change creates a fresh bag', () => {
    const state = createEngineState({
      deckType: 'truth',
      truthDifficulties: ['light', 'medium', 'spicy'],
      pool: filterCards(ALL_CARDS, 'truth', ['light', 'medium', 'spicy']),
      rng: () => 0,
    })
    const next = setTruthDifficulties(state, ['light'], () => 0.2, ALL_CARDS)
    expect(next.truthDifficulties).toEqual(['light'])
    expect(next.pool.every((card) => card.deck !== 'truth' || card.difficulty === 'light')).toBe(
      true,
    )
    expect(next.bag).toHaveLength(next.pool.length)
  })
})

describe('cloneEngineState', () => {
  it('deep-clones mutable engine fields for rollback', () => {
    const state = createEngineState({
      deckType: 'dare',
      truthDifficulties: ['light'],
      pool: filterCards(ALL_CARDS, 'dare', ['light']).slice(0, 3),
      rng: () => 0,
    })
    const clone = cloneEngineState(state)
    clone.bag.pop()
    expect(state.bag).not.toEqual(clone.bag)
  })
})

describe('createEngineState', () => {
  it('initializes with shuffled full bag', () => {
    const pool = filterCards(ALL_CARDS, 'truth', ['light'] as TruthDifficulty[])
    const state = createEngineState({
      deckType: 'truth',
      truthDifficulties: ['light'],
      pool,
      rng: () => 0.77,
    })
    expect(state.bag).toHaveLength(pool.length)
    expect(state.cycleNumber).toBe(1)
    expect(state.drawnThisCycle).toBe(0)
  })
})
