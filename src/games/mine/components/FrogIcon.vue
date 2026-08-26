<template>
  <svg
    class="frog"
    :class="`frog--${variant}`"
    viewBox="0 0 48 48"
    role="img"
    :aria-label="label"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Shirt collar: reads as a character rather than a loose animal head. -->
    <path class="frog-collar" d="M9 41.5h30a3 3 0 0 1 3 3V48H6v-3.5a3 3 0 0 1 3-3Z" />

    <path
      class="frog-head"
      d="M24 9c11.2 0 19 6.6 19 17.2C43 36.6 35.4 42 24 42S5 36.6 5 26.2C5 15.6 12.8 9 24 9Z"
    />

    <circle class="frog-eye-white" cx="16.4" cy="19.4" r="7.6" />
    <circle class="frog-eye-white" cx="31.6" cy="19.4" r="7.6" />

    <template v-if="variant === 'idle'">
      <!-- Pupils low in the eye: the flat, unimpressed look the meme is built on. -->
      <circle class="frog-pupil" cx="16.4" cy="22.2" r="2.9" />
      <circle class="frog-pupil" cx="31.6" cy="22.2" r="2.9" />
      <path class="frog-lid" d="M8.8 19.4a7.6 7.6 0 0 1 15.2 0Z" />
      <path class="frog-lid" d="M24 19.4a7.6 7.6 0 0 1 15.2 0Z" />
      <path class="frog-lid-line" d="M9.4 19.4h14M24.6 19.4h14" />
    </template>

    <template v-else>
      <circle class="frog-pupil" cx="16.4" cy="19.8" r="3.9" />
      <circle class="frog-pupil" cx="31.6" cy="19.8" r="3.9" />
      <circle class="frog-glint" cx="14.9" cy="18.1" r="1.25" />
      <circle class="frog-glint" cx="30.1" cy="18.1" r="1.25" />
      <path class="frog-lid" d="M9.6 16.2a7.6 7.6 0 0 1 13.6 0Z" />
      <path class="frog-lid" d="M24.8 16.2a7.6 7.6 0 0 1 13.6 0Z" />
      <!-- Tears run past the mouth and off the chin: the whole point of the crying variant. -->
      <path class="frog-tear" d="M13.4 26.6q-1.6 3.6 0 7.2t0 6.6" />
      <path class="frog-tear" d="M19.2 26.9q-1.6 3.3 0 6.6t0 6" />
      <path class="frog-tear" d="M28.8 26.9q1.6 3.3 0 6.6t0 6" />
      <path class="frog-tear" d="M34.6 26.6q1.6 3.6 0 7.2t0 6.6" />
    </template>

    <rect class="frog-mouth" x="8.5" y="30.4" width="31" height="5.6" rx="2.8" />
    <path
      v-if="variant === 'crying'"
      class="frog-mouth-frown"
      d="M15 34.6q9 3.4 18 0"
      fill="none"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ variant?: 'idle' | 'crying' }>(), {
  variant: 'idle',
})

const label = computed(() => (props.variant === 'crying' ? 'Ếch khóc' : 'Ếch'))
</script>

<style scoped>
.frog {
  display: block;
  width: 100%;
  height: 100%;
}

.frog-head {
  fill: #74b04a;
  stroke: #2f5c22;
  stroke-width: 1.6;
}

.frog-collar {
  fill: #4a7fd4;
  stroke: #2b4f8c;
  stroke-width: 1.4;
}

.frog-eye-white {
  fill: #fff;
  stroke: #2f5c22;
  stroke-width: 1.5;
}

.frog-pupil {
  fill: #1c2416;
}

.frog-glint {
  fill: #fff;
}

/* The heavy hooded lid is what makes the face read as the meme rather than a cartoon frog. */
.frog-lid {
  fill: #74b04a;
  stroke: #2f5c22;
  stroke-width: 1.5;
}

.frog-lid-line {
  stroke: #2f5c22;
  stroke-width: 1.5;
  stroke-linecap: round;
  fill: none;
}

.frog-mouth {
  fill: #b5673c;
  stroke: #2f5c22;
  stroke-width: 1.5;
}

.frog-mouth-frown {
  stroke: #7d4426;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.frog-tear {
  fill: none;
  stroke: #6fc7ea;
  stroke-width: 2.6;
  stroke-linecap: round;
}
</style>
