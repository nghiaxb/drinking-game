export type BombCategory =
  | 'geo'
  | 'food'
  | 'entertainment'
  | 'tech'
  | 'vehicle'
  | 'nature'
  | 'objects'
  | 'people'
  | 'love'
  | 'party'
  | 'fun'
  | 'letter'

export interface BombTopic {
  id: string
  category: BombCategory
  text: string
}

/** The window the secret fuse is drawn from. The table sets it; the draw inside it stays hidden. */
export interface BombFuseRange {
  minMs: number
  maxMs: number
}

export type BombPhase = 'idle' | 'running' | 'exploded'

export interface BombGameState {
  phase: BombPhase
  pool: BombTopic[]
  fuseRange: BombFuseRange
  currentTopic: BombTopic | null
  recentIds: string[]
}
