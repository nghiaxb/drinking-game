import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioPlayer, type SoundId } from './audioFeedback'

const SOUND_URLS: Record<SoundId, string> = {
  click: '/sounds/click.wav',
  tick: '/sounds/tick.wav',
  win: '/sounds/win.wav',
  lose: '/sounds/lose.wav',
  chomp: '/sounds/chomp.wav',
  explosion: '/sounds/explosion.wav',
  spin: '/sounds/spin.wav',
}

interface MockBufferSource {
  buffer: AudioBuffer | null
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockAudioContext {
  state: AudioContextState
  destination: object
  resume: ReturnType<typeof vi.fn>
  decodeAudioData: ReturnType<typeof vi.fn>
  createBufferSource: ReturnType<typeof vi.fn>
  instances: MockBufferSource[]
}

function createMockAudioContext(): MockAudioContext {
  const instances: MockBufferSource[] = []

  return {
    state: 'running',
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn().mockImplementation(async (data: ArrayBuffer) => ({
      duration: 0.1,
      byteLength: data.byteLength,
    })),
    createBufferSource: vi.fn().mockImplementation(() => {
      const source: MockBufferSource = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }
      instances.push(source)
      return source
    }),
    instances,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('audioFeedback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('no-ops on SSR when AudioContext is unavailable', async () => {
    const player = createAudioPlayer({
      createContext: () => null,
      fetchSound: vi.fn(),
    })

    await expect(player.prime()).resolves.toBeUndefined()
    await expect(player.play('click')).resolves.toBeUndefined()
    expect(player).toBeDefined()
  })

  it('prime fetches and decodes every bundled sound', async () => {
    const context = createMockAudioContext()
    const fetchSound = vi.fn().mockImplementation(async (url: string) => {
      return new TextEncoder().encode(url).buffer
    })

    const player = createAudioPlayer({
      createContext: () => context as unknown as AudioContext,
      fetchSound,
    })

    await player.prime()

    expect(fetchSound).toHaveBeenCalledTimes(7)
    for (const url of Object.values(SOUND_URLS)) {
      expect(fetchSound).toHaveBeenCalledWith(url)
    }
    expect(context.decodeAudioData).toHaveBeenCalledTimes(7)
  })

  it('does not throw when prime fetch or decode fails', async () => {
    const context = createMockAudioContext()
    context.decodeAudioData.mockRejectedValue(new Error('decode failed'))

    const player = createAudioPlayer({
      createContext: () => context as unknown as AudioContext,
      fetchSound: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    })

    await expect(player.prime()).resolves.toBeUndefined()
    await expect(player.play('click')).resolves.toBeUndefined()
  })

  it('does not play before prime has been requested', async () => {
    const context = createMockAudioContext()
    const player = createAudioPlayer({
      createContext: () => context as unknown as AudioContext,
      fetchSound: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    })

    await player.play('click')

    expect(context.createBufferSource).not.toHaveBeenCalled()
  })

  it('plays after prime completes', async () => {
    const context = createMockAudioContext()
    const player = createAudioPlayer({
      createContext: () => context as unknown as AudioContext,
      fetchSound: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    })

    await player.prime()
    await player.play('click')

    expect(context.createBufferSource).toHaveBeenCalledTimes(1)
    expect(context.instances[0]?.start).toHaveBeenCalledTimes(1)
  })

  it('awaits in-flight prime when play is called during priming', async () => {
    const context = createMockAudioContext()
    const fetchDeferred = createDeferred<ArrayBuffer>()
    const fetchSound = vi.fn().mockImplementation(async (url: string) => {
      if (url === SOUND_URLS.click) {
        return fetchDeferred.promise
      }
      return new TextEncoder().encode(url).buffer
    })

    const player = createAudioPlayer({
      createContext: () => context as unknown as AudioContext,
      fetchSound,
    })

    const priming = player.prime()
    const playing = player.play('click')

    expect(context.createBufferSource).not.toHaveBeenCalled()

    fetchDeferred.resolve(new ArrayBuffer(8))
    await priming
    await playing

    expect(context.createBufferSource).toHaveBeenCalledTimes(1)
    expect(context.instances[0]?.start).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight prime across concurrent calls', async () => {
    const context = createMockAudioContext()
    const primeGate = createDeferred<void>()
    const fetchSound = vi.fn().mockImplementation(async () => {
      await primeGate.promise
      return new ArrayBuffer(8)
    })

    let contextsCreated = 0
    const player = createAudioPlayer({
      createContext: () => {
        contextsCreated += 1
        return context as unknown as AudioContext
      },
      fetchSound,
    })

    const first = player.prime()
    const second = player.prime()
    const third = player.prime()

    expect(first).toBe(second)
    expect(second).toBe(third)

    primeGate.resolve()
    await Promise.all([first, second, third])

    expect(contextsCreated).toBe(1)
    expect(fetchSound).toHaveBeenCalledTimes(7)
  })
})
