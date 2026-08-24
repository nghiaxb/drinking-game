export interface WheelItem {
  id: string
  label: string
  enabled: boolean
}

export type WheelPhase = 'idle' | 'spinning' | 'result'

export interface WheelGameState {
  phase: WheelPhase
  items: WheelItem[]
  currentRotation: number
  winnerId: string | null
  winnerLabel: string | null
}

export type SpinBlockReason =
  | 'too-few-enabled'
  | 'spinning'
  | 'editor-open'
  | 'editor-invalid'

export interface SpinPlan {
  winnerId: string
  winnerLabel: string
  targetRotation: number
}

export interface ItemValidationError {
  field: 'label'
  message: string
}

export interface EditorDraft {
  label: string
  enabled: boolean
}

export interface EditorValidationResult {
  valid: boolean
  errors: ItemValidationError[]
}
