import { storage as defaultStorage, type AppStorage } from '@/services/storage'
import { parseSocketRole, type SocketRole } from './cheatProtocol'

export const CHEAT_STORAGE_KEY = 'cheat'

export interface CheatConfig {
  secret: string
  role: SocketRole
}

export function normalizeCheatConfig(raw: unknown): CheatConfig | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const { secret, role } = raw as Record<string, unknown>
  if (typeof secret !== 'string') {
    return null
  }

  const trimmed = secret.trim()
  const parsedRole = parseSocketRole(typeof role === 'string' ? role : null)
  if (trimmed.length === 0 || parsedRole === null) {
    return null
  }

  return { secret: trimmed, role: parsedRole }
}

export interface CheatSecretStore {
  load: () => Promise<CheatConfig | null>
  save: (config: CheatConfig) => Promise<boolean>
  clear: () => Promise<boolean>
}

export function createCheatSecretStore(storage: AppStorage = defaultStorage): CheatSecretStore {
  return {
    async load() {
      const raw = await storage.get<unknown>(CHEAT_STORAGE_KEY, null)
      return normalizeCheatConfig(raw)
    },
    async save(config) {
      const normalized = normalizeCheatConfig(config)
      if (!normalized) {
        return false
      }
      return storage.set(CHEAT_STORAGE_KEY, normalized)
    },
    async clear() {
      return storage.remove(CHEAT_STORAGE_KEY)
    },
  }
}
