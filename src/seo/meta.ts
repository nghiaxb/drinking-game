import type { ResolvableLink, ResolvableMeta, UseHeadInput } from '@unhead/vue'
import { buildCanonicalUrl } from '@/config/site'
import type { AppRouteDefinition } from '@/router/routes'

export interface JsonLdBase {
  '@context': 'https://schema.org'
  '@type': 'WebApplication' | 'VideoGame'
  name: string
  description: string
  url: string
  image: string
  applicationCategory: string
  operatingSystem: string
}

export interface RouteHeadMetaTag {
  name?: string
  property?: string
  content: string
}

export interface RouteHeadLinkTag {
  rel: 'canonical'
  href: string
}

export interface RouteHeadPayload {
  title: string
  meta: RouteHeadMetaTag[]
  link: RouteHeadLinkTag[]
}

export function resolveAbsoluteAssetUrl(path: string, siteUrl: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildRouteHeadInput(route: AppRouteDefinition, siteUrl: string): UseHeadInput {
  if (!route.seo) {
    return { title: 'Drinking Games' }
  }

  const canonical = buildCanonicalUrl(route.path, siteUrl)
  const ogImage = resolveAbsoluteAssetUrl(route.seo.ogImage, siteUrl)

  const meta: ResolvableMeta[] = [
    { name: 'description', content: route.seo.description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: route.seo.ogTitle },
    { property: 'og:description', content: route.seo.ogDescription },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: ogImage },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: route.seo.ogTitle },
    { name: 'twitter:description', content: route.seo.ogDescription },
    { name: 'twitter:image', content: ogImage },
  ]

  const link: ResolvableLink[] = [{ rel: 'canonical', href: canonical }]

  return {
    title: route.seo.title,
    meta,
    link,
  }
}

/** Plain payload mirror for unit tests and assertions. */
export function buildRouteHead(route: AppRouteDefinition, siteUrl: string): RouteHeadPayload {
  if (!route.seo) {
    return { title: 'Drinking Games', meta: [], link: [] }
  }

  const canonical = buildCanonicalUrl(route.path, siteUrl)
  const ogImage = resolveAbsoluteAssetUrl(route.seo.ogImage, siteUrl)

  return {
    title: route.seo.title,
    meta: [
      { name: 'description', content: route.seo.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: route.seo.ogTitle },
      { property: 'og:description', content: route.seo.ogDescription },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: ogImage },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: route.seo.ogTitle },
      { name: 'twitter:description', content: route.seo.ogDescription },
      { name: 'twitter:image', content: ogImage },
    ],
    link: [{ rel: 'canonical', href: canonical }],
  }
}

export function buildJsonLd(route: AppRouteDefinition, siteUrl: string): JsonLdBase {
  if (!route.seo) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Drinking Games',
      description: 'Drinking Games',
      url: buildCanonicalUrl('/', siteUrl),
      image: resolveAbsoluteAssetUrl('/og/og-home.png', siteUrl),
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web, Android, iOS',
    }
  }

  const canonical = buildCanonicalUrl(route.path, siteUrl)
  const image = resolveAbsoluteAssetUrl(route.seo.ogImage, siteUrl)

  return {
    '@context': 'https://schema.org',
    '@type': route.seo.jsonLdType,
    name: route.seo.title,
    description: route.seo.description,
    url: canonical,
    image,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web, Android, iOS',
  }
}
