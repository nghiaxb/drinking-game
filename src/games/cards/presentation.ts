import type { Card, DrinkingCategory } from './types'
import { DECK_LABELS, DRINKING_CATEGORY_LABELS, TRUTH_DIFFICULTY_LABELS } from './config'

export function buildCardFrontLabel(card: Card | null): string {
  if (!card) {
    return 'Chưa bốc lá'
  }

  if (card.deck === 'truth') {
    return `${DECK_LABELS.truth} · ${TRUTH_DIFFICULTY_LABELS[card.difficulty]}`
  }

  if (card.deck === 'dare') {
    return DECK_LABELS.dare
  }

  return `${DECK_LABELS.drinking} · ${DRINKING_CATEGORY_LABELS[card.category]}`
}

export function buildStatusAnnouncement(
  card: Card | null,
  remaining: number,
  cycleNumber: number,
  revealed: boolean,
): string {
  if (!revealed || !card) {
    return `Còn ${remaining} lá trong chu kỳ ${cycleNumber}. Chạm hoặc vuốt để bốc lá.`
  }

  return `${buildCardFrontLabel(card)}: ${card.text} Còn ${remaining} lá, chu kỳ ${cycleNumber}.`
}

export const DRINKING_CATEGORY_CLASS: Record<DrinkingCategory, string> = {
  drink: 'cards-tone-drink',
  choose: 'cards-tone-choose',
  everyone: 'cards-tone-everyone',
  lucky: 'cards-tone-lucky',
  skill: 'cards-tone-skill',
  rule: 'cards-tone-rule',
}

export function resolveCardToneClass(card: Card | null): string {
  if (!card) {
    return 'cards-tone-idle'
  }

  if (card.deck === 'truth') {
    if (card.difficulty === 'light') {
      return 'cards-tone-truth-light'
    }
    if (card.difficulty === 'medium') {
      return 'cards-tone-truth-medium'
    }
    return 'cards-tone-truth-spicy'
  }

  if (card.deck === 'dare') {
    return 'cards-tone-dare'
  }

  return DRINKING_CATEGORY_CLASS[card.category]
}
