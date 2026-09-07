import { describe, it, expect, vi } from 'vitest'
import { createCheatSecretStore, normalizeCheatConfig } from './cheatSecret'
import type { AppStorage } from '@/services/storage'

function fakeStorage(initial: Record<string, unknown> = {}): AppStorage {
  const data = new Map(Object.entries(initial))
  return {
    get: vi.fn(async (key: string, fallback: unknown) => data.get(key) ?? fallback),
    set: vi.fn(async (key: string, value: unknown) => {
      data.set(key, value)
      return true
    }),
    remove: vi.fn(async (key: string) => {
      data.delete(key)
      return true
    }),
    clearPrefix: vi.fn(async () => true),
    clearNamespace: vi.fn(async () => true),
  } as unknown as AppStorage
}

describe('normalizeCheatConfig', () => {
  it('accepts a trimmed secret with a known role', () => {
    expect(normalizeCheatConfig({ secret: '  hi there  ', role: 'admin' })).toEqual({
      secret: 'hi there',
      role: 'admin',
    })
  })

  it('rejects an empty secret or an unknown role', () => {
    const bad = [
      null,
      undefined,
      'string',
      {},
      { secret: '', role: 'admin' },
      { secret: '   ', role: 'admin' },
      { secret: 'ok', role: 'boss' },
      { secret: 'ok' },
      { role: 'game' },
      { secret: 42, role: 'game' },
    ]

    for (const raw of bad) {
      expect(normalizeCheatConfig(raw)).toBeNull()
    }
  })
})

describe('createCheatSecretStore', () => {
  it('returns null when nothing is configured — the default state for every device', async () => {
    const store = createCheatSecretStore(fakeStorage())

    await expect(store.load()).resolves.toBeNull()
  })

  it('round-trips a saved config', async () => {
    const storage = fakeStorage()
    const store = createCheatSecretStore(storage)

    await expect(store.save({ secret: 'nhaucc', role: 'game' })).resolves.toBe(true)
    await expect(store.load()).resolves.toEqual({ secret: 'nhaucc', role: 'game' })
  })

  it('refuses to save an invalid config', async () => {
    const storage = fakeStorage()
    const store = createCheatSecretStore(storage)

    await expect(store.save({ secret: '  ', role: 'game' })).resolves.toBe(false)
    expect(storage.set).not.toHaveBeenCalled()
  })

  it('discards stored junk instead of returning it', async () => {
    const store = createCheatSecretStore(fakeStorage({ cheat: { secret: '', role: 'nope' } }))

    await expect(store.load()).resolves.toBeNull()
  })

  it('clears the config', async () => {
    const storage = fakeStorage({ cheat: { secret: 'nhaucc', role: 'admin' } })
    const store = createCheatSecretStore(storage)

    await expect(store.clear()).resolves.toBe(true)
    await expect(store.load()).resolves.toBeNull()
  })
})
