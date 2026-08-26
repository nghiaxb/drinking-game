import type { Card } from './types'
import { DECK_LABELS, DRINKING_CATEGORY_LABELS, TRUTH_DIFFICULTY_LABELS } from './config'

export type CardTone =
  | 'idle'
  | 'truth-light'
  | 'truth-medium'
  | 'truth-spicy'
  | 'dare'
  | 'drink'
  | 'choose'
  | 'everyone'
  | 'lucky'
  | 'skill'
  | 'rule'

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

/** One tone per card kind; drives both the face colours and the pip glyph. */
export function resolveCardTone(card: Card | null): CardTone {
  if (!card) {
    return 'idle'
  }

  if (card.deck === 'truth') {
    return `truth-${card.difficulty}`
  }

  return card.deck === 'dare' ? 'dare' : card.category
}

export function resolveCardToneClass(card: Card | null): string {
  return `cards-tone-${resolveCardTone(card)}`
}

const SPEECH_BUBBLE = 'M20.5 11.8a8.5 8.5 0 0 1-12.4 7.6L3.5 20.8l1.4-4.9A8.5 8.5 0 1 1 20.5 11.8Z'

/**
 * Stroke paths on a 24x24 grid, one per tone — a card face reads as a playing card because of its
 * pip, so the same glyph is reused as corner index and as the watermark behind the text.
 */
const CARD_PIP_PATHS: Record<CardTone, string> = {
  idle: SPEECH_BUBBLE,
  'truth-light': SPEECH_BUBBLE,
  'truth-medium': SPEECH_BUBBLE,
  'truth-spicy': SPEECH_BUBBLE,
  dare: 'M13.5 2.2 5 13.6h5.6L9.4 21.8 18 10.4h-5.6l1.1-8.2Z',
  drink: 'M6.6 4h10.8l-1 12.5a3 3 0 0 1-3 2.8h-2.8a3 3 0 0 1-3-2.8L6.6 4Zm.3 4.6h10.2',
  choose: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M5 21a7 7 0 0 1 14 0',
  everyone:
    'M9.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M19.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M2 20.5a5 5 0 0 1 10 0M12 20.5a5 5 0 0 1 10 0',
  lucky: 'M12 3.4l2.6 5.7 6.2.7-4.6 4.2 1.2 6.1L12 17l-5.4 3.1 1.2-6.1-4.6-4.2 6.2-.7L12 3.4Z',
  skill:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0',
  rule: 'M5.5 3.5h9l4 4v13h-13v-17ZM14.5 3.5v4h4M8.5 12.5h7M8.5 16.5h4.5',
}

export function resolveCardPipPath(card: Card | null): string {
  return CARD_PIP_PATHS[resolveCardTone(card)]
}
