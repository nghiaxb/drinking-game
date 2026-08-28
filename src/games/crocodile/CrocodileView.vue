<template>
  <section
    class="game-surface crocodile-view--scroll-y flex min-h-0 flex-1 flex-col gap-4 py-1"
    data-testid="crocodile-view"
    aria-labelledby="crocodile-heading"
    :data-result-delay-ms="String(CROCODILE_RESULT_DELAY_MS)"
  >
    <header class="shrink-0 text-center">
      <h1 id="crocodile-heading" class="font-display text-2xl font-semibold text-ink">
        Răng cá sấu
      </h1>
      <p class="mt-1 text-sm text-ink-muted">Chọn răng an toàn — dính bẫy thì uống!</p>
    </header>

    <div class="flex flex-1 flex-col items-center justify-center">
      <div
        class="crocodile-stage crocodile-stage--responsive w-full"
        data-testid="crocodile-stage"
        :data-full-bleed-breakpoint-px="String(CROCODILE_FULL_BLEED_BREAKPOINT_PX)"
      >
        <CrocodileToy
          :upper-row-count="game.upperRowCount.value"
          :lower-row-count="game.lowerRowCount.value"
          :pressed-indices="game.pressedIndices.value"
          :disabled-indices="disabledIndices"
          :jaw-closed="game.jawClosed.value"
          @press="onPressTooth"
        />

        <div v-if="game.isTerminal.value && resultVisible" class="crocodile-result-layer">
          <div
            class="crocodile-result w-full max-w-xs rounded-2xl border-2 border-accent bg-accent-soft px-4 py-4 text-center shadow-tactile"
            data-testid="crocodile-result"
            role="alert"
          >
            <p class="font-display text-xl font-bold text-ink">🐊 CÁ SẤU CẮN!</p>
            <p class="mt-1 text-lg font-semibold text-accent">🍺 UỐNG!</p>
            <button
              type="button"
              class="btn-tactile btn-tactile-primary mt-4 w-full"
              data-testid="crocodile-replay"
              @click="onReplay"
            >
              <IconRefresh :size="20" stroke="2" aria-hidden="true" />
              Chơi lại
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { IconRefresh } from '@tabler/icons-vue'
import { useGameFeedback } from '@/composables/useGameFeedback'
import CrocodileToy from './components/CrocodileToy.vue'
import { useCrocodileGame } from './composables/useCrocodileGame'
import { CROCODILE_FULL_BLEED_BREAKPOINT_PX } from './layout'

const feedback = useGameFeedback()
const audioPrimed = ref(false)
const resultVisible = ref(false)
const CROCODILE_RESULT_DELAY_MS = 420
let resultTimer: ReturnType<typeof globalThis.setTimeout> | undefined

const game = useCrocodileGame({
  feedback: {
    playClick: () => feedback.playClick(),
    playChomp: () => feedback.playChomp(),
    vibrateLight: () => feedback.vibrateLight(),
    vibrateHeavy: () => feedback.vibrateHeavy(),
  },
  primeAudio: () => feedback.primeAudio(),
})

const disabledIndices = computed(() => {
  const indices: number[] = []
  for (let index = 0; index < game.toothCount.value; index += 1) {
    if (game.isToothDisabled(index)) {
      indices.push(index)
    }
  }
  return indices
})

function clearResultTimer(): void {
  if (resultTimer !== undefined) {
    globalThis.clearTimeout(resultTimer)
    resultTimer = undefined
  }
}

watch(
  () => game.jawClosed.value,
  (jawClosed) => {
    clearResultTimer()
    resultVisible.value = false

    if (jawClosed) {
      resultTimer = globalThis.setTimeout(() => {
        resultVisible.value = true
        resultTimer = undefined
      }, CROCODILE_RESULT_DELAY_MS)
    }
  },
  { immediate: true },
)

onBeforeUnmount(clearResultTimer)

async function onPressTooth(index: number): Promise<void> {
  if (!audioPrimed.value) {
    game.primeAudio()
    audioPrimed.value = true
  }
  await game.pressTooth(index)
}

function onReplay(): void {
  clearResultTimer()
  resultVisible.value = false
  game.reset()
}
</script>

<style scoped>
.crocodile-view--scroll-y {
  overflow-x: visible;
  overflow-y: auto;
}

.crocodile-stage--responsive {
  width: calc(100% + 2 * max(1rem, var(--spacing-safe-left), var(--spacing-safe-right)));
  max-width: none;
  margin-inline: calc(-1 * max(1rem, var(--spacing-safe-left), var(--spacing-safe-right)));
}

/**
 * The bite payoff must never sit below the fold: the toy already fills a short viewport, so an
 * in-flow result card pushed the layout and forced a scroll at the one moment nobody wants to
 * scroll. Anchoring to the stage — the one box the player is guaranteed to be looking at — keeps
 * the card on screen without touching the toy's geometry.
 */
.crocodile-stage--responsive {
  position: relative;
}

.crocodile-result-layer {
  position: absolute;
  right: 0;
  bottom: 1%;
  left: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  padding-inline: 1rem;
  pointer-events: none;
}

.crocodile-result {
  animation: crocodile-result-in 0.16s cubic-bezier(0.2, 0.82, 0.3, 1) both;
  pointer-events: auto;
}

@keyframes crocodile-result-in {
  from {
    opacity: 0;
    transform: translateY(0.45rem) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (min-width: 400px) {
  .crocodile-stage--responsive {
    width: 100%;
    max-width: min(100%, 24rem);
    margin-inline: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crocodile-result {
    animation: none;
  }
}
</style>
