/**
 * Workbox navigation strategy for Drinking Games PWA.
 *
 * Online (static hosting): nested SSG output (`dirStyle: 'nested'`) maps extensionless
 * URLs to prerender HTML, e.g. `/games/crocodile` → `dist/games/crocodile/index.html`.
 *
 * Offline (service worker): `navigateFallback` serves the SPA shell (`/index.html`).
 * Vue Router resolves the in-app route after hydration. Deep-link offline navigations
 * therefore use the shell rather than route-specific HTML — intentional, no dynamic
 * per-route Workbox fallback.
 */
export const WORKBOX_NAVIGATE_FALLBACK = '/index.html'

/** Skip fallback for static assets and API routes. */
export const WORKBOX_NAVIGATE_FALLBACK_DENYLIST: RegExp[] = [/^\/api\//, /\.[a-zA-Z0-9]+$/]
