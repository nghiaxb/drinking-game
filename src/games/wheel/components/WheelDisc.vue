<script setup lang="ts">
import { computed } from 'vue'
import { wheelSegmentStyleAt } from '../config'
import {
  buildConicGradientStops,
  buildWheelAriaLabel,
  computeRadialLabelLayout,
  computeSegmentLayouts,
} from '../logic/wheelGame'
import type { WheelItem } from '../types'

const props = defineProps<{
  items: readonly WheelItem[]
  rotation: number
  spinning: boolean
  spinDurationMs: number
}>()

const segmentLayouts = computed(() => computeSegmentLayouts(props.items))

const gradientStops = computed(() =>
  buildConicGradientStops(props.items, (index) => wheelSegmentStyleAt(index).fill),
)

const wheelTransition = computed(() => {
  if (!props.spinning || props.spinDurationMs <= 0) {
    return 'none'
  }
  return `transform ${props.spinDurationMs}ms cubic-bezier(0.15, 0.85, 0.25, 1)`
})

const wheelStyle = computed(() => ({
  background: `conic-gradient(${gradientStops.value})`,
  transform: `rotate(${props.rotation}deg)`,
  transition: wheelTransition.value,
}))

const labelNodes = computed(() =>
  segmentLayouts.value.map((layout, index) => {
    const radial = computeRadialLabelLayout(layout.centerDeg)
    const style = wheelSegmentStyleAt(index)
    const onDark = style.text === '#ffffff'

    return {
      id: layout.id,
      label: layout.label,
      centerDeg: layout.centerDeg,
      containerStyle: {
        transform: radial.containerTransform,
      },
      textStyle: {
        top: `${radial.topPercent}%`,
        transform: radial.textTransform,
        color: style.text,
        // Only white text needs lifting off its wedge; a shadow under dark text muddies it.
        textShadow: onDark ? '0 1px 2px rgb(0 0 0 / 35%)' : 'none',
      },
    }
  }),
)

const hasSegments = computed(() => segmentLayouts.value.length > 0)

const ariaLabel = computed(() => buildWheelAriaLabel(props.items))
</script>

<template>
  <div
    class="wheel-disc-root relative mx-auto aspect-square w-full max-w-[min(100%,18rem)]"
    data-testid="wheel-disc-root"
    role="img"
    :aria-label="ariaLabel"
  >
    <div class="wheel-pointer-housing" aria-hidden="true">
      <div class="wheel-pointer" data-testid="wheel-pointer" />
    </div>

    <div
      class="wheel-disc relative h-full w-full overflow-hidden rounded-full"
      data-testid="wheel-disc"
      :style="wheelStyle"
    >
      <ul class="wheel-labels absolute inset-0 m-0 list-none p-0">
        <li
          v-for="node in labelNodes"
          :key="node.id"
          class="wheel-label-slot absolute inset-0"
          :data-testid="`wheel-label-${node.id}`"
          :data-center-deg="node.centerDeg"
          :style="node.containerStyle"
        >
          <span
            class="wheel-label-text absolute left-1/2 max-w-[44%] text-center text-[0.66rem] font-bold leading-tight"
            :style="node.textStyle"
          >
            {{ node.label }}
          </span>
        </li>
      </ul>
    </div>

    <!-- Outside the rotating disc, so the hub stays still while the wheel spins. -->
    <div v-if="hasSegments" class="wheel-hub" aria-hidden="true" data-testid="wheel-hub" />
  </div>
</template>

<style scoped>
.wheel-disc {
  /* Warm rim plus a soft inner shade, so the disc reads as a moulded object, not a flat pie. */
  border: 4px solid var(--color-ink);
  box-shadow:
    inset 0 0 0 3px rgb(255 255 255 / 22%),
    inset 0 -14px 26px rgb(0 0 0 / 16%),
    0 6px 0 0 color-mix(in srgb, var(--color-ink) 22%, transparent),
    0 12px 22px color-mix(in srgb, var(--color-ink) 18%, transparent);
  will-change: transform;
}

.wheel-hub {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  width: 21%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border: 4px solid var(--color-ink);
  border-radius: var(--radius-pill);
  background: radial-gradient(circle at 35% 30%, var(--color-surface-elevated), #e6d7c2);
  box-shadow:
    inset 0 -3px 6px rgb(0 0 0 / 14%),
    0 3px 8px color-mix(in srgb, var(--color-ink) 26%, transparent);
}

/* A seated housing rather than a floating triangle: it reads as the thing that reads the wheel. */
.wheel-pointer-housing {
  position: absolute;
  top: -0.9rem;
  left: 50%;
  z-index: 4;
  display: grid;
  place-items: start center;
  width: 2.5rem;
  height: 2rem;
  padding-top: 0.28rem;
  transform: translateX(-50%);
  border: 3px solid var(--color-ink);
  border-radius: 0.9rem 0.9rem 1.4rem 1.4rem;
  background: var(--color-surface-elevated);
  box-shadow: 0 3px 0 0 color-mix(in srgb, var(--color-ink) 22%, transparent);
}

.wheel-pointer {
  width: 0;
  height: 0;
  border-top: 1.15rem solid var(--color-accent);
  border-right: 0.62rem solid transparent;
  border-left: 0.62rem solid transparent;
}

.wheel-label-slot {
  pointer-events: none;
  transform-origin: center center;
}

.wheel-label-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
