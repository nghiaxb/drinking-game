import { readonly, ref, type DeepReadonly, type Ref } from 'vue'
import type { AppStorage } from '@/services/storage'
import { storage as defaultStorage } from '@/services/storage'
import { useGameFeedback } from '@/composables/useGameFeedback'

export interface AppSettings {
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export const SETTINGS_STORAGE_KEY = 'settings'
export const GAME_KEY_PREFIX = 'game:'

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
}

export interface SettingsDeps {
  storage: AppStorage
  configureFeedback: (config: Partial<AppSettings>) => void
}

export interface SettingsState {
  settings: DeepReadonly<Ref<AppSettings>>
  loaded: DeepReadonly<Ref<boolean>>
  load: () => Promise<void>
  setSoundEnabled: (enabled: boolean) => Promise<boolean>
  setVibrationEnabled: (enabled: boolean) => Promise<boolean>
  resetGameData: () => Promise<boolean>
  resetAllData: () => Promise<boolean>
}

function applyFeedback(settings: AppSettings, configureFeedback: SettingsDeps['configureFeedback']): void {
  configureFeedback({
    soundEnabled: settings.soundEnabled,
    vibrationEnabled: settings.vibrationEnabled,
  })
}

export function createSettingsManager(deps: SettingsDeps): SettingsState {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)
  let loadPromise: Promise<void> | null = null

  async function persist(next: AppSettings): Promise<boolean> {
    const saved = await deps.storage.set(SETTINGS_STORAGE_KEY, next)
    if (saved) {
      settings.value = next
      applyFeedback(next, deps.configureFeedback)
    }
    return saved
  }

  async function loadFromStorage(): Promise<void> {
    const stored = await deps.storage.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
    settings.value = stored
    applyFeedback(stored, deps.configureFeedback)
    loaded.value = true
  }

  async function load(): Promise<void> {
    if (loaded.value) {
      return
    }

    if (loadPromise) {
      await loadPromise
      return
    }

    loadPromise = loadFromStorage()
    try {
      await loadPromise
    } finally {
      loadPromise = null
    }
  }

  async function setSoundEnabled(enabled: boolean): Promise<boolean> {
    return persist({ ...settings.value, soundEnabled: enabled })
  }

  async function setVibrationEnabled(enabled: boolean): Promise<boolean> {
    return persist({ ...settings.value, vibrationEnabled: enabled })
  }

  async function resetGameData(): Promise<boolean> {
    return deps.storage.clearPrefix(GAME_KEY_PREFIX)
  }

  async function resetAllData(): Promise<boolean> {
    const cleared = await deps.storage.clearNamespace()
    if (!cleared) {
      return false
    }
    settings.value = { ...DEFAULT_SETTINGS }
    applyFeedback(settings.value, deps.configureFeedback)
    return deps.storage.set(SETTINGS_STORAGE_KEY, settings.value)
  }

  return {
    settings: readonly(settings),
    loaded: readonly(loaded),
    load,
    setSoundEnabled,
    setVibrationEnabled,
    resetGameData,
    resetAllData,
  }
}

let manager: SettingsState | null = null

export function useSettings(): SettingsState {
  if (!manager) {
    manager = createSettingsManager({
      storage: defaultStorage,
      configureFeedback: (config) => useGameFeedback().configure(config),
    })
  }
  return manager
}
