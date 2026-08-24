<script setup lang="ts">
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const prefersReducedMotion = usePrefersReducedMotion()

defineExpose({ prefersReducedMotion })
</script>

<template>
  <div
    data-testid="prefer-motion-harness"
    :data-reduced="String(prefersReducedMotion)"
  />
</template>
