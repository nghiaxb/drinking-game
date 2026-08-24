<template>
  <section class="game-surface py-2" data-testid="game-placeholder">
    <h1 class="font-display text-2xl font-semibold text-ink">{{ title }}</h1>
    <p class="mt-2 text-sm text-ink-muted">Game placeholder — logic arrives in a later task.</p>
    <p class="mt-1 text-xs text-ink-muted">Route: {{ routePath }}</p>
  </section>
</template>

<script setup lang="ts">
import type { GameRouteId } from '@/router/routePaths'
import { GAME_ROUTE_PATHS } from '@/router/routePaths'

const props = defineProps<{
  gameId: GameRouteId
  title: string
}>()

const routePath = GAME_ROUTE_PATHS[props.gameId]
</script>
