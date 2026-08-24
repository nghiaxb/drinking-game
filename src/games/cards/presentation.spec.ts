import { describe, expect, it } from 'vitest'
import { DRINKING_CATEGORIES, DRINKING_CATEGORY_LABELS } from './config'
import { DRINKING_CARDS } from './data'
import { buildCardFrontLabel } from './presentation'

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
})
