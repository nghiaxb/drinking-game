import { Capacitor } from '@capacitor/core'

export const DEFAULT_NAMESPACE = 'drinking-games'
export const DEFAULT_VERSION = '1'

export interface StorageBackend {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  keys(): Promise<string[]>
  clear(): Promise<void>
}

export interface StorageOptions {
  namespace?: string
  version?: string
  backend?: StorageBackend
  isNative?: () => boolean
}

export interface AppStorage {
  get<T>(key: string, fallback: T): Promise<T>
  set<T>(key: string, value: T): Promise<boolean>
  remove(key: string): Promise<boolean>
  clearPrefix(keyPrefix: string): Promise<boolean>
  clearNamespace(): Promise<boolean>
}

export function buildStorageKey(namespace: string, version: string, key: string): string {
  return `${namespace}:v${version}:${key}`
}

function createLocalStorageBackend(): StorageBackend {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        if (typeof localStorage === 'undefined') {
          return null
        }
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      if (typeof localStorage === 'undefined') {
        throw new Error('localStorage unavailable')
      }
      localStorage.setItem(key, value)
    },
    async removeItem(key: string): Promise<void> {
      if (typeof localStorage === 'undefined') {
        return
      }
      localStorage.removeItem(key)
    },
    async keys(): Promise<string[]> {
      if (typeof localStorage === 'undefined') {
        return []
      }
      return Object.keys(localStorage)
    },
    async clear(): Promise<void> {
      if (typeof localStorage === 'undefined') {
        return
      }
      localStorage.clear()
    },
  }
}

function createPreferencesBackend(): StorageBackend {
  return {
    async getItem(key: string): Promise<string | null> {
      const { Preferences } = await import('@capacitor/preferences')
      const result = await Preferences.get({ key })
      return result.value
    },
    async setItem(key: string, value: string): Promise<void> {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.set({ key, value })
    },
    async removeItem(key: string): Promise<void> {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.remove({ key })
    },
    async keys(): Promise<string[]> {
      const { Preferences } = await import('@capacitor/preferences')
      const result = await Preferences.keys()
      return result.keys
    },
    async clear(): Promise<void> {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.clear()
    },
  }
}

function resolveBackend(isNative: () => boolean, override?: StorageBackend): StorageBackend {
  if (override) {
    return override
  }
  return isNative() ? createPreferencesBackend() : createLocalStorageBackend()
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function defaultIsNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export function createStorage(options: StorageOptions = {}): AppStorage {
  const namespace = options.namespace ?? DEFAULT_NAMESPACE
  const version = options.version ?? DEFAULT_VERSION
  const isNative = options.isNative ?? defaultIsNative
  const backend = resolveBackend(isNative, options.backend)
  const prefix = `${namespace}:v${version}:`

  function toStorageKey(key: string): string {
    return buildStorageKey(namespace, version, key)
  }

  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      try {
        const raw = await backend.getItem(toStorageKey(key))
        if (raw === null) {
          return fallback
        }
        return safeParseJson(raw, fallback)
      } catch {
        return fallback
      }
    },

    async set<T>(key: string, value: T): Promise<boolean> {
      try {
        await backend.setItem(toStorageKey(key), JSON.stringify(value))
        return true
      } catch {
        return false
      }
    },

    async remove(key: string): Promise<boolean> {
      try {
        await backend.removeItem(toStorageKey(key))
        return true
      } catch {
        return false
      }
    },

    async clearPrefix(keyPrefix: string): Promise<boolean> {
      try {
        const allKeys = await backend.keys()
        const scopedPrefix = `${prefix}${keyPrefix}`
        const scopedKeys = allKeys.filter((storageKey) => storageKey.startsWith(scopedPrefix))
        await Promise.all(scopedKeys.map((storageKey) => backend.removeItem(storageKey)))
        return true
      } catch {
        return false
      }
    },

    async clearNamespace(): Promise<boolean> {
      try {
        const allKeys = await backend.keys()
        const scopedKeys = allKeys.filter((storageKey) => storageKey.startsWith(prefix))
        await Promise.all(scopedKeys.map((storageKey) => backend.removeItem(storageKey)))
        return true
      } catch {
        return false
      }
    },
  }
}

export const storage = createStorage()
