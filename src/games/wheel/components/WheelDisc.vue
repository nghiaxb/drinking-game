<script setup lang="ts">
import { computed } from 'vue'
import { WHEEL_SEGMENT_COLORS } from '../config'
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
  buildConicGradientStops(props.items, (index) => {
    const color = WHEEL_SEGMENT_COLORS[index % WHEEL_SEGMENT_COLORS.length]
    return color ?? WHEEL_SEGMENT_COLORS[0]
  }),
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
  segmentLayouts.value.map((layout) => {
    const radial = computeRadialLabelLayout(layout.centerDeg)
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
      },
    }
  }),
)

const ariaLabel = computed(() => buildWheelAriaLabel(props.items))
</script>

<template>
  <div
    class="wheel-disc-root relative mx-auto aspect-square w-full max-w-[min(100%,18rem)]"
    data-testid="wheel-disc-root"
    role="img"
    :aria-label="ariaLabel"
  >
    <div class="wheel-pointer" aria-hidden="true" data-testid="wheel-pointer" />

    <div
      class="wheel-disc relative h-full w-full overflow-hidden rounded-full border-4 border-ink shadow-tactile"
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
            class="wheel-label-text absolute left-1/2 max-w-[42%] text-center text-[0.65rem] font-semibold leading-tight text-white drop-shadow-sm"
            :style="node.textStyle"
          >
            {{ node.label }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.wheel-pointer {
  position: absolute;
  top: -0.35rem;
  left: 50%;
  z-index: 2;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-left: 0.65rem solid transparent;
  border-right: 0.65rem solid transparent;
  border-top: 1.1rem solid var(--color-accent);
  filter: drop-shadow(0 2px 0 color-mix(in srgb, var(--color-ink) 20%, transparent));
}

.wheel-disc {
  will-change: transform;
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
