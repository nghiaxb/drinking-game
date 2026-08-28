<template>
  <div class="app-shell flex h-full flex-col" data-testid="app-shell">
    <!-- Outside the scroller (.app-content) now, so it stays put without needing `sticky`. -->
    <header
      class="z-40 shrink-0 border-b-2 border-border bg-surface/95 px-safe pt-safe backdrop-blur-sm"
    >
      <div class="mx-auto flex h-14 max-w-lg items-center justify-between gap-2">
        <div class="flex min-w-11 items-center">
          <button
            v-if="showBack"
            type="button"
            class="btn-tactile btn-icon"
            aria-label="Quay lại"
            data-testid="shell-back"
            @click="goBack"
          >
            <IconArrowLeft :size="22" stroke="2" aria-hidden="true" />
          </button>
        </div>

        <RouterLink
          v-if="showHomeTitle"
          to="/"
          class="truncate font-display text-lg font-semibold text-ink no-underline"
          data-testid="shell-home-link"
        >
          Drinking Games
        </RouterLink>
        <p v-else class="truncate font-display text-lg font-semibold text-ink">{{ pageTitle }}</p>

        <div class="flex min-w-11 items-center justify-end gap-2">
          <RouterLink
            v-if="showHomeButton"
            to="/"
            class="btn-tactile btn-icon"
            aria-label="Về trang chủ"
            data-testid="shell-home"
          >
            <IconHome :size="22" stroke="2" aria-hidden="true" />
          </RouterLink>
          <RouterLink
            v-if="showSettings"
            to="/settings"
            class="btn-tactile btn-icon"
            aria-label="Cài đặt"
            data-testid="shell-settings"
          >
            <IconSettings :size="22" stroke="2" aria-hidden="true" />
          </RouterLink>
        </div>
      </div>
    </header>

    <div
      v-if="showPwaHints && pwaUpdate.offlineReady.value && !offlineDismissed"
      class="border-b-2 border-teal bg-teal-soft px-safe py-2 text-center text-sm font-semibold text-ink"
      data-testid="pwa-offline-ready"
    >
      Sẵn sàng chơi offline
      <button type="button" class="ml-2 underline" @click="dismissOfflineReady">OK</button>
    </div>

    <div
      v-if="pwaUpdate.needRefresh.value"
      class="border-b-2 border-accent bg-accent-soft px-safe py-2 text-center text-sm font-semibold text-ink"
      data-testid="pwa-update-banner"
    >
      Có bản cập nhật mới
      <button
        type="button"
        class="btn-tactile btn-tactile-primary ml-2 px-3 py-1 text-sm"
        @click="applyUpdate"
      >
        Cập nhật
      </button>
    </div>

    <div
      v-if="pwaInstall.canInstall.value"
      class="border-b-2 border-amber bg-amber-soft px-safe py-2 text-center text-sm font-semibold text-ink"
      data-testid="pwa-install-banner"
    >
      Cài app để chơi nhanh hơn
      <button type="button" class="btn-tactile ml-2 px-3 py-1 text-sm" @click="installApp">
        Cài đặt
      </button>
    </div>

    <div
      v-if="showPwaHints && pwaInstall.showIosGuidance.value && !pwaInstall.isStandalone.value"
      class="border-b-2 border-border bg-surface-muted px-safe py-2 text-center text-xs text-ink-muted"
      data-testid="pwa-ios-guidance"
    >
      Trên iPhone: Chia sẻ → Thêm vào Màn hình chính
    </div>

    <main class="app-content relative flex flex-1 flex-col py-4 pb-safe">
      <div
        v-if="isNavigating"
        class="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-surface-muted"
        data-testid="route-loading"
        aria-hidden="true"
      >
        <div class="route-loading-bar h-full w-1/3 bg-teal" />
      </div>

      <RouterView v-slot="{ Component, route: activeRoute }">
        <Transition name="route-fade" mode="out-in">
          <component :is="Component" :key="activeRoute.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { IconArrowLeft, IconHome, IconSettings } from '@tabler/icons-vue'
import { useAndroidBack } from '@/composables/useAndroidBack'
import { useSettings } from '@/composables/useSettings'
import { initPwaInstall, usePwaInstall } from '@/pwa/usePwaInstall'
import { usePwaUpdate } from '@/pwa/usePwaUpdate'

const router = useRouter()
const route = useRoute()
const pwaUpdate = usePwaUpdate()
const pwaInstall = usePwaInstall()
const settings = useSettings()
const isNavigating = ref(false)
const offlineDismissed = ref(false)

const showBack = computed(() => route.path !== '/')
const showHomeButton = computed(() => route.path.startsWith('/games/'))
const showSettings = computed(() => route.path === '/')
const showHomeTitle = computed(() => route.path === '/')
// Offline / "add to home screen" hints are onboarding, not gameplay — they only crowd a game screen.
const showPwaHints = computed(() => route.path === '/')
const pageTitle = computed(() => {
  if (route.path === '/settings') {
    return 'Cài đặt'
  }
  if (route.name === 'not-found') {
    return 'Không tìm thấy'
  }
  if (route.path.startsWith('/games/')) {
    return 'Trò chơi'
  }
  return 'Drinking Games'
})

useAndroidBack(router)

onMounted(() => {
  initPwaInstall()
  void settings.load()
})

const removeBeforeEach = router.beforeEach(() => {
  isNavigating.value = true
})

const removeAfterEach = router.afterEach(() => {
  isNavigating.value = false
})

onUnmounted(() => {
  removeBeforeEach()
  removeAfterEach()
})

function goBack(): void {
  if (globalThis.history.length > 1) {
    router.back()
    return
  }
  void router.push('/')
}

async function applyUpdate(): Promise<void> {
  await pwaUpdate.updateServiceWorker(true)
}

async function installApp(): Promise<void> {
  await pwaInstall.promptInstall()
}

function dismissOfflineReady(): void {
  offlineDismissed.value = true
}
</script>

<style scoped>
.route-loading-bar {
  animation: route-loading 0.9s ease-in-out infinite;
}

@keyframes route-loading {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(320%);
  }
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition: opacity 0.18s ease;
}

.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .route-loading-bar {
    animation: none;
    width: 100%;
  }

  .route-fade-enter-active,
  .route-fade-leave-active {
    transition: none;
  }
}
</style>
