import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export function readPrefersReducedMotion(): boolean {
  if (typeof globalThis.matchMedia !== 'function') {
    return false
  }
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePrefersReducedMotion(): Ref<boolean> {
  const prefersReducedMotion = ref(false)
  let mediaQuery: MediaQueryList | null = null

  function syncFromMediaQuery(): void {
    prefersReducedMotion.value = mediaQuery?.matches ?? readPrefersReducedMotion()
  }

  onMounted(() => {
    if (typeof globalThis.matchMedia !== 'function') {
      return
    }

    mediaQuery = globalThis.matchMedia('(prefers-reduced-motion: reduce)')
    syncFromMediaQuery()
    mediaQuery.addEventListener('change', syncFromMediaQuery)
  })

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', syncFromMediaQuery)
    mediaQuery = null
  })

  return prefersReducedMotion
}
