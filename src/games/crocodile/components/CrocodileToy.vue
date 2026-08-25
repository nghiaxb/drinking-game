<template>
  <div
    class="crocodile-toy crocodile-toy--layout-responsive mx-auto w-full max-w-(--crocodile-toy-max)"
    data-testid="crocodile-toy"
    :class="{ 'crocodile-toy--bitten': jawClosed }"
    :data-layout-wide-max-px="String(CROCODILE_LAYOUT_WIDE.toyMaxWidthPx)"
    :data-layout-wide-content-px="String(wideContentWidthPx)"
    :data-layout-narrow-content-px="String(narrowContentWidthPx)"
  >
    <div class="crocodile-ground-shadow" aria-hidden="true" />

    <div
      class="crocodile-jaw crocodile-jaw--lower crocodile-jaw--pass-hits"
      data-testid="crocodile-jaw-lower"
    >
      <img
        class="crocodile-layer crocodile-layer--base"
        :src="BASE_ASSET"
        alt=""
        :draggable="false"
        data-testid="crocodile-base-asset"
      />

      <!--
        The photographed plate has its own sockets inpainted away at build time, so this layer draws
        the twelve the game actually uses, plus their teeth, in one coordinate system - a tooth
        cannot drift out of its hole. `preserveAspectRatio="none"` with a `0 0 100 100` viewBox makes
        x read as a percentage of the toy's width and y of its height.
      -->
      <svg
        class="crocodile-jaw-art"
        data-testid="crocodile-jaw-art"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient :id="id('well')" cx="0.5" cy="0.16" r="0.95">
            <stop offset="0" stop-color="#7e0d12" />
            <stop offset="0.42" stop-color="#4d0309" />
            <stop offset="1" stop-color="#240003" />
          </radialGradient>
          <linearGradient :id="id('lip')" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#c8181c" />
            <stop offset="0.55" stop-color="#a80d12" />
            <stop offset="1" stop-color="#7c0308" />
          </linearGradient>
          <filter :id="id('ao')" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.7" />
          </filter>
        </defs>

        <g
          v-for="slot in toothSlots"
          :key="`socket-${slot.index}`"
          :data-testid="`crocodile-tooth-socket-${slot.index}`"
        >
          <path
            :d="socketRimPaths[slot.index]"
            fill="#2c0004"
            fill-opacity="0.3"
            :filter="`url(#${id('ao')})`"
          />
          <path :d="socketPaths[slot.index]" :fill="`url(#${id('well')})`" />
          <path :d="socketFarRimPaths[slot.index]" fill="#d8443c" fill-opacity="0.35" />
        </g>

        <image
          v-for="slot in toothSlots"
          :key="`tooth-${slot.index}`"
          :data-testid="`crocodile-tooth-shape-${slot.index}`"
          data-tooth-shape
          class="crocodile-tooth-art"
          :class="{ 'crocodile-tooth-art--pressed': pressedSet.has(slot.index) }"
          :href="LOWER_TOOTH_ASSET"
          :x="sprites[slot.index]!.x"
          :y="sprites[slot.index]!.y"
          :width="sprites[slot.index]!.width"
          :height="sprites[slot.index]!.height"
          preserveAspectRatio="none"
        />

        <path
          v-for="slot in toothSlots"
          :key="`lip-${slot.index}`"
          :d="socketNearRimPaths[slot.index]"
          :fill="`url(#${id('lip')})`"
        />
      </svg>

      <div
        class="crocodile-tooth-grid crocodile-tooth-grid--layout crocodile-tooth-grid--lower crocodile-tooth-grid--pass-hits"
        data-testid="crocodile-tooth-grid-lower"
      >
        <button
          v-for="slot in toothSlots"
          :key="`tooth-hit-${slot.index}`"
          type="button"
          class="crocodile-tooth crocodile-tooth--touch crocodile-tooth--lower"
          :class="{ 'crocodile-tooth--pressed': pressedSet.has(slot.index) }"
          :style="toothHitStyle(slot)"
          :data-testid="`crocodile-tooth-${slot.index}`"
          :disabled="disabledSet.has(slot.index)"
          :aria-label="toothLabel(slot.index)"
          :aria-pressed="pressedSet.has(slot.index)"
          @click="emit('press', slot.index)"
        />
      </div>
    </div>

    <div
      class="crocodile-jaw crocodile-jaw--upper crocodile-jaw--hinged crocodile-jaw--pass-hits"
      data-testid="crocodile-jaw-upper"
      :class="{ 'crocodile-jaw--closed-upper': jawClosed }"
    >
      <img
        class="crocodile-layer crocodile-layer--upper"
        :src="UPPER_JAW_ASSET"
        alt=""
        :draggable="false"
        data-testid="crocodile-upper-jaw-asset"
      />

      <div
        class="crocodile-tooth-grid crocodile-tooth-grid--layout crocodile-tooth-grid--upper crocodile-tooth-grid--pass-hits"
        data-testid="crocodile-tooth-grid-upper"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CROCODILE_LAYOUT_NARROW,
  CROCODILE_LAYOUT_WIDE,
  buildSocketRimPath,
  buildSocketPath,
  computeAllToothSlots,
  computeLaneAnchor,
  computeToothHitLanes,
  computeToothSprite,
  computeToyContentWidthPx,
  type CrocodileToothSlot,
} from '../layout'

const BASE_ASSET = '/assets/crocodile/crocodile-base.webp'
const UPPER_JAW_ASSET = '/assets/crocodile/upper-jaw.webp'
const LOWER_TOOTH_ASSET = '/assets/crocodile/lower-tooth.webp'

/** Gradient ids must not collide when more than one toy is mounted in the same document. */
let instanceCount = 0
const instance = (instanceCount += 1)
const id = (name: string) => `crocodile-${name}-${instance}`

const props = defineProps<{
  upperRowCount: number
  lowerRowCount: number
  pressedIndices: readonly number[]
  disabledIndices: readonly number[]
  jawClosed: boolean
}>()

const emit = defineEmits<{
  press: [index: number]
}>()

const narrowContentWidthPx = computeToyContentWidthPx(CROCODILE_LAYOUT_NARROW)
const wideContentWidthPx = computeToyContentWidthPx(CROCODILE_LAYOUT_WIDE)
const toothSlots = computeAllToothSlots()
const hitLanes = new Map(computeToothHitLanes(toothSlots).map((lane) => [lane.index, lane]))

const pressedSet = computed(() => new Set(props.pressedIndices))
const disabledSet = computed(() => new Set(props.disabledIndices))

/** A pressed tooth is the same crown pushed down into the same hole, not a different shape. */
const PRESSED_HEIGHT_SCALE = 0.34

const socketPaths = computed(() => toothSlots.map((slot) => buildSocketPath(slot)))
/** Occlusion ring in the gum around each hole. */
const socketRimPaths = computed(() => toothSlots.map((slot) => buildSocketPath(slot, 1.2)))
/** The hole's far wall faces the light, so it reads brighter than the well behind the tooth. */
const socketFarRimPaths = computed(() =>
  toothSlots.map((slot) => buildSocketRimPath(slot, 0.62, 1, 'far')),
)
/** A thin near lip over the crown's base, which also hides the sprite's cut-off root. */
const socketNearRimPaths = computed(() =>
  toothSlots.map((slot) => buildSocketRimPath(slot, 0.8, 1.08, 'near')),
)
const sprites = computed(() =>
  toothSlots.map((slot) =>
    computeToothSprite(slot, pressedSet.value.has(slot.index) ? PRESSED_HEIGHT_SCALE : 1),
  ),
)

function toothHitStyle(slot: CrocodileToothSlot): Record<string, string> {
  const lane = hitLanes.get(slot.index)
  const anchor = computeLaneAnchor(slot)

  return {
    '--tooth-lane-x': `${lane?.offsetXCqw ?? -9}cqw`,
    '--tooth-lane-y': `${lane?.offsetYCqw ?? -9}cqw`,
    '--tooth-lane-w': `${lane?.widthCqw ?? 18}cqw`,
    '--tooth-lane-h': `${lane?.heightCqw ?? 18}cqw`,
    '--tooth-lane-clip': lane?.clipPath ?? 'none',
    left: `${anchor.xPercent}%`,
    top: `${anchor.yPercent}%`,
  }
}

function toothLabel(index: number): string {
  return `Hàm dưới, răng ${index + 1}`
}
</script>

<style scoped>
.crocodile-toy--layout-responsive {
  --crocodile-toy-max: 20rem;
  --crocodile-jaw-close-y: 32%;
  --crocodile-tooth-hit: 2.75rem;
  position: relative;
  container-type: inline-size;
  aspect-ratio: 360 / 420;
  overflow: visible;
  isolation: isolate;
}

@media (min-width: 375px) {
  .crocodile-toy--layout-responsive {
    --crocodile-toy-max: 24rem;
  }
}

.crocodile-ground-shadow {
  position: absolute;
  z-index: -1;
  right: 9%;
  bottom: 0.5%;
  left: 9%;
  height: 7%;
  border-radius: 50%;
  background: rgb(32 27 20 / 24%);
  filter: blur(0.65rem);
  transform: scaleY(0.55);
  pointer-events: none;
}

.crocodile-jaw {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.crocodile-jaw--pass-hits,
.crocodile-tooth-grid--pass-hits {
  pointer-events: none;
}

.crocodile-jaw--lower {
  z-index: 2;
}

.crocodile-jaw--upper {
  z-index: 4;
}

.crocodile-layer {
  position: absolute;
  left: 50%;
  display: block;
  width: 100%;
  max-width: none;
  height: auto;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
}

.crocodile-layer--base {
  bottom: 0;
}

.crocodile-toy--bitten .crocodile-layer--base {
  animation: base-occlusion 0.36s linear 0.06s forwards;
}

.crocodile-layer--upper {
  top: 0;
}

.crocodile-jaw-art {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.crocodile-toy--bitten .crocodile-jaw-art {
  animation: base-occlusion 0.36s linear 0.06s forwards;
}

.crocodile-tooth-art {
  transition: opacity 0.14s linear;
}

.crocodile-tooth-art--pressed {
  opacity: 0.9;
}

.crocodile-jaw--hinged {
  transform-origin: 50% 54.5%;
  will-change: transform;
}

.crocodile-tooth-grid {
  position: absolute;
  inset: 0;
  z-index: 5;
}

.crocodile-tooth--touch {
  position: absolute;
  width: var(--crocodile-tooth-hit);
  height: var(--crocodile-tooth-hit);
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: none;
  cursor: pointer;
  transform: translate(-50%, -50%);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/**
 * One wedge per tooth, tiling the jaw arc exactly: sized in cqw (toy percentages) so the lanes
 * keep following the drawn sockets at every toy width, and clipped to the seams it shares with
 * its neighbours so no tap can ever resolve to the wrong tooth.
 */
.crocodile-tooth--touch::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--tooth-lane-w, 18cqw);
  height: var(--tooth-lane-h, 18cqw);
  margin-top: var(--tooth-lane-y, -9cqw);
  margin-left: var(--tooth-lane-x, -9cqw);
  clip-path: var(--tooth-lane-clip, none);
  content: '';
  pointer-events: auto;
}

.crocodile-tooth--touch:disabled {
  cursor: default;
}

/** A single dark ring vanished against the dark gum, so pair a bright ring with a dark halo. */
.crocodile-tooth--touch:focus-visible {
  border-radius: 0.8rem;
  outline: 3px solid #ffe08a;
  outline-offset: 1px;
  box-shadow: 0 0 0 6px rgb(23 59 42 / 88%);
}

.crocodile-toy--bitten .crocodile-jaw--closed-upper {
  z-index: 7;
  transform: translateY(var(--crocodile-jaw-close-y));
  animation: jaw-chomp 0.36s linear 0.06s forwards;
}

.crocodile-toy--bitten {
  animation: toy-impact 0.2s linear 0.25s;
}

@keyframes jaw-chomp {
  0% {
    transform: translateY(0) rotate(0deg) scaleY(1);
  }

  16% {
    transform: translateY(-1.2%) rotate(-0.55deg) scaleX(1.006);
  }

  26% {
    transform: translateY(-1.2%) rotate(-0.55deg) scaleX(1.006);
  }

  54% {
    transform: translateY(calc(var(--crocodile-jaw-close-y) + 0.4rem)) rotate(1deg) scaleY(0.985);
  }

  68% {
    transform: translateY(calc(var(--crocodile-jaw-close-y) - 0.16rem)) rotate(-0.3deg);
  }

  80% {
    transform: translateY(calc(var(--crocodile-jaw-close-y) + 0.06rem)) rotate(0.12deg);
  }

  100% {
    transform: translateY(var(--crocodile-jaw-close-y)) rotate(0deg);
  }
}

@keyframes base-occlusion {
  0%,
  26% {
    clip-path: inset(0);
  }

  42%,
  100% {
    clip-path: inset(15% 0 0);
  }
}

@keyframes toy-impact {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  22% {
    transform: translate(-2px, 1px) rotate(-0.45deg);
  }

  44% {
    transform: translate(2px, -1px) rotate(0.45deg);
  }

  66% {
    transform: translate(-1px, 0) rotate(-0.2deg);
  }

  82% {
    transform: translate(1px, 0) rotate(0.15deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .crocodile-toy--bitten .crocodile-jaw--closed-upper {
    animation: none;
    transform: translateY(var(--crocodile-jaw-close-y));
  }

  .crocodile-toy--bitten {
    animation: none;
  }

  .crocodile-toy--bitten .crocodile-layer--base,
  .crocodile-toy--bitten .crocodile-jaw-art {
    animation: none;
    clip-path: inset(15% 0 0);
  }

  .crocodile-tooth-art {
    transition: none;
  }
}
</style>
