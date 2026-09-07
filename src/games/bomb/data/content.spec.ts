import { describe, expect, it } from 'vitest'
import { BOMB_CATEGORIES, BOMB_CATEGORY_LABELS } from '../config'
import type { BombCategory } from '../types'
import { BOMB_TOPICS } from './bombTopics'

describe('bomb topic content', () => {
  it('holds enough topics that a long session never feels repetitive', () => {
    expect(BOMB_TOPICS.length).toBeGreaterThanOrEqual(100)
  })

  it('keeps ids and text unique', () => {
    const ids = BOMB_TOPICS.map((entry) => entry.id)
    const texts = BOMB_TOPICS.map((entry) => entry.text.trim())

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(texts).size).toBe(texts.length)
    expect(ids.every((id) => id.trim().length > 0)).toBe(true)
    expect(texts.every((text) => text.length > 0)).toBe(true)
  })

  it('covers every category with several topics', () => {
    const counts = Object.fromEntries(BOMB_CATEGORIES.map((category) => [category, 0])) as Record<
      BombCategory,
      number
    >

    for (const entry of BOMB_TOPICS) {
      counts[entry.category] += 1
    }

    for (const category of BOMB_CATEGORIES) {
      expect(counts[category]).toBeGreaterThanOrEqual(5)
    }
  })

  it('labels every category for the UI badge', () => {
    for (const category of BOMB_CATEGORIES) {
      expect(BOMB_CATEGORY_LABELS[category].length).toBeGreaterThan(0)
    }
  })

  /*
   * A topic must have many valid answers: the round only works if the table can keep naming things
   * for half a minute. A yes/no or single-answer prompt would end the game on the first pass.
   */
  it('phrases every topic as an open "kể tên" prompt', () => {
    for (const entry of BOMB_TOPICS) {
      expect(entry.text.startsWith('Kể tên ')).toBe(true)
      expect(entry.text).not.toMatch(/\?$/)
    }
  })
})
