import type { CheatMessage, SocketRole } from './cheatProtocol'
import type { ArmedCheat, WheelLabel } from './cheatTypes'

export interface RoomState {
  armed: ArmedCheat | null
  gameSocketCount: number
  /* Published by the game device: the wheel is user-editable, so the admin cannot guess its rows. */
  wheelItems: WheelLabel[]
}

export type RoomEvent =
  | { type: 'connect'; role: SocketRole }
  | { type: 'disconnect'; role: SocketRole }
  | { type: 'message'; role: SocketRole; message: CheatMessage }

export interface RoomEffect {
  to: 'game' | 'admin' | 'sender'
  message: CheatMessage
}

export interface RoomTransition {
  state: RoomState
  effects: readonly RoomEffect[]
}

export const INITIAL_ROOM_STATE: RoomState = { armed: null, gameSocketCount: 0, wheelItems: [] }

function stateFrame(state: RoomState): CheatMessage {
  return { t: 'state', gameOnline: state.gameSocketCount > 0, armed: state.armed }
}

/*
 * The room, not the phone, owns `armed`. That is what lets the game device reload mid-party and
 * still receive the pending trap, and what keeps the admin screen showing the truth.
 */
export function reduceRoom(state: RoomState, event: RoomEvent): RoomTransition {
  if (event.type === 'connect') {
    if (event.role === 'admin') {
      const effects: RoomEffect[] = [{ to: 'sender', message: stateFrame(state) }]
      if (state.wheelItems.length > 0) {
        effects.push({ to: 'sender', message: { t: 'wheel', items: state.wheelItems } })
      }
      return { state, effects }
    }

    const next: RoomState = { ...state, gameSocketCount: state.gameSocketCount + 1 }
    const effects: RoomEffect[] = []
    if (next.armed) {
      effects.push({ to: 'sender', message: { t: 'arm', ...next.armed } })
    }
    effects.push({ to: 'admin', message: stateFrame(next) })
    return { state: next, effects }
  }

  if (event.type === 'disconnect') {
    if (event.role === 'admin') {
      return { state, effects: [] }
    }

    const next: RoomState = { ...state, gameSocketCount: Math.max(0, state.gameSocketCount - 1) }
    return { state: next, effects: [{ to: 'admin', message: stateFrame(next) }] }
  }

  const { message, role } = event

  if (message.t === 'arm' && role === 'admin') {
    const { t: _t, ...armed } = message
    const next: RoomState = { ...state, armed }
    return {
      state: next,
      effects: [
        { to: 'game', message: { t: 'arm', ...armed } },
        { to: 'admin', message: stateFrame(next) },
      ],
    }
  }

  if (message.t === 'wheel' && role === 'game') {
    const next: RoomState = { ...state, wheelItems: message.items }
    return {
      state: next,
      effects: [{ to: 'admin', message: { t: 'wheel', items: message.items } }],
    }
  }

  if (message.t === 'disarm' && role === 'admin') {
    const next: RoomState = { ...state, armed: null }
    return {
      state: next,
      effects: [
        { to: 'game', message: { t: 'disarm' } },
        { to: 'admin', message: stateFrame(next) },
      ],
    }
  }

  // A sticky arm outlives the press that used it; only a one-shot is spent.
  if (message.t === 'consumed' && role === 'game' && state.armed?.mode === 'once') {
    const next: RoomState = { ...state, armed: null }
    return { state: next, effects: [{ to: 'admin', message: stateFrame(next) }] }
  }

  return { state, effects: [] }
}
