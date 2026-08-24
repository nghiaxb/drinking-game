import type { Router } from 'vue-router'
import { onUnmounted } from 'vue'
import { Capacitor } from '@capacitor/core'

export interface AndroidBackHandler {
  dispose: () => void
}

export interface AndroidBackDeps {
  isNative: () => boolean
  importAppPlugin: () => Promise<{
    App: {
      addListener: (
        event: 'backButton',
        handler: () => void,
      ) => Promise<{ remove: () => Promise<void> }>
      exitApp: () => Promise<void>
    }
  }>
}

function defaultIsNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

async function defaultImportAppPlugin(): Promise<AndroidBackDeps['importAppPlugin'] extends () => Promise<infer R> ? R : never> {
  return import('@capacitor/app')
}

export async function setupAndroidBackButton(
  router: Router,
  deps: Partial<AndroidBackDeps> = {},
): Promise<AndroidBackHandler | null> {
  if (import.meta.env.SSR || typeof window === 'undefined') {
    return null
  }

  const isNative = deps.isNative ?? defaultIsNative
  if (!isNative()) {
    return null
  }

  try {
    const importAppPlugin = deps.importAppPlugin ?? defaultImportAppPlugin
    const { App } = await importAppPlugin()
    const listener = await App.addListener('backButton', () => {
      if (router.currentRoute.value.path !== '/') {
        router.back()
        return
      }
      void App.exitApp()
    })

    return {
      dispose: () => {
        void listener.remove()
      },
    }
  } catch {
    return null
  }
}

export function useAndroidBack(router: Router, deps: Partial<AndroidBackDeps> = {}): void {
  if (import.meta.env.SSR) {
    return
  }

  let handler: AndroidBackHandler | null = null
  let disposed = false

  void setupAndroidBackButton(router, deps).then((result) => {
    if (disposed) {
      result?.dispose()
      return
    }
    handler = result
  })

  onUnmounted(() => {
    disposed = true
    handler?.dispose()
    handler = null
  })
}
