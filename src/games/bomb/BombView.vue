<template>
  <section
    class="game-surface bomb-view flex min-h-0 flex-1 flex-col gap-3 py-1"
    data-testid="bomb-view"
    aria-labelledby="bomb-heading"
  >
    <header class="shrink-0 text-center">
      <h1 id="bomb-heading" class="font-display text-2xl font-semibold text-ink">Bom hẹn giờ</h1>
      <p class="mt-0.5 text-sm text-ink-muted">
        Trả lời chủ đề rồi chuyền máy — nổ trên tay ai thì người đó uống.
      </p>
    </header>

    <div class="flex flex-1 flex-col items-center justify-center gap-4">
      <div v-if="game.phase.value === 'idle'" class="bomb-panel" data-testid="bomb-intro">
        <IconBomb class="bomb-panel__icon" :size="56" stroke="1.6" aria-hidden="true" />
        <ol class="bomb-rules">
          <li>Cả bàn nhận một chủ đề chung.</li>
          <li>Người giữ máy nói một đáp án rồi bấm chuyền.</li>
          <li>Không ai biết bom nổ lúc nào.</li>
        </ol>
        <p class="bomb-panel__note">{{ game.topicCount.value }} chủ đề</p>
      </div>

      <div v-else class="bomb-stage" data-testid="bomb-stage">
        <p class="bomb-category" data-testid="bomb-category">{{ categoryLabel }}</p>
        <p class="bomb-topic" data-testid="bomb-topic">{{ topicText }}</p>

        <div
          class="bomb-core"
          :class="{ 'bomb-core--burning': isBurning, 'bomb-core--blown': isExploded }"
          :style="coreStyle"
          aria-hidden="true"
        >
          <span v-if="isExploded" class="bomb-core__blast">💥</span>
          <IconBomb v-else :size="48" stroke="1.8" />
          <span class="bomb-core__mask">{{ isExploded ? 'NỔ!' : '????' }}</span>
        </div>

        <p v-if="isExploded" class="bomb-result" data-testid="bomb-result" role="alert">
          Bom nổ trên tay bạn
          <span class="bomb-result__drink">🍺 UỐNG!</span>
        </p>
        <p v-else class="bomb-passes" data-testid="bomb-passes">
          Đã chuyền {{ game.passes.value }} lượt
        </p>
      </div>

      <!-- Hidden while the fuse burns: the running screen is topic, bomb and the pass button only. -->
      <fieldset v-if="!isBurning" class="bomb-fuse" data-testid="bomb-fuse">
        <legend class="bomb-fuse__legend">
          Bom nổ trong <strong>{{ minSeconds }}–{{ maxSeconds }} giây</strong>
        </legend>

        <label class="bomb-fuse__row">
          <span class="bomb-fuse__label">Ngắn nhất</span>
          <input
            class="bomb-fuse__slider"
            type="range"
            :min="bounds.minMs"
            :max="bounds.maxMs"
            :step="bounds.stepMs"
            :value="game.fuseRange.value.minMs"
            data-testid="bomb-fuse-min"
            @input="onMinInput"
            @change="onRangeCommit"
          />
          <output class="bomb-fuse__value">{{ minSeconds }}s</output>
        </label>

        <label class="bomb-fuse__row">
          <span class="bomb-fuse__label">Dài nhất</span>
          <input
            class="bomb-fuse__slider"
            type="range"
            :min="bounds.minMs"
            :max="bounds.maxMs"
            :step="bounds.stepMs"
            :value="game.fuseRange.value.maxMs"
            data-testid="bomb-fuse-max"
            @input="onMaxInput"
            @change="onRangeCommit"
          />
          <output class="bomb-fuse__value">{{ maxSeconds }}s</output>
        </label>
      </fieldset>
    </div>

    <div class="shrink-0">
      <button
        v-if="game.phase.value === 'idle'"
        type="button"
        class="btn-tactile btn-tactile-primary bomb-action"
        data-testid="bomb-start"
        @click="onStart"
      >
        <IconPlayerPlay :size="20" stroke="2" aria-hidden="true" />
        Bắt đầu
      </button>

      <button
        v-else-if="game.phase.value === 'running'"
        type="button"
        class="btn-tactile btn-tactile-primary bomb-action bomb-action--pass"
        data-testid="bomb-pass"
        @click="game.pass()"
      >
        Đã trả lời — chuyền
        <IconArrowRight :size="20" stroke="2" aria-hidden="true" />
      </button>

      <button
        v-else
        type="button"
        class="btn-tactile btn-tactile-primary bomb-action"
        data-testid="bomb-replay"
        :disabled="!game.canReplay.value"
        @click="onStart"
      >
        <IconRefresh :size="20" stroke="2" aria-hidden="true" />
        Chơi lại
      </button>
    </div>

    <p class="sr-only" aria-live="polite" data-testid="bomb-status-live">{{ statusText }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { IconArrowRight, IconBomb, IconPlayerPlay, IconRefresh } from '@tabler/icons-vue'
import { useGameFeedback } from '@/composables/useGameFeedback'
import { storage } from '@/services/storage'
import { BOMB_CATEGORY_LABELS, BOMB_FUSE_BOUNDS } from './config'
import { useBombGame } from './composables/useBombGame'

const feedback = useGameFeedback()
const bounds = BOMB_FUSE_BOUNDS

const game = useBombGame({
  storage,
  feedback: {
    playClick: () => feedback.playClick(),
    playTick: () => feedback.playTick(),
    playExplosion: () => feedback.playExplosion(),
    vibrateLight: () => feedback.vibrateLight(),
    vibrateHeavy: () => feedback.vibrateHeavy(),
  },
  primeAudio: () => feedback.primeAudio(),
})

const isBurning = computed(() => game.phase.value === 'running')
const isExploded = computed(() => game.phase.value === 'exploded')
const topicText = computed(() => game.currentTopic.value?.text ?? '')
const categoryLabel = computed(() => {
  const category = game.currentTopic.value?.category
  return category ? BOMB_CATEGORY_LABELS[category] : ''
})

/*
 * Drives the pulse off the same elapsed-derived pace as the tick sound, so what the table sees and
 * what it hears agree. It carries no information about the fuse — see tickIntervalAt.
 */
const coreStyle = computed(() => ({
  '--bomb-pulse-ms': `${game.tickIntervalMs.value}ms`,
}))

const minSeconds = computed(() => Math.round(game.fuseRange.value.minMs / 1000))
const maxSeconds = computed(() => Math.round(game.fuseRange.value.maxMs / 1000))

const statusText = computed(() => {
  if (isExploded.value) {
    return `Bom nổ! Người đang giữ máy uống. Cả bàn đã chuyền ${game.passes.value} lượt.`
  }
  if (isBurning.value) {
    return `Chủ đề: ${topicText.value}. Đã chuyền ${game.passes.value} lượt.`
  }
  return `Bấm bắt đầu để nhận chủ đề. Có ${game.topicCount.value} chủ đề. Bom nổ trong ${minSeconds.value} đến ${maxSeconds.value} giây.`
})

function sliderValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}

function onMinInput(event: Event): void {
  game.setMin(sliderValue(event))
}

function onMaxInput(event: Event): void {
  game.setMax(sliderValue(event))
}

/** Saved on release, not on every step of the drag — see saveFuseRange. */
function onRangeCommit(): void {
  void game.saveFuseRange()
}

function onStart(): void {
  game.start()
}

onMounted(() => {
  void game.load()
})

onUnmounted(() => {
  game.dispose()
})
</script>

<style scoped>
.bomb-view {
  overflow-y: auto;
  overscroll-behavior: none;
}

.bomb-panel,
.bomb-stage {
  display: flex;
  width: 100%;
  max-width: 22rem;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 1.25rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-tactile);
  background: var(--color-surface-elevated);
  box-shadow: var(--shadow-tactile);
  text-align: center;
}

.bomb-panel__icon {
  color: var(--color-amber);
}

/* Plain list flow, not flex: a blockified flex item can lose its ::marker, and the numbers are
   the point — they are the order of play. */
.bomb-rules {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--color-ink-muted);
  font-size: 0.9375rem;
  text-align: left;
  list-style: decimal;
}

.bomb-rules li + li {
  margin-top: 0.4rem;
}

.bomb-panel__note {
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}

.bomb-fuse {
  width: 100%;
  max-width: 22rem;
  margin: 0;
  padding: 0.5rem 0.9rem 0.75rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-tactile);
  background: var(--color-surface-elevated);
}

.bomb-fuse__legend {
  padding-inline: 0.4rem;
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
}

.bomb-fuse__legend strong {
  color: var(--color-ink);
  font-weight: 700;
}

.bomb-fuse__row {
  display: grid;
  grid-template-columns: 4.75rem 1fr 2.5rem;
  align-items: center;
  gap: 0.5rem;
}

.bomb-fuse__label {
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}

.bomb-fuse__value {
  color: var(--color-ink);
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

/*
 * pan-y, not the base layer's `auto` for inputs: that exemption is meant for text fields and would
 * hand a range input double-tap zoom back. Blocking pan-x also stops the page scroller from
 * stealing a sideways drag off the thumb, while a vertical swipe still scrolls the page.
 */
.bomb-fuse__slider {
  width: 100%;
  /* Track and thumb are small; the input stays a full touch target around them. */
  height: 2.75rem;
  margin: 0;
  background: transparent;
  touch-action: pan-y;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.bomb-fuse__slider::-webkit-slider-runnable-track {
  height: 0.375rem;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
}

.bomb-fuse__slider::-webkit-slider-thumb {
  width: 1.375rem;
  height: 1.375rem;
  /* Centres a 22px thumb on a 6px track. */
  margin-top: -0.5rem;
  border: 2px solid var(--color-surface-elevated);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  box-shadow: 0 1px 3px color-mix(in srgb, var(--color-ink) 30%, transparent);
  -webkit-appearance: none;
  appearance: none;
}

.bomb-fuse__slider::-moz-range-track {
  height: 0.375rem;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
}

.bomb-fuse__slider::-moz-range-thumb {
  width: 1.375rem;
  height: 1.375rem;
  border: 2px solid var(--color-surface-elevated);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
}

.bomb-category {
  color: var(--color-ink-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.bomb-topic {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-ink);
  text-wrap: balance;
}

.bomb-core {
  display: flex;
  width: 8.5rem;
  height: 8.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  border: 2px solid var(--color-amber);
  border-radius: var(--radius-pill);
  background: var(--color-amber-soft);
  color: color-mix(in srgb, var(--color-amber) 70%, var(--color-ink));
}

.bomb-core--burning {
  animation: bomb-pulse var(--bomb-pulse-ms, 720ms) ease-in-out infinite;
}

.bomb-core--blown {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: color-mix(in srgb, var(--color-accent) 78%, var(--color-ink));
}

.bomb-core__blast {
  font-size: 2.75rem;
  line-height: 1;
}

.bomb-core__mask {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.bomb-passes {
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  font-weight: 600;
}

.bomb-result {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.3rem 0.5rem;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-ink);
}

.bomb-result__drink {
  color: color-mix(in srgb, var(--color-accent) 78%, var(--color-ink));
}

.bomb-action {
  width: 100%;
  /* Tall on purpose: it is pressed by whoever is holding the phone, often in a hurry. */
  min-height: 3.5rem;
  font-size: 1.0625rem;
}

.bomb-action--pass {
  min-height: 4.25rem;
  font-size: 1.125rem;
}

@keyframes bomb-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.06);
  }
}
</style>
