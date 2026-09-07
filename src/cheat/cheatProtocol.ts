import type { ArmedCheat, CheatMode, ForcedOutcome, PressGameId, WheelLabel } from './cheatTypes'

export type SocketRole = 'game' | 'admin'

/** One device cannot flood the room with a giant label list. */
export const MAX_WHEEL_LABELS = 64

export type CheatMessage =
  | ({ t: 'arm' } & ArmedCheat)
  | { t: 'disarm' }
  | { t: 'consumed' }
  | { t: 'wheel'; items: WheelLabel[] }
  | { t: 'state'; gameOnline: boolean; armed: ArmedCheat | null }

const PRESS_GAME_IDS: readonly string[] = ['crocodile', 'mine']
const OUTCOMES: readonly string[] = ['lose', 'win']
const MODES: readonly string[] = ['once', 'sticky']

export function parseSocketRole(raw: string | null): SocketRole | null {
  return raw === 'game' || raw === 'admin' ? raw : null
}

/*
 * Mode is tolerated as absent, not required: a worker deployed before modes existed relays an arm
 * without it. Defaulting to 'once' degrades the trick instead of dropping the frame.
 */
function parseMode(raw: unknown): CheatMode | null {
  if (raw === undefined) {
    return 'once'
  }
  return typeof raw === 'string' && MODES.includes(raw) ? (raw as CheatMode) : null
}

function parseArmed(raw: unknown): ArmedCheat | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const { game, outcome, itemId, mode } = raw as Record<string, unknown>
  const parsedMode = parseMode(mode)
  if (parsedMode === null || typeof game !== 'string') {
    return null
  }

  if (game === 'wheel') {
    // A wheel arm names a segment; an outcome here would mean the sender is confused.
    if (outcome !== undefined || typeof itemId !== 'string' || itemId.trim().length === 0) {
      return null
    }
    return { game: 'wheel', itemId: itemId.trim(), mode: parsedMode }
  }

  if (!PRESS_GAME_IDS.includes(game)) {
    return null
  }
  if (itemId !== undefined || typeof outcome !== 'string' || !OUTCOMES.includes(outcome)) {
    return null
  }
  return {
    game: game as PressGameId,
    outcome: outcome as ForcedOutcome,
    mode: parsedMode,
  }
}

function parseWheelLabels(raw: unknown): WheelLabel[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_WHEEL_LABELS) {
    return null
  }

  const items: WheelLabel[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      return null
    }
    const { id, label } = entry as Record<string, unknown>
    if (typeof id !== 'string' || typeof label !== 'string') {
      return null
    }
    const trimmedId = id.trim()
    const trimmedLabel = label.trim()
    if (trimmedId.length === 0 || trimmedLabel.length === 0) {
      return null
    }
    items.push({ id: trimmedId, label: trimmedLabel })
  }

  return items
}

/** Every socket frame is untrusted input; a bad frame is dropped, never thrown. */
export function parseCheatMessage(raw: unknown): CheatMessage | null {
  if (typeof raw !== 'string') {
    return null
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    return null
  }

  const payload = decoded as Record<string, unknown>

  if (payload.t === 'disarm' || payload.t === 'consumed') {
    return { t: payload.t }
  }

  if (payload.t === 'arm') {
    const armed = parseArmed(payload)
    return armed ? { t: 'arm', ...armed } : null
  }

  if (payload.t === 'wheel') {
    const items = parseWheelLabels(payload.items)
    return items ? { t: 'wheel', items } : null
  }

  if (payload.t === 'state') {
    if (typeof payload.gameOnline !== 'boolean' || !('armed' in payload)) {
      return null
    }
    if (payload.armed === null) {
      return { t: 'state', gameOnline: payload.gameOnline, armed: null }
    }
    const armed = parseArmed(payload.armed)
    return armed ? { t: 'state', gameOnline: payload.gameOnline, armed } : null
  }

  return null
}
