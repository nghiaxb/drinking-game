import { describe, expect, it } from 'vitest'
import { DRINKING_CATEGORIES, DRINKING_CATEGORY_LABELS } from './config'
import { ALL_CARDS, DRINKING_CARDS } from './data'
import {
  buildCardFrontLabel,
  resolveCardPipPath,
  resolveCardTone,
  resolveCardToneClass,
} from './presentation'

describe('cards presentation labels', () => {
  it('maps drinking categories to Vietnamese labels', () => {
    for (const category of DRINKING_CATEGORIES) {
      expect(DRINKING_CATEGORY_LABELS[category]).toBeTruthy()
      expect(DRINKING_CATEGORY_LABELS[category]).not.toBe(category)
    }
  })

  it('never renders raw drinking category keys on card fronts', () => {
    for (const card of DRINKING_CARDS) {
      const label = buildCardFrontLabel(card)
      expect(label).toContain(DRINKING_CATEGORY_LABELS[card.category])
      expect(label).not.toContain(card.category)
    }
  })

  it('gives every card a real tone and pip glyph', () => {
    for (const card of ALL_CARDS) {
      const tone = resolveCardTone(card)

      expect(tone).not.toBe('idle')
      expect(resolveCardToneClass(card)).toBe(`cards-tone-${tone}`)
      expect(resolveCardPipPath(card).startsWith('M')).toBe(true)
    }
  })

  it('keeps a pip for the empty stack so the face never renders a blank path', () => {
    expect(resolveCardTone(null)).toBe('idle')
    expect(resolveCardPipPath(null).startsWith('M')).toBe(true)
  })
})
