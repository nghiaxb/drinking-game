<template>
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
      class="mine-cell aspect-square min-h-[var(--mine-cell-min)] rounded-xl border-2 font-display text-lg font-bold shadow-tactile transition-[transform,opacity,background-color,border-color] duration-200"
      :class="cellClass(index)"
      :data-testid="`mine-cell-${index}`"
      :disabled="disabledSet.has(index)"
      :aria-label="cellLabel(index)"
      :aria-pressed="revealedSet.has(index)"
      @click="emit('press', index)"
    >
      <span v-if="showMine(index)" aria-hidden="true">💣</span>
      <span v-else-if="revealedSet.has(index)" aria-hidden="true">✓</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const gridLabel = computed(() => `Lưới mìn ${props.gridSize} nhân ${props.gridSize}`)

function showMine(index: number): boolean {
  if (!props.exploded) {
    return false
  }
  return mineSet.value.has(index)
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
    'border-border bg-surface-elevated text-ink-muted hover:bg-surface-muted':
      !revealed && !props.exploded,
    'border-teal bg-teal-soft text-teal': revealed && !isMine,
    'border-accent bg-accent-soft text-accent': props.exploded && isMine && !isHitMine,
    'border-accent bg-accent text-white scale-110 opacity-100 mine-cell--explosion':
      isHitMine,
    'opacity-60': props.exploded && !isMine && !revealed,
  }
}

function cellLabel(index: number): string {
  const row = Math.floor(index / props.gridSize) + 1
  const col = (index % props.gridSize) + 1

  if (props.exploded && props.hitMineIndex === index) {
    return `Ô hàng ${row} cột ${col}, trúng mìn`
  }
  if (props.exploded && mineSet.value.has(index)) {
    return `Ô hàng ${row} cột ${col}, mìn`
  }
  if (revealedSet.value.has(index)) {
    return `Ô hàng ${row} cột ${col}, an toàn đã mở`
  }
  if (disabledSet.value.has(index)) {
    return `Ô hàng ${row} cột ${col}, đã khóa`
  }
  return `Ô hàng ${row} cột ${col}, chưa mở`
}
</script>

<style scoped>
.mine-grid {
  --mine-cell-min: max(2.75rem, calc((min(100vw - 2rem, 20rem) - 2rem) / 5));
}

.mine-cell {
  min-width: var(--mine-cell-min);
  min-height: var(--mine-cell-min);
}

.mine-cell--explosion {
  animation: mine-explode 0.45s ease-out;
}

@keyframes mine-explode {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  40% {
    transform: scale(1.12);
    opacity: 1;
  }
  100% {
    transform: scale(1.1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mine-cell--explosion {
    animation: none;
    transform: scale(1.1);
  }
}
</style>
