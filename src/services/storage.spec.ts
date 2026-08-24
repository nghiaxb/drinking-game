import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildStorageKey,
  createStorage,
  DEFAULT_NAMESPACE,
  DEFAULT_VERSION,
  type StorageBackend,
} from './storage'

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

describe('storage adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('builds namespaced versioned keys', () => {
    expect(buildStorageKey('drinking-games', '1', 'settings')).toBe(
      'drinking-games:v1:settings',
    )
  })

  it('persists values in localStorage on web platform', async () => {
    localStorage.clear()
    const appStorage = createStorage({ isNative: () => false })

    await appStorage.set('settings', { sound: true })
    expect(localStorage.getItem(buildStorageKey(DEFAULT_NAMESPACE, DEFAULT_VERSION, 'settings'))).toBe(
      '{"sound":true}',
    )
  })

  it('uses localStorage backend on web', async () => {
    const backend = createMemoryBackend()
    const storage = createStorage({
      backend,
      isNative: () => false,
    })

    await storage.set('settings', { sound: true })
    expect(await storage.get('settings', { sound: false })).toEqual({ sound: true })
    expect(backend).toBeDefined()
  })

  it('uses injected native backend when isNative is true', async () => {
    const backend = createMemoryBackend()
    const storage = createStorage({
      backend,
      isNative: () => true,
    })

    await storage.set('wheel-items', [{ id: 'a', label: 'Beer' }])
    const items = await storage.get('wheel-items', [] as { id: string; label: string }[])

    expect(items).toEqual([{ id: 'a', label: 'Beer' }])
    const keys = await backend.keys()
    expect(keys.some((key) => key.startsWith(`${DEFAULT_NAMESPACE}:v${DEFAULT_VERSION}:`))).toBe(
      true,
    )
  })

  it('returns fallback when stored JSON is corrupt', async () => {
    const key = buildStorageKey(DEFAULT_NAMESPACE, DEFAULT_VERSION, 'settings')
    const backend = createMemoryBackend({ [key]: '{not-json' })
    const storage = createStorage({ backend, isNative: () => false })

    const fallback = { sound: false, vibration: true }
    expect(await storage.get('settings', fallback)).toEqual(fallback)
  })

  it('returns fallback and does not throw when getItem fails', async () => {
    const backend: StorageBackend = {
      getItem: vi.fn().mockRejectedValue(new Error('quota')),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      keys: vi.fn().mockResolvedValue([]),
      clear: vi.fn(),
    }
    const storage = createStorage({ backend, isNative: () => false })

    await expect(storage.get('settings', { sound: true })).resolves.toEqual({ sound: true })
  })

  it('returns false and does not throw when setItem fails', async () => {
    const backend: StorageBackend = {
      getItem: vi.fn(),
      setItem: vi.fn().mockRejectedValue(new Error('quota')),
      removeItem: vi.fn(),
      keys: vi.fn().mockResolvedValue([]),
      clear: vi.fn(),
    }
    const storage = createStorage({ backend, isNative: () => false })

    await expect(storage.set('settings', { sound: true })).resolves.toBe(false)
  })

  it('clears only keys in the current namespace and version', async () => {
    const backend = createMemoryBackend({
      'drinking-games:v1:settings': '{"sound":true}',
      'drinking-games:v1:wheel': '[]',
      'other-app:v1:settings': '{"keep":true}',
      'drinking-games:v2:settings': '{"future":true}',
    })
    const storage = createStorage({ backend, isNative: () => false })

    await expect(storage.clearNamespace()).resolves.toBe(true)

    const remaining = await backend.keys()
    expect(remaining).toEqual(['other-app:v1:settings', 'drinking-games:v2:settings'])
  })

  it('clearPrefix removes only keys matching the logical prefix', async () => {
    const backend = createMemoryBackend({
      'drinking-games:v1:settings': '{"soundEnabled":true}',
      'drinking-games:v1:game:wheel': '[]',
      'drinking-games:v1:game:slot:progress': '{"spins":3}',
      'drinking-games:v1:other': '"keep"',
    })
    const storage = createStorage({ backend, isNative: () => false })

    await expect(storage.clearPrefix('game:')).resolves.toBe(true)

    const remaining = await backend.keys()
    expect(remaining).toEqual([
      'drinking-games:v1:settings',
      'drinking-games:v1:other',
    ])
  })

  it('returns false when clearPrefix keys() fails', async () => {
    const backend: StorageBackend = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      keys: vi.fn().mockRejectedValue(new Error('keys unavailable')),
      clear: vi.fn(),
    }
    const storage = createStorage({ backend, isNative: () => false })

    await expect(storage.clearPrefix('game:')).resolves.toBe(false)
  })

  it('remove deletes a single namespaced key', async () => {
    const backend = createMemoryBackend()
    const storage = createStorage({ backend, isNative: () => false })

    await storage.set('progress', { level: 2 })
    await expect(storage.remove('progress')).resolves.toBe(true)
    expect(await storage.get('progress', null)).toBeNull()
  })

  it('returns false when clearNamespace keys() fails', async () => {
    const backend: StorageBackend = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      keys: vi.fn().mockRejectedValue(new Error('keys unavailable')),
      clear: vi.fn(),
    }
    const storage = createStorage({ backend, isNative: () => false })

    await expect(storage.clearNamespace()).resolves.toBe(false)
  })

  it('returns fallback when localStorage is unavailable (SSR)', async () => {
    vi.stubGlobal('localStorage', undefined)
    const appStorage = createStorage({ isNative: () => false })

    await expect(appStorage.get('settings', { sound: true })).resolves.toEqual({ sound: true })
    await expect(appStorage.set('settings', { sound: false })).resolves.toBe(false)
  })
})
