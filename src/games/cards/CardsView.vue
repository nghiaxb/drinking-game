<template>
  <section
    class="game-surface cards-view flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-none py-1"
    data-testid="cards-view"
    aria-labelledby="cards-heading"
  >
    <header class="shrink-0 text-center">
      <h1 id="cards-heading" class="font-display text-2xl font-semibold text-ink">Bốc bài</h1>
      <p class="mt-0.5 text-sm text-ink-muted">{{ deckTagline }}</p>
    </header>

    <div class="flex min-h-0 flex-1 flex-col items-center gap-2 px-2">
      <div
        class="cards-segmented"
        role="group"
        aria-label="Chọn bộ bài"
        data-testid="cards-deck-selector"
      >
        <button
          v-for="deck in deckOptions"
          :key="deck.id"
          type="button"
          class="cards-segment min-h-11 flex-1"
          :class="{ 'cards-segment--active': game.deckType.value === deck.id }"
          :data-testid="'cards-deck-' + deck.id"
          :aria-pressed="game.deckType.value === deck.id ? 'true' : 'false'"
          :disabled="game.isAnimating.value"
          @click="game.setDeck(deck.id)"
        >
          {{ deck.label }}
        </button>
      </div>

      <div
        v-if="game.deckType.value === 'truth'"
        class="flex flex-wrap justify-center gap-2"
        role="group"
        aria-label="Lọc độ khó Thật"
        data-testid="cards-truth-filters"
      >
        <button
          v-for="difficulty in truthOptions"
          :key="difficulty.id"
          type="button"
          class="cards-chip min-h-11"
          :class="[
            'cards-chip--' + difficulty.id,
            { 'cards-chip--on': game.truthDifficulties.value.includes(difficulty.id) },
          ]"
          :data-testid="'cards-truth-' + difficulty.id"
          :aria-pressed="game.truthDifficulties.value.includes(difficulty.id) ? 'true' : 'false'"
          :disabled="game.isAnimating.value"
          @click="game.toggleDifficulty(difficulty.id)"
        >
          <span class="cards-chip-dot" aria-hidden="true"></span>
          {{ difficulty.label }}
        </button>
      </div>

      <div class="w-full max-w-md" data-testid="cards-counter">
        <div class="flex items-baseline justify-between text-xs font-semibold text-ink-muted">
          <span>Còn {{ game.remaining.value }}/{{ game.totalInPool.value }} lá</span>
          <span>Chu kỳ {{ game.cycleNumber.value }}</span>
        </div>
        <div class="cards-progress" aria-hidden="true">
          <span class="cards-progress-fill" :style="progressStyle"></span>
        </div>
      </div>

      <div class="cards-card-slot w-full flex-1">
        <CardStack
          :card="game.currentCard.value"
          :is-flipped="game.isFlipped.value"
          :locked="game.isAnimating.value"
          :flip-duration-ms="flipDurationMs"
          @draw="onDraw"
        />
      </div>

      <div class="flex w-full max-w-xs shrink-0 flex-col gap-2">
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

      <p class="shrink-0 text-center text-xs text-ink-muted" data-testid="cards-hint">
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

const deckTaglines: Record<DeckType, string> = {
  truth: 'Câu hỏi thật, ba mức độ.',
  dare: 'Thử thách nhanh ngay tại bàn.',
  drinking: 'Thẻ uống theo sáu nhóm luật.',
}

const deckTagline = computed(() => deckTaglines[game.deckType.value])

const progressStyle = computed(() => {
  const total = game.totalInPool.value
  const drawn = total > 0 ? (total - game.remaining.value) / total : 0
  return { transform: 'scaleX(' + drawn + ')' }
})

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

/*
 * The card is sized from this slot's height so it shrinks when the offline toast appears instead of
 * pushing the draw button off screen. It has to be absolutely positioned: a percentage height on a
 * flex item resolves to auto here, because the column's height comes from min-height, not height.
 */
.cards-card-slot {
  position: relative;
  /* Floor the card at a legible size on very short screens and let the section scroll instead. */
  min-height: 15rem;
}

/* One control, three segments: single-choice, so it must not look like the multi-select chips. */
.cards-segmented {
  display: flex;
  width: 100%;
  max-width: 24rem;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  box-shadow: inset 0 2px 4px color-mix(in srgb, var(--color-ink) 8%, transparent);
}

.cards-segment {
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-ink-muted);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;
}

.cards-segment:hover:not(:disabled):not(.cards-segment--active) {
  background: color-mix(in srgb, var(--color-ink) 6%, transparent);
}

.cards-segment--active {
  background: var(--color-accent);
  color: #fff;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--color-accent) 40%, transparent);
}

.cards-segment:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* Tinted with the same colour its cards use, so the filter previews what it lets through. */
.cards-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface-elevated);
  color: var(--color-ink-muted);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.cards-chip-dot {
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid currentcolor;
  border-radius: var(--radius-pill);
  opacity: 0.45;
}

.cards-chip--on {
  border-color: var(--chip-edge);
  background: var(--chip-tint);
  color: var(--chip-edge);
}

.cards-chip--on .cards-chip-dot {
  background: currentcolor;
  opacity: 1;
}

.cards-chip:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.cards-chip--light {
  --chip-tint: #d9eefb;
  --chip-edge: #1b6485;
}

.cards-chip--medium {
  --chip-tint: #ffeccc;
  --chip-edge: #8f4f0a;
}

.cards-chip--spicy {
  --chip-tint: #ffdfe2;
  --chip-edge: #a82b41;
}

.cards-progress {
  overflow: hidden;
  height: 0.3125rem;
  margin-top: 0.3rem;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
}

.cards-progress-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--color-teal);
  transform-origin: left center;
  transition: transform 0.28s ease;
}

@media (prefers-reduced-motion: reduce) {
  .cards-progress-fill {
    transition: none;
  }
}
</style>
