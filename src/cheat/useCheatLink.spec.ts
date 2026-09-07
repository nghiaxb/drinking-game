import { describe, it, expect, vi } from 'vitest'
import { buildCheatSocketUrl, createCheatLink, type CheatSocket } from './useCheatLink'

function fakeSocket() {
  const handlers = new Map<string, (event: { data?: unknown }) => void>()
  const sent: string[] = []
  const socket: CheatSocket = {
    send: (data) => sent.push(data),
    close: vi.fn(),
    addEventListener: (type, handler) => handlers.set(type, handler),
  }
  return {
    socket,
    sent,
    emit: (type: string, data?: unknown) => handlers.get(type)?.({ data }),
  }
}

describe('buildCheatSocketUrl', () => {
  it('encodes the secret into the path and the role into the query', () => {
    expect(buildCheatSocketUrl('wss://x.workers.dev', 'nhau cc', 'admin')).toBe(
      'wss://x.workers.dev/room/nhau%20cc?role=admin',
    )
  })

  it('tolerates a trailing slash on the base url', () => {
    expect(buildCheatSocketUrl('wss://x.workers.dev/', 'a', 'game')).toBe(
      'wss://x.workers.dev/room/a?role=game',
    )
  })
})

describe('createCheatLink', () => {
  it('applies an arm frame to the reactive ref', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x/room/a?role=game',
      role: 'game',
      createSocket: () => fake.socket,
    })

    fake.emit('open')
    expect(link.connected.value).toBe(true)

    fake.emit('message', '{"t":"arm","game":"mine","outcome":"lose"}')
    expect(link.armed.value).toEqual({ game: 'mine', outcome: 'lose' })

    fake.emit('message', '{"t":"disarm"}')
    expect(link.armed.value).toBeNull()
  })

  it('ignores malformed frames without throwing', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'game',
      createSocket: () => fake.socket,
    })

    expect(() => fake.emit('message', 'garbage')).not.toThrow()
    expect(() => fake.emit('message', 42)).not.toThrow()
    expect(link.armed.value).toBeNull()
  })

  it('tracks presence and armed state from a state frame', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'admin',
      createSocket: () => fake.socket,
    })

    fake.emit(
      'message',
      '{"t":"state","gameOnline":true,"armed":{"game":"crocodile","outcome":"win"}}',
    )

    expect(link.gameOnline.value).toBe(true)
    expect(link.armed.value).toEqual({ game: 'crocodile', outcome: 'win' })
  })

  it('serialises the admin commands', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'admin',
      createSocket: () => fake.socket,
    })

    fake.emit('open')
    link.arm({ game: 'mine', outcome: 'win' })
    link.disarm()

    expect(fake.sent).toEqual(['{"t":"arm","game":"mine","outcome":"win"}', '{"t":"disarm"}'])
  })

  it('clears the local arm as soon as it is consumed, before the server confirms', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'game',
      createSocket: () => fake.socket,
    })

    fake.emit('open')
    fake.emit('message', '{"t":"arm","game":"mine","outcome":"lose"}')
    link.consume()

    expect(link.armed.value).toBeNull()
    expect(fake.sent).toEqual(['{"t":"consumed"}'])
  })

  it('drops sends while the socket is closed instead of throwing', () => {
    const fake = fakeSocket()
    const link = createCheatLink({
      url: 'wss://x',
      role: 'admin',
      createSocket: () => fake.socket,
    })

    expect(() => link.arm({ game: 'mine', outcome: 'lose' })).not.toThrow()
    expect(fake.sent).toEqual([])
  })

  it('reconnects after a close and stops once closed on purpose', () => {
    const sockets: ReturnType<typeof fakeSocket>[] = []
    const scheduled: (() => void)[] = []
    const link = createCheatLink({
      url: 'wss://x',
      role: 'game',
      createSocket: () => {
        const next = fakeSocket()
        sockets.push(next)
        return next.socket
      },
      scheduleReconnect: (run) => scheduled.push(run),
    })

    expect(sockets).toHaveLength(1)
    sockets[0]!.emit('open')
    sockets[0]!.emit('close')

    expect(link.connected.value).toBe(false)
    expect(scheduled).toHaveLength(1)
    scheduled[0]!()
    expect(sockets).toHaveLength(2)

    link.close()
    sockets[1]!.emit('close')
    expect(scheduled).toHaveLength(1)
  })
})
