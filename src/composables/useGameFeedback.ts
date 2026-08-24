import { Capacitor } from '@capacitor/core'
import { createAudioPlayer, type SoundId } from '@/services/audioFeedback'
import { impactNative, vibrateWeb } from '@/services/hapticFeedback'

export interface FeedbackSettings {
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export interface GameFeedbackDeps {
  isNative: () => boolean
  playSound: (id: SoundId) => Promise<void>
  vibrateWeb: (durationMs: number) => boolean
  impactNative: (style: 'light' | 'heavy') => Promise<void>
}

const defaultAudio = createAudioPlayer()

export function createGameFeedback(deps: Partial<GameFeedbackDeps> = {}) {
  const resolved: GameFeedbackDeps = {
    isNative: deps.isNative ?? (() => Capacitor.isNativePlatform()),
    playSound: deps.playSound ?? ((id) => defaultAudio.play(id)),
    vibrateWeb: deps.vibrateWeb ?? vibrateWeb,
    impactNative: deps.impactNative ?? impactNative,
  }

  const settings: FeedbackSettings = {
    soundEnabled: true,
    vibrationEnabled: true,
  }

  function configure(config: Partial<FeedbackSettings>): void {
    if (config.soundEnabled !== undefined) {
      settings.soundEnabled = config.soundEnabled
    }
    if (config.vibrationEnabled !== undefined) {
      settings.vibrationEnabled = config.vibrationEnabled
    }
  }

  function primeAudio(): void {
    void defaultAudio.prime()
  }

  async function playSoundSafe(id: SoundId): Promise<void> {
    if (!settings.soundEnabled) {
      return
    }
    try {
      await resolved.playSound(id)
    } catch {
      // Sound failure — safe no-op.
    }
  }

  async function vibrateSafe(style: 'light' | 'heavy'): Promise<void> {
    if (!settings.vibrationEnabled) {
      return
    }
    try {
      if (resolved.isNative()) {
        await resolved.impactNative(style)
        return
      }
      resolved.vibrateWeb(style === 'light' ? 10 : 40)
    } catch {
      // Haptic failure — safe no-op.
    }
  }

  return {
    configure,
    primeAudio,
    playClick: () => playSoundSafe('click'),
    playTick: () => playSoundSafe('tick'),
    playWin: () => playSoundSafe('win'),
    playLose: () => playSoundSafe('lose'),
    playChomp: () => playSoundSafe('chomp'),
    playExplosion: () => playSoundSafe('explosion'),
    playSpin: () => playSoundSafe('spin'),
    vibrateLight: () => vibrateSafe('light'),
    vibrateHeavy: () => vibrateSafe('heavy'),
  }
}

let singleton: ReturnType<typeof createGameFeedback> | null = null

export function useGameFeedback() {
  if (!singleton) {
    singleton = createGameFeedback()
  }
  return singleton
}

export type GameFeedback = ReturnType<typeof createGameFeedback>
