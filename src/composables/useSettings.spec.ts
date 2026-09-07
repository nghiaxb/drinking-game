import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSettingsManager,
  DEFAULT_SETTINGS,
  GAME_KEY_PREFIX,
  SETTINGS_STORAGE_KEY,
  resetSettingsForTests,
} from './useSettings'
import { createStorage, type StorageBackend } from '@/services/storage'

function createMemoryBackend(initial: Record<string, string> = {}): StorageBackend {
  const store = new Map<string, string>(Object.entries(initial))

  return {
    async getItem(key: string): Promise<string | null> {
      return store.has(key) ? (store.get(key) ?? null) : null
    },
    async setItem(key: string, value: string): Promise<void> {
      store.set(key, value)
    },
    async removeItem(key: string): Promise<void> {
      store.delete(key)
    },
    async keys(): Promise<string[]> {
      return [...store.keys()]
    },
    async clear(): Promise<void> {
      store.clear()
    },
  }
}

describe('useSettings', () => {
  beforeEach(() => {
    resetSettingsForTests()
    vi.restoreAllMocks()
  })

  it('loads defaults and wires feedback configure on load', async () => {
    const configureFeedback = vi.fn()
    const backend = createMemoryBackend()
    const storage = createStorage({ backend, isNative: () => false })
    const settings = createSettingsManager({ storage, configureFeedback })

    await settings.load()

    expect(settings.settings.value).toEqual(DEFAULT_SETTINGS)
    expect(settings.loaded.value).toBe(true)
    expect(configureFeedback).toHaveBeenCalledWith(DEFAULT_SETTINGS)
  })

  it('persists sound toggle and updates feedback', async () => {
    const configureFeedback = vi.fn()
    const backend = createMemoryBackend()
    const storage = createStorage({ backend, isNative: () => false })
    const settings = createSettingsManager({ storage, configureFeedback })

    await settings.load()
    configureFeedback.mockClear()

    await expect(settings.setSoundEnabled(false)).resolves.toBe(true)
    expect(settings.settings.value.soundEnabled).toBe(false)
    expect(configureFeedback).toHaveBeenCalledWith({
      soundEnabled: false,
      vibrationEnabled: true,
    })
  })

  it('persists vibration toggle and updates feedback', async () => {
    const configureFeedback = vi.fn()
    const backend = createMemoryBackend()
    const storage = createStorage({ backend, isNative: () => false })
    const settings = createSettingsManager({ storage, configureFeedback })

    await settings.load()
    configureFeedback.mockClear()

    await expect(settings.setVibrationEnabled(false)).resolves.toBe(true)
    expect(settings.settings.value.vibrationEnabled).toBe(false)
    expect(configureFeedback).toHaveBeenCalledWith({
      soundEnabled: true,
      vibrationEnabled: false,
    })
  })

  it('resetGameData clears only game-prefixed keys and keeps settings', async () => {
    const backend = createMemoryBackend({
      'drinking-games:v1:settings': JSON.stringify({ soundEnabled: false, vibrationEnabled: true }),
      'drinking-games:v1:game:wheel': '[]',
    })
    const storage = createStorage({ backend, isNative: () => false })
    const settings = createSettingsManager({
      storage,
      configureFeedback: vi.fn(),
    })

    await settings.load()
    await expect(settings.resetGameData()).resolves.toBe(true)

    const remaining = await backend.keys()
    expect(remaining).toEqual(['drinking-games:v1:settings'])
    expect(settings.settings.value.soundEnabled).toBe(false)
  })

  it('resetAllData clears namespace and restores defaults', async () => {
    const backend = createMemoryBackend({
      'drinking-games:v1:settings': JSON.stringify({ soundEnabled: false, vibrationEnabled: false }),
      'drinking-games:v1:game:wheel': '[]',
    })
    const storage = createStorage({ backend, isNative: () => false })
    const configureFeedback = vi.fn()
    const settings = createSettingsManager({ storage, configureFeedback })

    await settings.load()
    configureFeedback.mockClear()

    await expect(settings.resetAllData()).resolves.toBe(true)

    expect(settings.settings.value).toEqual(DEFAULT_SETTINGS)
    expect(configureFeedback).toHaveBeenCalledWith(DEFAULT_SETTINGS)
    expect(await storage.get(SETTINGS_STORAGE_KEY, null)).toEqual(DEFAULT_SETTINGS)
  })

  it('resetGameData uses the game key prefix constant', () => {
    expect(GAME_KEY_PREFIX).toBe('game:')
  })

  it('load is idempotent and shares a single in-flight promise', async () => {
    const configureFeedback = vi.fn()
    let resolveGet: (value: string | null) => void = () => undefined
    const getItem = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveGet = resolve
        }),
    )
    const delayedBackend: StorageBackend = {
      ...createMemoryBackend(),
      getItem,
    }
    const delayedStorage = createStorage({ backend: delayedBackend, isNative: () => false })
    const settings = createSettingsManager({
      storage: delayedStorage,
      configureFeedback,
    })

    const first = settings.load()
    const second = settings.load()
    expect(getItem).toHaveBeenCalledTimes(1)

    resolveGet(JSON.stringify({ soundEnabled: false, vibrationEnabled: true }))
    await Promise.all([first, second])

    expect(settings.loaded.value).toBe(true)
    expect(settings.settings.value.soundEnabled).toBe(false)
    expect(configureFeedback).toHaveBeenCalledTimes(1)

    configureFeedback.mockClear()
    await settings.load()
    expect(configureFeedback).not.toHaveBeenCalled()
  })
})
