<template>
  <section
    class="game-surface wheel-view flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden py-1"
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

        <!-- Overlaid on the wheel so showing a result never pushes the list below it. -->
        <div
          v-if="game.phase.value === 'result' && game.winnerLabel.value"
          class="wheel-result-layer"
        >
          <div class="wheel-result" :style="winnerStyle" data-testid="wheel-result" role="alert">
            <p class="wheel-result-kicker">
              <IconTarget :size="16" stroke="2.4" aria-hidden="true" />
              Kết quả
            </p>
            <p class="wheel-result-label">{{ game.winnerLabel.value }}</p>
            <button
              type="button"
              class="btn-tactile wheel-result-action mt-3 min-h-11 w-full"
              data-testid="wheel-dismiss-result"
              @click="game.dismissResult()"
            >
              Quay tiếp
            </button>
          </div>
        </div>
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
      <span v-if="game.spinBlockMessage.value" id="wheel-spin-block-desc" class="sr-only">
        {{ game.spinBlockMessage.value }}
      </span>

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
import { IconTarget } from '@tabler/icons-vue'
import { useGameFeedback } from '@/composables/useGameFeedback'
import { storage } from '@/services/storage'
import { wheelSegmentStyleAt } from './config'
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

/**
 * Tint the result with the wedge that actually won, so the panel and the wheel agree. Segments come
 * from the enabled items in order, which is the same index the disc colours from.
 */
const winnerStyle = computed(() => {
  const winnerId = game.winnerId.value
  if (!winnerId) {
    return undefined
  }

  const index = game.items.value.filter((item) => item.enabled).findIndex((i) => i.id === winnerId)
  if (index < 0) {
    return undefined
  }

  const style = wheelSegmentStyleAt(index)
  return { '--winner-fill': style.fill, '--winner-text': style.text }
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
.wheel-stage {
  position: relative;
}

.wheel-result-layer {
  position: absolute;
  right: 0;
  bottom: -0.5rem;
  left: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  padding-inline: 0.5rem;
  pointer-events: none;
}

.wheel-result {
  width: 100%;
  max-width: 15rem;
  padding: 0.7rem 0.9rem 0.85rem;
  border: 3px solid var(--color-ink);
  border-radius: 1.25rem;
  background: var(--winner-fill, var(--color-surface-elevated));
  color: var(--winner-text, var(--color-ink));
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-ink) 30%, transparent);
  text-align: center;
  pointer-events: auto;
}

.wheel-result-kicker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.wheel-result-label {
  margin-top: 0.15rem;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.25;
}

/*
 * Cream with an ink border rather than the coral primary: the panel takes the winning wedge's
 * colour, and coral-on-coral was unreadable when a red wedge won. This reads on all twelve.
 */
.wheel-result-action {
  border-color: var(--color-ink);
  background: var(--color-surface-elevated);
  color: var(--color-ink);
}

.wheel-result-action:hover:not(:disabled) {
  background: var(--color-surface-muted);
}

.wheel-view {
  overflow-y: auto;
  overscroll-behavior: none;
}
</style>
