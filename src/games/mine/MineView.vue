<template>
  <section
    class="game-surface mine-view--scroll-y flex min-h-[calc(100dvh-4.5rem)] flex-col gap-4 overflow-x-hidden py-1"
    data-testid="mine-view"
    aria-labelledby="mine-heading"
  >
    <header class="shrink-0 text-center">
      <h1 id="mine-heading" class="font-display text-2xl font-semibold text-ink">Mìn</h1>
      <p class="mt-1 text-sm text-ink-muted">Mở ô an toàn — chạm mìn thì uống!</p>
    </header>

    <div class="flex flex-1 flex-col items-center justify-center gap-4 px-1">
      <div
        class="mine-stage w-full max-w-[min(100%,20rem)]"
        data-testid="mine-stage"
        role="region"
        :aria-label="statusText"
      >
        <MineGrid
          :grid-size="game.gridSize.value"
          :revealed-indices="game.revealedIndices.value"
          :disabled-indices="disabledIndices"
          :mine-indices="game.mineIndices.value"
          :hit-mine-index="game.hitMineIndex.value"
          :exploded="game.isTerminal.value"
          @press="onPressCell"
        />
      </div>

      <p
        class="sr-only"
        aria-live="polite"
        data-testid="mine-status-live"
      >
        {{ statusText }}
      </p>

      <div
        v-if="game.isTerminal.value"
        class="w-full max-w-xs rounded-2xl border-2 border-accent bg-accent-soft px-4 py-4 text-center shadow-tactile"
        data-testid="mine-result"
        role="status"
        aria-live="assertive"
      >
        <p class="font-display text-xl font-bold text-ink">💥 TRÚNG MÌN!</p>
        <p class="mt-1 text-lg font-semibold text-accent">🍺 UỐNG!</p>
        <button
          type="button"
          class="btn-tactile btn-tactile-primary mt-4 w-full"
          data-testid="mine-replay"
          @click="onReplay"
        >
          <IconRefresh :size="20" stroke="2" aria-hidden="true" />
          Chơi lại
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconRefresh } from '@tabler/icons-vue'
import { useGameFeedback } from '@/composables/useGameFeedback'
import MineGrid from './components/MineGrid.vue'
import { useMineGame } from './composables/useMineGame'

const feedback = useGameFeedback()
const audioPrimed = ref(false)

const game = useMineGame({
  feedback: {
    playClick: () => feedback.playClick(),
    playExplosion: () => feedback.playExplosion(),
    vibrateLight: () => feedback.vibrateLight(),
    vibrateHeavy: () => feedback.vibrateHeavy(),
  },
  primeAudio: () => feedback.primeAudio(),
})

const disabledIndices = computed(() => {
  const indices: number[] = []
  const total = game.gridSize.value * game.gridSize.value
  for (let index = 0; index < total; index += 1) {
    if (game.isCellDisabled(index)) {
      indices.push(index)
    }
  }
  return indices
})

const statusText = computed(() => {
  if (game.isTerminal.value) {
    return 'Trúng mìn! Uống một ly.'
  }
  if (game.revealedIndices.value.length === 0) {
    return 'Chọn một ô để bắt đầu.'
  }
  return `Đã mở ${game.revealedIndices.value.length} ô an toàn.`
})

async function onPressCell(index: number): Promise<void> {
  if (!audioPrimed.value) {
    game.primeAudio()
    audioPrimed.value = true
  }
  await game.pressCell(index)
}

function onReplay(): void {
  game.reset()
}
</script>

<style scoped>
.mine-view--scroll-y {
  overflow-y: auto;
}
</style>
