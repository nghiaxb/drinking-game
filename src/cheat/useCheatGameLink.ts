import { onUnmounted, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue'
import { getCheatSocketUrl } from '@/config/site'
import { createCheatSecretStore } from './cheatSecret'
import { buildCheatSocketUrl, createCheatLink, type CheatLink } from './useCheatLink'
import type { ArmedCheat, WheelLabel } from './cheatTypes'

export interface CheatGameLink {
  armed: DeepReadonly<Ref<ArmedCheat | null>>
  consume: () => void
  publishWheel: (items: readonly WheelLabel[]) => void
}

/** No secret stored, or no socket url configured, means no socket at all — the default. */
export function useCheatGameLink(): CheatGameLink {
  const armed = ref<ArmedCheat | null>(null)
  let link: CheatLink | null = null
  let stopMirror: (() => void) | null = null
  let stopFlush: (() => void) | null = null
  // The wheel view can publish before the socket exists, so hold the latest rows and flush later.
  let latestWheel: readonly WheelLabel[] | null = null

  void createCheatSecretStore()
    .load()
    .then((config) => {
      const baseUrl = getCheatSocketUrl()
      if (!config || config.role !== 'game' || baseUrl.length === 0) {
        return
      }

      const opened = createCheatLink({
        url: buildCheatSocketUrl(baseUrl, config.secret, 'game'),
        role: 'game',
      })
      link = opened
      /*
       * Mirror into a local ref so the press path reads one synchronous source. The watcher is
       * created after setup returned, so it is not auto-disposed — hence stopMirror.
       */
      stopMirror = watch(
        () => opened.armed.value,
        (next) => {
          armed.value = next
        },
        { immediate: true },
      )

      /*
       * The socket is not open yet on this tick, and a send before then is dropped. Flushing on
       * every transition to connected also re-publishes after a reconnect.
       */
      stopFlush = watch(
        () => opened.connected.value,
        (isConnected) => {
          if (isConnected && latestWheel !== null) {
            opened.publishWheel(latestWheel)
          }
        },
        { immediate: true },
      )
    })
    .catch(() => {})

  onUnmounted(() => {
    stopMirror?.()
    stopFlush?.()
    link?.close()
    link = null
  })

  return {
    armed: readonly(armed),
    consume() {
      armed.value = null
      link?.consume()
    },
    publishWheel(items) {
      latestWheel = items
      link?.publishWheel(items)
    },
  }
}
