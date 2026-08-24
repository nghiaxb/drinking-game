import { onMounted, readonly, ref, type DeepReadonly, type Ref } from 'vue'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PwaInstallState {
  canInstall: DeepReadonly<Ref<boolean>>
  showIosGuidance: DeepReadonly<Ref<boolean>>
  isStandalone: DeepReadonly<Ref<boolean>>
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let listenersAttached = false

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const mediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  const navigatorStandalone =
    'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true
  return mediaStandalone || navigatorStandalone
}

function onBeforeInstallPrompt(event: Event): void {
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  canInstallRef.value = true
}

function onAppInstalled(): void {
  deferredPrompt = null
  canInstallRef.value = false
  isStandaloneRef.value = true
  showIosGuidanceRef.value = false
}

const canInstallRef = ref(false)
const showIosGuidanceRef = ref(false)
const isStandaloneRef = ref(false)

function attachInstallListeners(): void {
  if (listenersAttached || typeof window === 'undefined') {
    return
  }

  listenersAttached = true
  isStandaloneRef.value = isStandaloneDisplayMode()
  showIosGuidanceRef.value = isIosDevice() && !isStandaloneRef.value

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
}

function detachInstallListeners(): void {
  if (!listenersAttached || typeof window === 'undefined') {
    return
  }

  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
  listenersAttached = false
}

export function initPwaInstall(): void {
  if (import.meta.env.SSR) {
    return
  }
  attachInstallListeners()
}

export function usePwaInstall(): PwaInstallState {
  if (!import.meta.env.SSR && !listenersAttached) {
    attachInstallListeners()
  }

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) {
      return 'unavailable'
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        deferredPrompt = null
        canInstallRef.value = false
      }
      return choice.outcome
    } catch {
      return 'unavailable'
    }
  }

  onMounted(() => {
    if (!import.meta.env.SSR) {
      attachInstallListeners()
    }
  })

  return {
    canInstall: readonly(canInstallRef),
    showIosGuidance: readonly(showIosGuidanceRef),
    isStandalone: readonly(isStandaloneRef),
    promptInstall,
  }
}

/** @internal Resets module state for unit tests. */
export function resetPwaInstallForTests(): void {
  detachInstallListeners()
  deferredPrompt = null
  canInstallRef.value = false
  showIosGuidanceRef.value = false
  isStandaloneRef.value = false
}
