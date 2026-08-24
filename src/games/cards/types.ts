export type DeckType = 'truth' | 'dare' | 'drinking'

export type TruthDifficulty = 'light' | 'medium' | 'spicy'

export type DrinkingCategory = 'drink' | 'choose' | 'everyone' | 'lucky' | 'skill' | 'rule'

export interface TruthCard {
  id: string
  deck: 'truth'
  difficulty: TruthDifficulty
  text: string
}

export interface DareCard {
  id: string
  deck: 'dare'
  text: string
}

export interface DrinkingCard {
  id: string
  deck: 'drinking'
  category: DrinkingCategory
  text: string
}

export type Card = TruthCard | DareCard | DrinkingCard

export type CardsPhase = 'idle' | 'flipping' | 'revealed'

export interface CardsEngineState {
  deckType: DeckType
  truthDifficulties: TruthDifficulty[]
  pool: Card[]
  bag: Card[]
  currentCard: Card | null
  drawnThisCycle: number
  cycleNumber: number
  recentIds: string[]
}
