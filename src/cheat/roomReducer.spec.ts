import { describe, it, expect } from 'vitest'
import { INITIAL_ROOM_STATE, reduceRoom } from './roomReducer'
import type { RoomState } from './roomReducer'

const ARMED = { game: 'crocodile', outcome: 'lose' } as const

describe('reduceRoom', () => {
  it('starts with nothing armed and no game device', () => {
    expect(INITIAL_ROOM_STATE).toEqual({ armed: null, gameSocketCount: 0 })
  })

  it('stores an arm from admin and pushes it to the game device', () => {
    const result = reduceRoom(
      { armed: null, gameSocketCount: 1 },
      { type: 'message', role: 'admin', message: { t: 'arm', ...ARMED } },
    )

    expect(result.state.armed).toEqual(ARMED)
    expect(result.effects).toEqual([
      { to: 'game', message: { t: 'arm', ...ARMED } },
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: ARMED } },
    ])
  })

  it('replays a pending arm to a game device that connects later', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 0 },
      { type: 'connect', role: 'game' },
    )

    expect(result.state.gameSocketCount).toBe(1)
    expect(result.effects).toEqual([
      { to: 'sender', message: { t: 'arm', ...ARMED } },
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: ARMED } },
    ])
  })

  it('sends only presence to a game device when nothing is armed', () => {
    const result = reduceRoom(INITIAL_ROOM_STATE, { type: 'connect', role: 'game' })

    expect(result.effects).toEqual([
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: null } },
    ])
  })

  it('greets a connecting admin with current state', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      { type: 'connect', role: 'admin' },
    )

    expect(result.state).toEqual({ armed: ARMED, gameSocketCount: 1 })
    expect(result.effects).toEqual([
      { to: 'sender', message: { t: 'state', gameOnline: true, armed: ARMED } },
    ])
  })

  it('clears the arm on disarm and tells both sides', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      { type: 'message', role: 'admin', message: { t: 'disarm' } },
    )

    expect(result.state.armed).toBeNull()
    expect(result.effects).toEqual([
      { to: 'game', message: { t: 'disarm' } },
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: null } },
    ])
  })

  it('clears the arm when the game device reports it was consumed', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      { type: 'message', role: 'game', message: { t: 'consumed' } },
    )

    expect(result.state.armed).toBeNull()
    expect(result.effects).toEqual([
      { to: 'admin', message: { t: 'state', gameOnline: true, armed: null } },
    ])
  })

  it('ignores messages coming from the wrong role', () => {
    const armedState: RoomState = { armed: null, gameSocketCount: 1 }

    const armFromGame = reduceRoom(armedState, {
      type: 'message',
      role: 'game',
      message: { t: 'arm', ...ARMED },
    })
    expect(armFromGame.state).toEqual(armedState)
    expect(armFromGame.effects).toEqual([])

    const consumedFromAdmin = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      { type: 'message', role: 'admin', message: { t: 'consumed' } },
    )
    expect(consumedFromAdmin.state.armed).toEqual(ARMED)
    expect(consumedFromAdmin.effects).toEqual([])
  })

  it('ignores a state frame sent by a client', () => {
    const result = reduceRoom(
      { armed: null, gameSocketCount: 1 },
      { type: 'message', role: 'admin', message: { t: 'state', gameOnline: false, armed: null } },
    )

    expect(result.effects).toEqual([])
  })

  it('drops presence when the game device disconnects', () => {
    const result = reduceRoom(
      { armed: ARMED, gameSocketCount: 1 },
      { type: 'disconnect', role: 'game' },
    )

    expect(result.state).toEqual({ armed: ARMED, gameSocketCount: 0 })
    expect(result.effects).toEqual([
      { to: 'admin', message: { t: 'state', gameOnline: false, armed: ARMED } },
    ])
  })

  it('never lets the game socket count go negative', () => {
    const result = reduceRoom(INITIAL_ROOM_STATE, { type: 'disconnect', role: 'game' })

    expect(result.state.gameSocketCount).toBe(0)
  })

  it('emits nothing when an admin disconnects', () => {
    const result = reduceRoom(
      { armed: null, gameSocketCount: 1 },
      { type: 'disconnect', role: 'admin' },
    )

    expect(result.effects).toEqual([])
  })
})
