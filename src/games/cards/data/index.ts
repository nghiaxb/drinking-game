import type { Card } from '../types'
import { DARE_CARDS } from './dareCards'
import { DRINKING_CARDS } from './drinkingCards'
import { TRUTH_CARDS } from './truthCards'

export { TRUTH_CARDS, DARE_CARDS, DRINKING_CARDS }

export const ALL_CARDS: Card[] = [...TRUTH_CARDS, ...DARE_CARDS, ...DRINKING_CARDS]
