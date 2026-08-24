import { describe, expect, it } from 'vitest'
import { DRINKING_CATEGORIES, TRUTH_DIFFICULTIES } from '../config'
import { ALL_CARDS, DARE_CARDS, DRINKING_CARDS, TRUTH_CARDS } from '../data'
import type { DrinkingCategory, TruthDifficulty } from '../types'

describe('cards data content', () => {
  it('meets minimum deck sizes', () => {
    expect(TRUTH_CARDS.length).toBeGreaterThanOrEqual(40)
    expect(DARE_CARDS.length).toBeGreaterThanOrEqual(40)
    expect(DRINKING_CARDS.length).toBeGreaterThanOrEqual(60)
    expect(ALL_CARDS.length).toBeGreaterThanOrEqual(140)
  })

  it('keeps ids and text unique across the full library', () => {
    const ids = ALL_CARDS.map((card) => card.id)
    const texts = ALL_CARDS.map((card) => card.text.trim())

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(texts).size).toBe(texts.length)
    expect(ids.every((id) => id.trim().length > 0)).toBe(true)
    expect(texts.every((text) => text.length > 0)).toBe(true)
  })

  it('uses safe in-room dare copy for dare-12 and dare-16', () => {
    const dare12 = DARE_CARDS.find((card) => card.id === 'dare-12')
    const dare16 = DARE_CARDS.find((card) => card.id === 'dare-16')

    expect(dare12?.text).not.toMatch(/plank/i)
    expect(dare16?.text).not.toMatch(/ly trên đầu/i)
  })

  it('covers every truth difficulty with a reasonable spread', () => {
    const counts: Record<TruthDifficulty, number> = {
      light: 0,
      medium: 0,
      spicy: 0,
    }

    for (const card of TRUTH_CARDS) {
      counts[card.difficulty] += 1
    }

    for (const difficulty of TRUTH_DIFFICULTIES) {
      expect(counts[difficulty]).toBeGreaterThanOrEqual(10)
    }
  })

  it('covers every drinking category with multiple cards', () => {
    const counts: Record<DrinkingCategory, number> = {
      drink: 0,
      choose: 0,
      everyone: 0,
      lucky: 0,
      skill: 0,
      rule: 0,
    }

    for (const card of DRINKING_CARDS) {
      counts[card.category] += 1
    }

    for (const category of DRINKING_CATEGORIES) {
      expect(counts[category]).toBeGreaterThanOrEqual(8)
    }
  })
})
