<template>
  <section
    class="game-surface slot-view flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden py-1"
    data-testid="slot-view"
    aria-labelledby="slot-heading"
  >
    <header class="shrink-0 text-center">
      <h1 id="slot-heading" class="font-display text-2xl font-semibold text-ink">Kéo cần</h1>
      <p class="mt-1 text-sm text-ink-muted">Ba guồng — ăn đôi có thưởng, ăn ba là jackpot!</p>
    </header>

    <div class="flex flex-1 flex-col items-center justify-center gap-4 px-1">
      <div
        class="slot-stage w-full max-w-[min(100%,20rem)]"
        data-testid="slot-stage"
        role="region"
        :aria-label="stageLabel"
      >
        <SlotReels
          :display-symbols="game.displaySymbols.value"
          :stopped-reels="game.stoppedReels.value"
          :spinning="game.isSpinning.value"
          :game-phase="game.phase.value"
          :jackpot-active="game.phase.value === 'result' && game.isJackpot.value"
          :reduced-motion="prefersReducedMotion"
        />
      </div>

      <p class="sr-only" aria-live="polite" data-testid="slot-status-live">
        {{ statusText }}
      </p>

      <button
        type="button"
        class="btn-tactile btn-tactile-primary slot-lever min-h-11 w-full max-w-xs touch-manipulation"
        data-testid="slot-lever"
        :disabled="game.isSpinning.value"
        :aria-busy="game.isSpinning.value"
        @click="onSpin"
      >
        {{ game.isSpinning.value ? 'Đang quay…' : 'Kéo cần!' }}
      </button>

      <SlotResult
        v-if="game.phase.value === 'result'"
        :reward-label="game.rewardLabel.value ?? ''"
        :outcome="game.outcome.value ?? 'miss'"
        :is-jackpot="game.isJackpot.value"
        :symbol-row="resultSymbolRow"
        :reduced-motion="prefersReducedMotion"
        @replay="onReplay"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useGameFeedback } from '@/composables/useGameFeedback'
import { usePrefersReducedMotion } from '@/composables/usePrefersReducedMotion'
import SlotReels from './components/SlotReels.vue'
import SlotResult from './components/SlotResult.vue'
import { buildStatusAriaLabel } from './logic/slotGame'
import { buildResultAnnouncement } from './rewards'
import { formatSymbolRow } from './symbols'
import { useSlotGame } from './composables/useSlotGame'

const feedback = useGameFeedback()
const prefersReducedMotionRef = usePrefersReducedMotion()

const prefersReducedMotion = computed(() => prefersReducedMotionRef.value)

const game = useSlotGame({
  feedback: {
    playSpin: () => feedback.playSpin(),
    playWin: () => feedback.playWin(),
    playLose: () => feedback.playLose(),
    vibrateLight: () => feedback.vibrateLight(),
    vibrateHeavy: () => feedback.vibrateHeavy(),
  },
  prefersReducedMotion: prefersReducedMotionRef,
  primeAudio: () => feedback.primeAudio(),
})

const resultSymbolRow = computed(() => formatSymbolRow(game.symbols.value ?? []))

const statusText = computed(() =>
  buildStatusAriaLabel(game.phase.value, {
    outcome: game.outcome.value,
    rewardLabel: game.rewardLabel.value,
    isJackpot: game.isJackpot.value,
    symbols: game.symbols.value,
  }),
)

const stageLabel = computed(() => {
  if (game.phase.value === 'result') {
    return buildResultAnnouncement(
      game.outcome.value ?? 'miss',
      game.isJackpot.value,
      game.rewardLabel.value ?? '',
      resultSymbolRow.value,
    )
  }
  if (game.isSpinning.value) {
    return 'Guồng đang quay'
  }
  return 'Máy kéo cần sẵn sàng'
})

async function onSpin(): Promise<void> {
  await game.spin()
}

async function onReplay(): Promise<void> {
  game.dismissResult()
  await game.spin()
}

onBeforeUnmount(() => {
  game.dispose()
})
</script>

<style scoped>
/* The section is now exactly its content box, so anything taller has to stay reachable. */
.slot-view {
  overflow-y: auto;
  overscroll-behavior: none;
}

.slot-lever {
  min-width: var(--touch-target-min, 2.75rem);
}
</style>
