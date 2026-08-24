export type SoundId = 'click' | 'tick' | 'win' | 'lose' | 'chomp' | 'explosion' | 'spin'

const SOUND_URLS: Record<SoundId, string> = {
  click: '/sounds/click.wav',
  tick: '/sounds/tick.wav',
  win: '/sounds/win.wav',
  lose: '/sounds/lose.wav',
  chomp: '/sounds/chomp.wav',
  explosion: '/sounds/explosion.wav',
  spin: '/sounds/spin.wav',
}

type AudioContextConstructor = typeof AudioContext

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: AudioContextConstructor
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }
  const scopedWindow = window as WindowWithWebkitAudio
  return window.AudioContext ?? scopedWindow.webkitAudioContext ?? null
}

function defaultCreateContext(): AudioContext | null {
  const AudioContextClass = getAudioContextConstructor()
  if (!AudioContextClass) {
    return null
  }
  return new AudioContextClass()
}

async function defaultFetchSound(url: string): Promise<ArrayBuffer | null> {
  const response = await fetch(url)
  if (!response.ok) {
    return null
  }
  return response.arrayBuffer()
}

export interface AudioPlayerOptions {
  createContext?: () => AudioContext | null
  fetchSound?: (url: string) => Promise<ArrayBuffer | null>
}

export interface AudioPlayer {
  prime(): Promise<void>
  play(id: SoundId): Promise<void>
}

export function createAudioPlayer(options: AudioPlayerOptions = {}): AudioPlayer {
  const createContext = options.createContext ?? defaultCreateContext
  const fetchSound = options.fetchSound ?? defaultFetchSound

  let context: AudioContext | null = null
  const buffers = new Map<SoundId, AudioBuffer>()
  let primed = false
  let hasPrimeRequest = false
  let primingPromise: Promise<void> | null = null

  async function runPrime(): Promise<void> {
    try {
      const nextContext = createContext()
      if (!nextContext) {
        return
      }

      context = nextContext
      if (context.state === 'suspended') {
        await context.resume()
      }

      const soundIds = Object.keys(SOUND_URLS) as SoundId[]
      await Promise.all(
        soundIds.map(async (id) => {
          const data = await fetchSound(SOUND_URLS[id])
          if (!data || !context) {
            return
          }
          const buffer = await context.decodeAudioData(data)
          buffers.set(id, buffer)
        }),
      )
      primed = true
    } catch {
      // Audio unavailable or blocked — safe no-op.
    } finally {
      primingPromise = null
    }
  }

  function prime(): Promise<void> {
    if (primed) {
      return Promise.resolve()
    }

    hasPrimeRequest = true

    if (!primingPromise) {
      primingPromise = runPrime()
    }

    return primingPromise
  }

  async function play(id: SoundId): Promise<void> {
    if (!hasPrimeRequest) {
      return
    }

    try {
      if (primingPromise) {
        await primingPromise
      }

      if (!context || !primed) {
        return
      }

      const buffer = buffers.get(id)
      if (!buffer) {
        return
      }

      if (context.state === 'suspended') {
        await context.resume()
      }

      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      source.start(0)
    } catch {
      // Playback failure — safe no-op.
    }
  }

  return { prime, play }
}
