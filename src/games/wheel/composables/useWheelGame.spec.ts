import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { DEFAULT_WHEEL_ITEMS, WHEEL_STORAGE_KEY_ITEMS } from '../config'
import { createStorage, type StorageBackend } from '@/services/storage'
import { createWheelGame } from './useWheelGame'

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

function createGame(storage: ReturnType<typeof createStorage>) {
  return createWheelGame({
    storage,
    rng: () => 0,
    feedback: {
      playTick: vi.fn().mockResolvedValue(undefined),
      playWin: vi.fn().mockResolvedValue(undefined),
      vibrateHeavy: vi.fn().mockResolvedValue(undefined),
    },
    prefersReducedMotion: ref(false),
  })
}

describe('useWheelGame', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads defaults when storage is missing', async () => {
    const game = createGame(createStorage({ backend: createMemoryBackend(), isNative: () => false }))
    await game.load()
    expect(game.items.value).toEqual(DEFAULT_WHEEL_ITEMS)
  })

  it('generates internal id from label when saving new draft', async () => {
    const game = createGame(createStorage({ backend: createMemoryBackend(), isNative: () => false }))
    await game.load()
    game.openEditor()
    game.setEditorDraft({ label: 'Thử mới', enabled: true })

    await expect(game.saveEditorDraft()).resolves.toBe(true)
    expect(game.items.value.some((item) => item.id === 'thu-moi' && item.label === 'Thử mới')).toBe(
      true,
    )
  })

  it('loads defaults when persisted data is corrupt', async () => {
    const backend = createMemoryBackend({
      'drinking-games:v1:game:wheel:items': '{bad',
    })
    const game = createGame(createStorage({ backend, isNative: () => false }))
    await game.load()
    expect(game.items.value).toEqual(DEFAULT_WHEEL_ITEMS)
  })

  it('rolls back in-memory items when persistence fails on toggle', async () => {
    const backend = createMemoryBackend()
    const storage = createStorage({ backend, isNative: () => false })
    vi.spyOn(storage, 'set').mockResolvedValue(false)

    const game = createGame(storage)
    await game.load()
    const before = game.items.value.map((item) => ({ ...item }))
    const target = before.find((item) => item.enabled)?.id
    expect(target).toBeTruthy()

    await expect(game.toggleItemEnabled(target ?? '')).resolves.toBe(false)
    expect(game.items.value).toEqual(before)
    expect(game.persistError.value).toContain('Không thể lưu')
  })

  it('keeps editor open when save persistence fails', async () => {
    const backend = createMemoryBackend()
    const storage = createStorage({ backend, isNative: () => false })
    vi.spyOn(storage, 'set').mockResolvedValue(false)

    const game = createGame(storage)
    await game.load()
    game.openEditor()
    game.setEditorDraft({ label: 'Mục mới', enabled: true })

    await expect(game.saveEditorDraft()).resolves.toBe(false)
    expect(game.editorOpen.value).toBe(true)
    expect(game.persistError.value).toContain('Không thể lưu')
  })

  it('selects winner before animation and exposes result-first state', async () => {
    vi.useFakeTimers()
    const game = createWheelGame({
      storage: createStorage({ backend: createMemoryBackend(), isNative: () => false }),
      rng: () => 0,
      feedback: {
        playTick: vi.fn().mockResolvedValue(undefined),
        playWin: vi.fn().mockResolvedValue(undefined),
        vibrateHeavy: vi.fn().mockResolvedValue(undefined),
      },
      prefersReducedMotion: ref(true),
    })

    await game.load()
    const spinPromise = game.spin()
    expect(game.pendingWinnerId.value).toBe('drink-50')
    expect(game.winnerId.value).toBeNull()

    await vi.advanceTimersByTimeAsync(0)
    await spinPromise
    await nextTick()

    expect(game.winnerId.value).toBe('drink-50')
    expect(game.phase.value).toBe('result')
    vi.useRealTimers()
  })

  it('swallows win and haptic rejections on complete', async () => {
    vi.useFakeTimers()
    const game = createWheelGame({
      storage: createStorage({ backend: createMemoryBackend(), isNative: () => false }),
      rng: () => 0,
      feedback: {
        playTick: vi.fn().mockResolvedValue(undefined),
        playWin: vi.fn().mockRejectedValue(new Error('audio blocked')),
        vibrateHeavy: vi.fn().mockRejectedValue(new Error('haptic blocked')),
      },
      prefersReducedMotion: ref(true),
    })

    await game.load()
    const spinPromise = game.spin()
    await vi.advanceTimersByTimeAsync(0)
    await spinPromise
    expect(game.phase.value).toBe('result')
    vi.useRealTimers()
  })

  it('prevents double spin while spinning', async () => {
    vi.useFakeTimers()
    const game = createWheelGame({
      storage: createStorage({ backend: createMemoryBackend(), isNative: () => false }),
      rng: () => 0,
      feedback: {
        playTick: vi.fn().mockResolvedValue(undefined),
        playWin: vi.fn().mockResolvedValue(undefined),
        vibrateHeavy: vi.fn().mockResolvedValue(undefined),
      },
      prefersReducedMotion: ref(true),
    })

    await game.load()
    void game.spin()
    const second = await game.spin()
    expect(second).toBe(false)
    expect(game.spinBlockReason.value).toBe('spinning')
    await vi.advanceTimersByTimeAsync(0)
    vi.useRealTimers()
  })

  it('persists and reloads empty item list after delete all', async () => {
    const backend = createMemoryBackend()
    const storage = createStorage({ backend, isNative: () => false })
    const game = createGame(storage)
    await game.load()

    for (const item of [...game.items.value]) {
      await game.deleteItem(item.id)
    }
    expect(game.items.value).toEqual([])

    const reloaded = createGame(storage)
    await reloaded.load()
    expect(reloaded.items.value).toEqual([])
    expect(reloaded.spinBlockReason.value).toBe('too-few-enabled')
  })

  it('blocks spin when editor is open even if draft is valid', async () => {
    const game = createGame(createStorage({ backend: createMemoryBackend(), isNative: () => false }))
    await game.load()
    game.openEditor()
    game.setEditorDraft({ label: 'Hợp lệ', enabled: true })

    expect(game.spinBlockReason.value).toBe('editor-open')
    expect(await game.spin()).toBe(false)
  })

  it('resets phase on dispose during spin', async () => {
    vi.useFakeTimers()
    const game = createWheelGame({
      storage: createStorage({ backend: createMemoryBackend(), isNative: () => false }),
      rng: () => 0,
      feedback: {
        playTick: vi.fn().mockResolvedValue(undefined),
        playWin: vi.fn().mockResolvedValue(undefined),
        vibrateHeavy: vi.fn().mockResolvedValue(undefined),
      },
      prefersReducedMotion: ref(true),
    })

    await game.load()
    void game.spin()
    expect(game.phase.value).toBe('spinning')

    game.dispose()
    expect(game.phase.value).toBe('idle')
    vi.useRealTimers()
  })

  it('persists CRUD changes under game:wheel: prefix', async () => {
    const backend = createMemoryBackend()
    const storage = createStorage({ backend, isNative: () => false })
    const game = createGame(storage)

    await game.load()
    game.openEditor()
    game.setEditorDraft({ label: 'Custom', enabled: true })
    await game.saveEditorDraft()

    const raw = await storage.get(WHEEL_STORAGE_KEY_ITEMS, null)
    expect(raw).toEqual([
      ...DEFAULT_WHEEL_ITEMS,
      { id: 'custom', label: 'Custom', enabled: true },
    ])
  })
})
