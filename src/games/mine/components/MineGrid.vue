<template>
  <div class="mine-field" :class="{ 'mine-field--exploded': exploded }">
    <div
      class="mine-grid mx-auto grid w-full max-w-[min(100%,20rem)] grid-cols-5 gap-2"
      data-testid="mine-grid"
      role="group"
      :aria-label="gridLabel"
    >
      <button
        v-for="index in cellIndices"
        :key="index"
        type="button"
        class="mine-cell aspect-square min-h-[var(--mine-cell-min)] border-2 transition-[transform,background-color,border-color,box-shadow] duration-200"
        :class="cellClass(index)"
        :data-testid="`mine-cell-${index}`"
        :disabled="disabledSet.has(index)"
        :aria-label="cellLabel(index)"
        :aria-pressed="revealedSet.has(index)"
        @click="emit('press', index)"
      >
        <!-- A cleared cell shows nothing at all: the frogs still on the board are the choice left. -->
        <FrogIcon
          v-if="frogVariant(index)"
          class="mine-cell__frog"
          :variant="frogVariant(index)!"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FrogIcon from './FrogIcon.vue'

const props = defineProps<{
  gridSize: number
  revealedIndices: readonly number[]
  disabledIndices: readonly number[]
  mineIndices: readonly number[]
  hitMineIndex: number | null
  exploded: boolean
}>()

const emit = defineEmits<{
  press: [index: number]
}>()

const cellIndices = computed(() =>
  Array.from({ length: props.gridSize * props.gridSize }, (_, index) => index),
)

const revealedSet = computed(() => new Set(props.revealedIndices))
const disabledSet = computed(() => new Set(props.disabledIndices))
const mineSet = computed(() => new Set(props.mineIndices))

const gridLabel = computed(() => `Lưới ếch ${props.gridSize} nhân ${props.gridSize}`)

/**
 * Two frogs and an absence: still there, crying (the penalty), or cleared away. The crying frog only
 * ever appears after the round ends, so nothing on the board hints at which cell is the penalty.
 */
function frogVariant(index: number): 'idle' | 'crying' | null {
  if (props.exploded && mineSet.value.has(index)) {
    return 'crying'
  }
  if (revealedSet.value.has(index)) {
    return null
  }
  return 'idle'
}

function cellClass(index: number): Record<string, boolean> {
  const revealed = revealedSet.value.has(index)
  const isHitMine = props.hitMineIndex === index
  const isMine = mineSet.value.has(index)

  return {
    'mine-cell--hidden': !revealed && !props.exploded,
    'mine-cell--safe': revealed && !isMine,
    'mine-cell--mine': props.exploded && isMine,
    'mine-cell--exploded': isHitMine,
    'mine-cell--missed': props.exploded && !isMine && !revealed,
  }
}

function cellLabel(index: number): string {
  const row = Math.floor(index / props.gridSize) + 1
  const col = (index % props.gridSize) + 1

  if (props.exploded && props.hitMineIndex === index) {
    return `Ô hàng ${row} cột ${col}, ếch phạt`
  }
  if (props.exploded && mineSet.value.has(index)) {
    return `Ô hàng ${row} cột ${col}, cũng là ếch phạt`
  }
  if (revealedSet.value.has(index)) {
    return `Ô hàng ${row} cột ${col}, đã bắt an toàn`
  }
  if (disabledSet.value.has(index)) {
    return `Ô hàng ${row} cột ${col}, đã khóa`
  }
  return `Ô hàng ${row} cột ${col}, chưa bắt`
}
</script>

<style scoped>
/* A recessed tray, so the frogs read as sitting in a board rather than floating on the page. */
.mine-field {
  margin-inline: auto;
  max-width: min(100%, 22rem);
  padding: 0.6rem;
  border: 2px solid var(--color-border);
  border-radius: 1.35rem;
  background: var(--color-surface-muted);
  box-shadow: inset 0 2px 7px color-mix(in srgb, var(--color-ink) 12%, transparent);
}

.mine-grid {
  --mine-cell-min: max(2.75rem, calc((min(100vw - 2.7rem, 20rem) - 2rem) / 5));
}

.mine-cell {
  display: grid;
  place-items: center;
  min-width: var(--mine-cell-min);
  min-height: var(--mine-cell-min);
  padding: 5%;
  border-radius: var(--radius-pill);
}

.mine-cell__frog {
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Occupied cells are the only raised ones: they are what there is left to pick. */
.mine-cell--hidden {
  border-color: color-mix(in srgb, var(--color-ink) 16%, transparent);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-amber-soft) 32%, var(--color-surface-elevated)),
    color-mix(in srgb, var(--color-amber) 34%, var(--color-surface-elevated))
  );
  box-shadow: var(--shadow-tactile);
}

.mine-cell--hidden:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
}

.mine-cell--hidden:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: var(--shadow-tactile-pressed);
}

/* A caught frog leaves an empty socket, so the board visibly thins out as the round goes on. */
.mine-cell--safe {
  border-color: color-mix(in srgb, var(--color-ink) 10%, transparent);
  background: color-mix(in srgb, var(--color-ink) 7%, var(--color-surface-muted));
  box-shadow: inset 0 2px 5px color-mix(in srgb, var(--color-ink) 16%, transparent);
}

/* Never-pressed frogs survived the round: still frogs, but out of play, so flat and faded. */
.mine-cell--missed {
  border-color: color-mix(in srgb, var(--color-ink) 12%, transparent);
  background: color-mix(in srgb, var(--color-surface-elevated) 78%, var(--color-surface-muted));
  box-shadow: none;
}

.mine-cell--missed .mine-cell__frog {
  opacity: 0.4;
  filter: grayscale(0.8);
}

.mine-cell--mine {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  box-shadow: none;
}

.mine-cell--mine:not(.mine-cell--exploded) .mine-cell__frog {
  opacity: 0.62;
}

.mine-cell--exploded {
  position: relative;
  border-color: color-mix(in srgb, var(--color-accent) 70%, var(--color-ink));
  background: var(--color-accent);
  animation: mine-explode 0.45s ease-out;
}

/* Blast ring drawn outside the tile, so it never widens the grid's layout box. */
.mine-cell--exploded::after {
  content: '';
  position: absolute;
  inset: -0.35rem;
  border: 3px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
  border-radius: var(--radius-pill);
  pointer-events: none;
  animation: mine-blast 0.5s ease-out forwards;
}

@keyframes mine-explode {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1.1);
  }
}

@keyframes mine-blast {
  0% {
    opacity: 0.9;
    transform: scale(0.7);
  }
  100% {
    opacity: 0;
    transform: scale(1.25);
  }
}

@keyframes mine-field-shake {
  10%,
  50% {
    transform: translateX(-3px);
  }
  30%,
  70% {
    transform: translateX(3px);
  }
  100% {
    transform: none;
  }
}

.mine-field--exploded {
  animation: mine-field-shake 0.4s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .mine-cell--exploded {
    animation: none;
    transform: scale(1.1);
  }

  .mine-cell--exploded::after,
  .mine-field--exploded {
    animation: none;
  }

  .mine-cell--exploded::after {
    opacity: 0;
  }
}
</style>
