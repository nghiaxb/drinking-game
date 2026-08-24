<template>
  <section
    class="game-surface cards-view flex min-h-[calc(100dvh-4.5rem)] flex-col gap-3 overflow-x-hidden overflow-y-auto py-1"
    data-testid="cards-view"
    aria-labelledby="cards-heading"
  >
    <header class="shrink-0 text-center">
      <h1 id="cards-heading" class="font-display text-2xl font-semibold text-ink">Bốc bài</h1>
      <p class="mt-1 text-sm text-ink-muted">Truth, Dare và thẻ uống — chạm hoặc vuốt để bốc lá.</p>
    </header>

    <div class="flex flex-1 flex-col items-center gap-3 px-2">
      <div
        class="flex w-full max-w-md flex-wrap justify-center gap-2"
        role="group"
        aria-label="Chọn bộ bài"
        data-testid="cards-deck-selector"
      >
        <button
          v-for="deck in deckOptions"
          :key="deck.id"
          type="button"
          class="btn-tactile min-h-11 min-w-11 px-3 text-sm"
          :class="game.deckType.value === deck.id ? 'btn-tactile-primary' : 'btn-tactile-secondary'"
          :data-testid="`cards-deck-${deck.id}`"
          :aria-pressed="game.deckType.value === deck.id ? 'true' : 'false'"
          :disabled="game.isAnimating.value"
          @click="game.setDeck(deck.id)"
        >
          {{ deck.label }}
        </button>
      </div>

      <div
        v-if="game.deckType.value === 'truth'"
        class="flex w-full max-w-md flex-wrap justify-center gap-2"
        role="group"
        aria-label="Lọc độ khó Thật"
        data-testid="cards-truth-filters"
      >
        <button
          v-for="difficulty in truthOptions"
          :key="difficulty.id"
          type="button"
          class="btn-tactile min-h-11 min-w-11 px-3 text-sm"
          :class="
            game.truthDifficulties.value.includes(difficulty.id)
              ? 'btn-tactile-primary'
              : 'btn-tactile-secondary'
          "
          :data-testid="`cards-truth-${difficulty.id}`"
          :aria-pressed="
            game.truthDifficulties.value.includes(difficulty.id) ? 'true' : 'false'
          "
          :disabled="game.isAnimating.value"
          @click="game.toggleDifficulty(difficulty.id)"
        >
          {{ difficulty.label }}
        </button>
      </div>

      <div
        class="flex w-full max-w-md items-center justify-between gap-2 text-sm text-ink-muted"
        data-testid="cards-counter"
      >
        <span>Còn {{ game.remaining.value }}/{{ game.totalInPool.value }} lá</span>
        <span>Chu kỳ {{ game.cycleNumber.value }}</span>
      </div>

      <CardStack
        :card="game.currentCard.value"
        :is-flipped="game.isFlipped.value"
        :locked="game.isAnimating.value"
        :flip-duration-ms="flipDurationMs"
        @draw="onDraw"
      />

      <div class="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          class="btn-tactile btn-tactile-primary min-h-11 w-full touch-manipulation"
          data-testid="cards-draw-button"
          :disabled="game.isAnimating.value"
          :aria-busy="game.isAnimating.value ? 'true' : 'false'"
          @click="onDraw"
        >
          {{ game.isAnimating.value ? 'Đang lật…' : 'Bốc lá tiếp' }}
        </button>

        <button
          type="button"
          class="btn-tactile btn-tactile-secondary min-h-11 w-full touch-manipulation"
          data-testid="cards-reshuffle-button"
          :disabled="game.isAnimating.value"
          @click="game.reshuffle()"
        >
          Xáo lại bộ bài
        </button>
      </div>

      <p class="text-center text-xs text-ink-muted" data-testid="cards-hint">
        Vuốt trái hoặc phải trên lá bài, hoặc bấm Bốc lá tiếp.
      </p>

      <p class="sr-only" aria-live="polite" data-testid="cards-live-region">
        {{ liveAnnouncement }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useGameFeedback } from '@/composables/useGameFeedback'
import { usePrefersReducedMotion } from '@/composables/usePrefersReducedMotion'
import CardStack from './components/CardStack.vue'
import { DECK_LABELS, resolveFlipDurationMs, TRUTH_DIFFICULTY_LABELS } from './config'
import { useCardsGame } from './composables/useCardsGame'
import { buildStatusAnnouncement } from './presentation'
import type { DeckType, TruthDifficulty } from './types'

const feedback = useGameFeedback()
const prefersReducedMotion = usePrefersReducedMotion()

const deckOptions: Array<{ id: DeckType; label: string }> = [
  { id: 'truth', label: DECK_LABELS.truth },
  { id: 'dare', label: DECK_LABELS.dare },
  { id: 'drinking', label: DECK_LABELS.drinking },
]

const truthOptions: Array<{ id: TruthDifficulty; label: string }> = [
  { id: 'light', label: TRUTH_DIFFICULTY_LABELS.light },
  { id: 'medium', label: TRUTH_DIFFICULTY_LABELS.medium },
  { id: 'spicy', label: TRUTH_DIFFICULTY_LABELS.spicy },
]

const game = useCardsGame({
  feedback: {
    playClick: () => feedback.playClick(),
    vibrateLight: () => feedback.vibrateLight(),
  },
  prefersReducedMotion,
  primeAudio: () => feedback.primeAudio(),
})

const flipDurationMs = computed(() => resolveFlipDurationMs(prefersReducedMotion.value))

const liveAnnouncement = computed(() =>
  buildStatusAnnouncement(
    game.currentCard.value,
    game.remaining.value,
    game.cycleNumber.value,
    game.isRevealed.value,
  ),
)

async function onDraw(): Promise<void> {
  await game.draw()
}

onBeforeUnmount(() => {
  game.dispose()
})
</script>

<style scoped>
.cards-view {
  max-width: 100vw;
}
</style>
