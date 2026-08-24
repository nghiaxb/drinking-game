import { readonly, ref, type DeepReadonly, type Ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

const needRefresh = ref(false)
const offlineReady = ref(false)

let updateServiceWorkerImpl: UpdateServiceWorker | null = null
let initialized = false

export interface PwaUpdateState {
  needRefresh: DeepReadonly<Ref<boolean>>
  offlineReady: DeepReadonly<Ref<boolean>>
  updateServiceWorker: UpdateServiceWorker
}

export function initPwaUpdate(): void {
  if (initialized || import.meta.env.SSR) {
    return
  }

  initialized = true
  updateServiceWorkerImpl = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh.value = true
    },
    onOfflineReady() {
      offlineReady.value = true
    },
  })
}

export function usePwaUpdate(): PwaUpdateState {
  if (!initialized && !import.meta.env.SSR) {
    throw new Error('usePwaUpdate() requires initPwaUpdate() during client bootstrap')
  }

  return {
    needRefresh: readonly(needRefresh),
    offlineReady: readonly(offlineReady),
    async updateServiceWorker(reloadPage = true) {
      if (updateServiceWorkerImpl) {
        await updateServiceWorkerImpl(reloadPage)
      }
    },
  }
}

/** @internal Resets module state for unit tests. */
export function resetPwaUpdateForTests(): void {
  needRefresh.value = false
  offlineReady.value = false
  updateServiceWorkerImpl = null
  initialized = false
}
