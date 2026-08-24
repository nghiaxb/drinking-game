<template>
  <div data-testid="app-root" class="app-root">
    <AppShell />
  </div>
</template>

<script setup lang="ts">
import type { UseHeadInput } from '@unhead/vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import AppShell from '@/app/AppShell.vue'
import { getSiteUrl } from '@/config/site'
import { getRouteByPath } from '@/router/routes'
import { buildJsonLd, buildRouteHeadInput } from '@/seo/meta'

const route = useRoute()

function withNoIndexMeta(head: UseHeadInput, noIndex: boolean): UseHeadInput {
  if (!noIndex || typeof head !== 'object' || head === null) {
    return head
  }

  const currentMeta = 'meta' in head && Array.isArray(head.meta) ? head.meta : []
  return {
    ...head,
    meta: [...currentMeta, { name: 'robots', content: 'noindex, nofollow' }],
  }
}

useHead(() => {
  const routeDef = getRouteByPath(route.path)
  if (!routeDef?.seo) {
    return {}
  }

  const siteUrl = getSiteUrl()
  const resolvedPath = routeDef.name === 'not-found' ? route.path : routeDef.path
  const resolvedRoute = { ...routeDef, path: resolvedPath }
  const headInput = withNoIndexMeta(buildRouteHeadInput(resolvedRoute, siteUrl), Boolean(routeDef.noIndex))

  return {
    htmlAttrs: { lang: 'vi' },
    ...headInput,
    script: routeDef.noIndex
      ? []
      : [
          {
            type: 'application/ld+json',
            key: 'route-json-ld',
            innerHTML: JSON.stringify(buildJsonLd(resolvedRoute, siteUrl)),
          },
        ],
  }
})
</script>
