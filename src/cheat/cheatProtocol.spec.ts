import { describe, it, expect } from 'vitest'
import { parseCheatMessage, parseSocketRole } from './cheatProtocol'

describe('parseCheatMessage', () => {
  it('parses every valid message shape', () => {
    expect(
      parseCheatMessage('{"t":"arm","game":"crocodile","outcome":"lose","mode":"sticky"}'),
    ).toEqual({ t: 'arm', game: 'crocodile', outcome: 'lose', mode: 'sticky' })
    expect(parseCheatMessage('{"t":"disarm"}')).toEqual({ t: 'disarm' })
    expect(parseCheatMessage('{"t":"consumed"}')).toEqual({ t: 'consumed' })
    expect(
      parseCheatMessage(
        '{"t":"state","gameOnline":true,"armed":{"game":"mine","outcome":"win","mode":"once"}}',
      ),
    ).toEqual({
      t: 'state',
      gameOnline: true,
      armed: { game: 'mine', outcome: 'win', mode: 'once' },
    })
    expect(parseCheatMessage('{"t":"state","gameOnline":false,"armed":null}')).toEqual({
      t: 'state',
      gameOnline: false,
      armed: null,
    })
  })

  it('returns null for anything malformed instead of throwing', () => {
    const bad = [
      '',
      'not json',
      '{',
      '[]',
      'null',
      '123',
      '{"t":"nope"}',
      '{"t":"arm"}',
      '{"t":"arm","game":"wheel","outcome":"lose"}',
      '{"t":"arm","game":"mine","outcome":"maybe"}',
      '{"t":"state","gameOnline":"yes","armed":null}',
      '{"t":"state","gameOnline":true}',
      '{"t":"state","gameOnline":true,"armed":{"game":"mine"}}',
      '{"t":"arm","game":"mine","outcome":"lose","mode":"forever"}',
      42,
      null,
      undefined,
      {},
    ]

    for (const raw of bad) {
      expect(parseCheatMessage(raw)).toBeNull()
    }
  })
  it('defaults a missing mode to once, so a stale relay degrades instead of breaking', () => {
    expect(parseCheatMessage('{"t":"arm","game":"mine","outcome":"lose"}')).toEqual({
      t: 'arm',
      game: 'mine',
      outcome: 'lose',
      mode: 'once',
    })
    expect(
      parseCheatMessage('{"t":"state","gameOnline":true,"armed":{"game":"mine","outcome":"win"}}'),
    ).toEqual({
      t: 'state',
      gameOnline: true,
      armed: { game: 'mine', outcome: 'win', mode: 'once' },
    })
  })
  it('parses a wheel arm carrying a segment id', () => {
    expect(
      parseCheatMessage('{"t":"arm","game":"wheel","itemId":"drink-100","mode":"once"}'),
    ).toEqual({ t: 'arm', game: 'wheel', itemId: 'drink-100', mode: 'once' })
  })

  it('rejects a wheel arm without a usable segment id', () => {
    const bad = [
      '{"t":"arm","game":"wheel","mode":"once"}',
      '{"t":"arm","game":"wheel","itemId":"","mode":"once"}',
      '{"t":"arm","game":"wheel","itemId":"   ","mode":"once"}',
      '{"t":"arm","game":"wheel","itemId":42,"mode":"once"}',
      '{"t":"arm","game":"wheel","outcome":"lose","mode":"once"}',
    ]

    for (const raw of bad) {
      expect(parseCheatMessage(raw)).toBeNull()
    }
  })

  it('rejects a press-game arm that carries an itemId instead of an outcome', () => {
    expect(parseCheatMessage('{"t":"arm","game":"mine","itemId":"x","mode":"once"}')).toBeNull()
  })

  it('parses a wheel label list and drops malformed entries wholesale', () => {
    expect(
      parseCheatMessage(
        '{"t":"wheel","items":[{"id":"a","label":"Uống 50%"},{"id":"b","label":"X"}]}',
      ),
    ).toEqual({
      t: 'wheel',
      items: [
        { id: 'a', label: 'Uống 50%' },
        { id: 'b', label: 'X' },
      ],
    })

    expect(parseCheatMessage('{"t":"wheel","items":[]}')).toEqual({ t: 'wheel', items: [] })

    const bad = [
      '{"t":"wheel"}',
      '{"t":"wheel","items":"a"}',
      '{"t":"wheel","items":[{"id":"a"}]}',
      '{"t":"wheel","items":[{"id":"","label":"x"}]}',
      '{"t":"wheel","items":[{"id":"a","label":""}]}',
      '{"t":"wheel","items":[{"id":"a","label":5}]}',
    ]
    for (const raw of bad) {
      expect(parseCheatMessage(raw)).toBeNull()
    }
  })

  it('caps the wheel label list so one device cannot flood the room', () => {
    const items = Array.from({ length: 80 }, (_, i) => `{"id":"i${i}","label":"L${i}"}`).join(',')
    expect(parseCheatMessage(`{"t":"wheel","items":[${items}]}`)).toBeNull()
  })
})

describe('parseSocketRole', () => {
  it('accepts the two known roles and rejects everything else', () => {
    expect(parseSocketRole('game')).toBe('game')
    expect(parseSocketRole('admin')).toBe('admin')
    expect(parseSocketRole('Game')).toBeNull()
    expect(parseSocketRole('')).toBeNull()
    expect(parseSocketRole(null)).toBeNull()
  })
})
