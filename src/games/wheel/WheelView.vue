<template>
  <section
    class="game-surface wheel-view flex min-h-[calc(100dvh-4.5rem)] flex-col gap-4 overflow-x-hidden py-1"
    data-testid="wheel-view"
    aria-labelledby="wheel-heading"
  >
    <header class="shrink-0 text-center">
      <h1 id="wheel-heading" class="font-display text-2xl font-semibold text-ink">Vòng quay</h1>
      <p class="mt-1 text-sm text-ink-muted">Quay để chọn thử thách ngẫu nhiên!</p>
    </header>

    <div class="flex flex-1 flex-col items-center gap-4 px-1">
      <div
        class="wheel-stage w-full max-w-[min(100%,20rem)]"
        data-testid="wheel-stage"
        role="region"
        :aria-label="stageAriaLabel"
      >
        <WheelDisc
          :items="game.items.value"
          :rotation="game.rotation.value"
          :spinning="game.isSpinning.value"
          :spin-duration-ms="game.spinDurationMs.value"
        />
      </div>

      <p
        v-if="game.spinBlockMessage.value"
        class="text-center text-sm text-ink-muted"
        data-testid="wheel-spin-block"
        role="status"
      >
        {{ game.spinBlockMessage.value }}
      </p>

      <button
        type="button"
        class="btn-tactile btn-tactile-primary min-h-11 w-full max-w-xs"
        data-testid="wheel-spin-button"
        :disabled="Boolean(game.spinBlockReason.value)"
        :aria-describedby="game.spinBlockMessage.value ? 'wheel-spin-block-desc' : undefined"
        @click="onSpin"
      >
        {{ game.isSpinning.value ? 'Đang quay…' : 'Quay!' }}
      </button>
      <span
        v-if="game.spinBlockMessage.value"
        id="wheel-spin-block-desc"
        class="sr-only"
      >
        {{ game.spinBlockMessage.value }}
      </span>

      <div
        v-if="game.phase.value === 'result' && game.winnerLabel.value"
        class="w-full max-w-xs rounded-2xl border-2 border-teal bg-teal-soft px-4 py-4 text-center shadow-tactile"
        data-testid="wheel-result"
        role="status"
        aria-live="assertive"
      >
        <p class="font-display text-xl font-bold text-ink">🎯 Kết quả</p>
        <p class="mt-2 text-lg font-semibold text-ink">{{ game.winnerLabel.value }}</p>
        <button
          type="button"
          class="btn-tactile btn-tactile-primary mt-4 min-h-11 w-full"
          data-testid="wheel-dismiss-result"
          @click="game.dismissResult()"
        >
          Quay tiếp
        </button>
      </div>

      <WheelEditor
        :items="game.items.value"
        :editor-open="game.editorOpen.value"
        :editor-draft="game.editorDraft.value"
        :editing-id="game.editingId.value"
        :editor-validation="game.editorValidation.value"
        :persist-error="game.persistError.value"
        :locked="game.isSpinning.value"
        @open-editor="game.openEditor()"
        @close-editor="game.closeEditor()"
        @set-draft="game.setEditorDraft($event)"
        @save-draft="onSaveDraft"
        @start-edit="game.startEdit($event)"
        @toggle-enabled="onToggleEnabled"
        @delete-item="onDeleteItem"
        @reset-items="onResetItems"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameFeedback } from '@/composables/useGameFeedback'
import { storage } from '@/services/storage'
import WheelDisc from './components/WheelDisc.vue'
import WheelEditor from './components/WheelEditor.vue'
import { usePrefersReducedMotion } from '@/composables/usePrefersReducedMotion'
import { useWheelGame } from './composables/useWheelGame'

const feedback = useGameFeedback()
const audioPrimed = ref(false)
const prefersReducedMotion = usePrefersReducedMotion()

const game = useWheelGame({
  storage,
  feedback: {
    playTick: () => feedback.playTick(),
    playWin: () => feedback.playWin(),
    vibrateHeavy: () => feedback.vibrateHeavy(),
  },
  prefersReducedMotion,
  primeAudio: () => feedback.primeAudio(),
})

const stageAriaLabel = computed(() => {
  if (game.phase.value === 'result' && game.winnerLabel.value) {
    return `Kết quả: ${game.winnerLabel.value}`
  }
  if (game.isSpinning.value) {
    return 'Vòng quay đang quay'
  }
  return 'Vòng quay sẵn sàng'
})

onMounted(async () => {
  await game.load()
})

onBeforeUnmount(() => {
  game.dispose()
})

async function onSpin(): Promise<void> {
  if (!audioPrimed.value) {
    game.primeAudio()
    audioPrimed.value = true
  }
  await game.spin()
}

async function onSaveDraft(): Promise<void> {
  await game.saveEditorDraft()
}

async function onToggleEnabled(id: string): Promise<void> {
  await game.toggleItemEnabled(id)
}

async function onDeleteItem(id: string): Promise<void> {
  await game.deleteItem(id)
}

async function onResetItems(): Promise<void> {
  await game.resetItems()
}
</script>

<style scoped>
.wheel-view {
  overflow-y: auto;
}
</style>
