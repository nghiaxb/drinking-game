<template>
  <section data-testid="settings-view" class="flex flex-col gap-6">
    <header class="flex flex-col gap-1">
      <!-- Deliberately not a button: a hidden entry must stay out of the tab order and off screen readers. -->
      <h1
        class="settings-title font-display text-2xl font-semibold text-ink"
        data-testid="settings-title"
        @click="onTitleTap"
      >
        Cài đặt
      </h1>
      <p class="text-sm text-ink-muted">Âm thanh, rung và quản lý dữ liệu cục bộ.</p>
    </header>

    <div class="flex flex-col gap-3 rounded-2xl border-2 border-border bg-surface-elevated p-4">
      <label class="flex min-h-11 items-center justify-between gap-3">
        <span class="font-semibold text-ink">Âm thanh</span>
        <input
          v-model="soundEnabled"
          type="checkbox"
          class="h-6 w-11 cursor-pointer accent-teal"
          data-testid="settings-sound-toggle"
          @change="onSoundChange"
        />
      </label>
      <label class="flex min-h-11 items-center justify-between gap-3">
        <span class="font-semibold text-ink">Rung</span>
        <input
          v-model="vibrationEnabled"
          type="checkbox"
          class="h-6 w-11 cursor-pointer accent-teal"
          data-testid="settings-vibration-toggle"
          @change="onVibrationChange"
        />
      </label>
    </div>

    <div class="flex flex-col gap-3">
      <button
        type="button"
        class="btn-tactile w-full"
        data-testid="reset-game-button"
        @click="openResetGame"
      >
        Xoá dữ liệu trò chơi
      </button>
      <button
        type="button"
        class="btn-tactile btn-tactile-primary w-full"
        data-testid="reset-all-button"
        @click="openResetAll"
      >
        Xoá toàn bộ dữ liệu
      </button>
    </div>

    <p v-if="toastMessage" class="toast-banner" data-testid="settings-toast" role="status">
      {{ toastMessage }}
    </p>

    <ConfirmDialog
      :open="activeDialog === 'game'"
      test-id="confirm-dialog-game"
      title="Xoá dữ liệu trò chơi?"
      message="Tiến trình và cấu hình của các trò chơi sẽ bị xoá. Cài đặt âm thanh/rung được giữ nguyên."
      confirm-label="Xoá game"
      @confirm="confirmResetGame"
      @cancel="closeDialog"
    />

    <ConfirmDialog
      :open="activeDialog === 'all'"
      test-id="confirm-dialog-all"
      title="Xoá toàn bộ dữ liệu?"
      message="Mọi dữ liệu cục bộ sẽ bị xoá và cài đặt trở về mặc định. Thao tác này không thể hoàn tác."
      confirm-label="Xoá tất cả"
      @confirm="confirmResetAll"
      @cancel="closeDialog"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createSecretTap } from '@/cheat/secretTap'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useSettings } from '@/composables/useSettings'

type DialogKind = 'game' | 'all' | null

const router = useRouter()
const secretTap = createSecretTap()
const settings = useSettings()
const soundEnabled = ref(true)
const vibrationEnabled = ref(true)
const activeDialog = ref<DialogKind>(null)
const toastMessage = ref('')

watch(
  () => settings.settings.value,
  (value) => {
    soundEnabled.value = value.soundEnabled
    vibrationEnabled.value = value.vibrationEnabled
  },
  { immediate: true, deep: true },
)

async function onSoundChange(): Promise<void> {
  const ok = await settings.setSoundEnabled(soundEnabled.value)
  if (!ok) {
    soundEnabled.value = settings.settings.value.soundEnabled
    showToast('Không lưu được cài đặt âm thanh')
  }
}

async function onVibrationChange(): Promise<void> {
  const ok = await settings.setVibrationEnabled(vibrationEnabled.value)
  if (!ok) {
    vibrationEnabled.value = settings.settings.value.vibrationEnabled
    showToast('Không lưu được cài đặt rung')
  }
}

function openResetGame(): void {
  activeDialog.value = 'game'
}

function openResetAll(): void {
  activeDialog.value = 'all'
}

function closeDialog(): void {
  activeDialog.value = null
}

async function confirmResetGame(): Promise<void> {
  closeDialog()
  const ok = await settings.resetGameData()
  showToast(ok ? 'Đã xoá dữ liệu trò chơi' : 'Không xoá được dữ liệu trò chơi')
}

async function confirmResetAll(): Promise<void> {
  closeDialog()
  const ok = await settings.resetAllData()
  soundEnabled.value = settings.settings.value.soundEnabled
  vibrationEnabled.value = settings.settings.value.vibrationEnabled
  showToast(ok ? 'Đã xoá toàn bộ và khôi phục mặc định' : 'Không xoá được dữ liệu')
}

function showToast(message: string): void {
  toastMessage.value = message
  globalThis.setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

function onTitleTap(): void {
  if (secretTap.tap()) {
    void router.push('/x')
  }
}
</script>

<style scoped>
.settings-title {
  touch-action: manipulation;
}
</style>
