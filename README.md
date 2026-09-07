# Drinking Games

Bộ sưu tập **5 mini game nhậu offline** trên **một codebase** duy nhất, triển khai Web, PWA, Android và iOS qua Capacitor.

| Game | Route |
|------|-------|
| Răng cá sấu | `/games/crocodile` |
| Mìn | `/games/mine` |
| Vòng quay | `/games/wheel` |
| Kéo cần | `/games/slot` |
| Bốc bài | `/games/cards` |

**Phạm vi tính năng:** client-only cho toàn bộ 5 game — không tài khoản, không đồng bộ đám mây, dữ liệu lưu cục bộ (localStorage / Capacitor Preferences). Âm thanh Web Audio, rung qua Capacitor Haptics trên native.

Ngoại lệ duy nhất là kênh điều khiển ở `/x` (Cloudflare Worker + Durable Object, xem `worker/`). Nó **tắt hoàn toàn** khi `VITE_CHEAT_SOCKET_URL` rỗng hoặc máy chưa cài mã, nên bản mặc định không mở kết nối nào.

---

## Yêu cầu môi trường

| Thành phần | Yêu cầu |
|------------|---------|
| **Node.js** | `>= 22.18.0` (khai báo trong `package.json` `engines`) |
| **npm** | 10+ |
| **Android** | Android Studio, Android SDK, **JDK 21** |
| **iOS** | **macOS + Xcode** — sync project có thể chạy trên Windows; build/run bắt buộc trên macOS |

> **Lưu ý môi trường dev hiện tại:** máy build docs này đang dùng Node **22.12** — `npm run build` vẫn pass nhưng npm cảnh báo `EBADENGINE` vì chưa đạt `>=22.18.0`. Nên nâng Node trước release.

---

## Cài đặt

```bash
npm install
cp .env.example .env
npm run generate:assets
npm run generate:sounds
```

Cài trình duyệt Playwright (bắt buộc trước e2e lần đầu):

```bash
npx playwright install chromium
```

Sau lần build web đầu tiên, đồng bộ native (tùy chọn nếu làm Android/iOS):

```bash
npm run build
npm run cap:sync
npm run generate:cap-assets   # tùy chọn: icon + splash native từ assets/
```

---

## Scripts

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Vite dev server |
| `npm run type-check` | `vue-tsc` strict |
| `npm run lint` | ESLint (flat config) |
| `npm run test:unit` | Vitest (chạy một lần: `-- --run`) |
| `npm run generate:assets` | PNG icon/splash/OG + nguồn Capacitor từ SVG |
| `npm run generate:sounds` | WAV phản hồi game trong `public/sounds/` |
| `npm run generate:static-seo` | `robots.txt` + `sitemap.xml` từ `VITE_SITE_URL` |
| `npm run generate:cap-assets` | Icon + splash Android/iOS từ `assets/` |
| `npm run build` | Type-check, generate assets/SEO/sounds, nested SSG + PWA |
| `npm run preview` | Phục vụ `dist/` (port mặc định Vite preview) |
| `npm run verify:dist` | Kiểm tra prerender lồng nhau, PWA/SEO, bundle audit |
| `npm run audit:build` | Bundle audit trên `dist/` (cần build trước) |
| `npm run verify` | type-check + lint + unit + build + verify:dist |
| `npm run test:e2e` | build + Playwright (Chromium) trên preview |
| `npm run audit:prod` | `npm audit --omit=dev` — chỉ dependency runtime production |
| `npm run verify:release` | verify + e2e + audit:prod (không gọi `cap:sync`) |
| `npm run cap:sync` | Copy `dist/` vào native projects |
| `npm run cap:android` | Mở Android Studio |
| `npm run cap:ios` | Mở Xcode (**macOS only**) |

### PWA chỉ hoạt động trên production build

Service worker và manifest **không bật trong dev** (`devOptions.enabled: false` trong `vite.config.ts`). Để kiểm tra PWA/offline:

```bash
npm run build
npm run preview
# hoặc
npm run test:e2e   # tự chạy preview + Playwright
```

---

## Biến môi trường

| Biến | Mô tả |
|------|-------|
| `VITE_SITE_URL` | URL canonical production cho SEO, sitemap, OG, JSON-LD. Mặc định `.env.example`: `https://drinking-games.app` — **đổi sang domain thật trước deploy**. Ảnh hưởng `robots.txt`, `sitemap.xml`, thẻ meta và structured data sau build. |

---

## Capacitor

| Thuộc tính | Giá trị mặc định |
|------------|------------------|
| App ID | `com.drinkinggames.app` |
| App name | `Drinking Games` |
| Web dir | `dist` |

**Trước release production:** đổi `appId` trong `capacitor.config.ts` sang bundle ID thật (ví dụ `com.yourcompany.drinkinggames`), rồi `npm run build && npm run cap:sync`.

---

## Native: build & chạy

Luôn **build web trước** rồi mới sync:

```bash
npm run build
npm run cap:sync
```

### Android

**Windows (PowerShell):**

```powershell
cd android
.\gradlew.bat assembleDebug
```

**macOS / Linux:**

```bash
cd android && ./gradlew assembleDebug
```

APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`

- Cần Android SDK (`ANDROID_HOME` hoặc cấu hình trong Android Studio), emulator hoặc thiết bị USB + bật USB debugging.
- Mở project: `npm run cap:android`

### iOS (macOS only)

```bash
npm run build
npm run cap:sync
npm run cap:ios          # mở Xcode
# Trong Xcode: chọn team, signing, Run trên simulator hoặc device
```

Không build được iOS trên Windows/Linux.

---

## Asset generation & giấy phép

### Asset được generate trong repo

| Loại | Script | Output |
|------|--------|--------|
| Icon, splash, OG | `generate:assets` | `public/icons/`, `public/splash/`, `public/og/`, `assets/icon-only.png`, `assets/splash.png` |
| Âm thanh game | `generate:sounds` | `public/sounds/*.wav` (Web Audio, deterministic) |
| Icon/splash native | `generate:cap-assets` | `android/`, `ios/` launcher & splash |

Nguồn SVG: `assets/source/`.

### Provenance & license

| Thành phần | Nguồn / license |
|------------|-----------------|
| Icon, splash, OG PNG | Generate từ SVG nội bộ (`assets/source/`) |
| WAV feedback | Generate bằng script (`scripts/generate-sounds.mjs`) |
| Fredoka, Nunito | `@fontsource-variable/*` — **SIL Open Font License** |
| Tabler Icons | `@tabler/icons-vue` — **MIT** |
| Emoji (home cards, slot symbols) | Glyph hệ điều hành / Unicode, không bundle font emoji |
| Dependencies khác | Theo license trong `package.json` / `package-lock.json` manifests |

---

## Hosting tĩnh & offline

### Cấu trúc build (nested SSG)

`dirStyle: 'nested'`: URL không đuôi map tới thư mục `index.html`, ví dụ `/games/crocodile` → `dist/games/crocodile/index.html`.

### Fallback / rewrite trên host

Host cần phục vụ file tĩnh thực tế hoặc rewrite tương đương:

- `/` → `index.html`
- `/games/crocodile` → `games/crocodile/index.html` (hoặc rewrite tới file đó)

**Caveat:** nếu host chỉ rewrite mọi route về **một** `index.html` gốc (SPA fallback đơn), URL lồng nhau vẫn hoạt động online nhưng **SEO/prerender canonical** của route con có thể không khớp file HTML riêng — ưu tiên host hỗ trợ nested static hoặc upload đúng cây thư mục `dist/`.

### Offline (Workbox)

- Precache: JS/CSS hash, icon, font, WAV, OG.
- `navigateFallback: '/index.html'` — deep link offline dùng SPA shell; Vue Router resolve sau hydrate (không có fallback HTML riêng từng route offline).
- `usePwaUpdate()`: `needRefresh`, `offlineReady`, `updateServiceWorker()`.

---

## Checklist release

### Web / PWA / SEO

- [ ] `VITE_SITE_URL` = domain production; rebuild
- [ ] `npm run verify:release` pass
- [ ] Upload toàn bộ `dist/` (giữ nested paths)
- [ ] Host: rewrite/fallback đúng (xem mục Hosting)
- [ ] Kiểm tra PWA install, offline shell, prompt cập nhật SW
- [ ] `robots.txt`, `sitemap.xml`, OG, JSON-LD trên production URL

### Android

- [ ] Đổi `appId` production; `cap:sync`
- [ ] Icon, splash (`generate:cap-assets` nếu đổi art)
- [ ] Haptic feedback, nút back (Capacitor App)
- [ ] Offline sau lần mở đầu
- [ ] Build release signed; test emulator + **thiết bị thật**
- [ ] Orientation portrait (manifest + UI)

### iOS

- [ ] Build trên macOS + Xcode
- [ ] Safe area (notch), haptic, splash
- [ ] Offline sau lần mở đầu
- [ ] Test simulator + **thiết bị thật**
- [ ] Signing, App Store metadata

### Bảo mật dependency

- [ ] `npm run audit:prod` — runtime production **0 vulnerabilities** (đã verify)
- [ ] `npm audit` full (gồm dev): còn cảnh báo upstream qua `@capacitor/assets` → `sharp` / `tar` — **re-audit và nâng cấp trước release**

---

## Hạn chế đã xác minh (môi trường docs)

| Kiểm tra | Kết quả |
|----------|---------|
| Web quality gate (`verify`) | Pass |
| Playwright e2e (Chromium) | Pass |
| `cap sync` Android + iOS | Pass trên Windows |
| Android Gradle `assembleDebug` | **Blocked** — không có Android SDK / `ANDROID_HOME`; `adb` unavailable |
| iOS build | **Không thể** trên Windows |
| Node engine | Cảnh báo EBADENGINE trên Node 22.12 (< 22.18) |
| `npm run audit:prod` | **0 vulnerabilities** runtime production |
| `npm audit` dev tools | Còn vulnerabilities upstream (`@capacitor/assets` → sharp/tar) — theo dõi trước release |

---

## Stack

- Vue 3 + TypeScript (strict)
- Vite + vite-ssg (nested SSG)
- @unhead/vue (SEO + JSON-LD)
- vite-plugin-pwa + Workbox
- Capacitor 8 (Preferences, Haptics, App)
- Tailwind CSS 4 + Tabler Icons Vue
- Vitest + Playwright + ESLint + Prettier

## Cấu trúc thư mục

```
assets/source/     SVG nguồn icon, splash, OG
assets/            Input Capacitor (icon-only.png, splash.png)
public/icons/      PWA icons (generated)
public/sounds/     WAV game feedback (generated)
public/og/         Open Graph images (generated)
android/           Capacitor Android
ios/               Capacitor iOS (build macOS)
src/services/      Platform adapters (storage, audio, haptics)
src/composables/   useGameFeedback, ...
src/router/        Routes + SEO contract
src/seo/           Head, sitemap, robots
src/pwa/           Manifest, Workbox config
e2e/               Playwright tests
scripts/           generate-*, verify-dist, audit-build
```

## Prerender routes

- `/`
- `/games/crocodile`, `/games/mine`, `/games/wheel`, `/games/slot`, `/games/cards`

(`/settings` và 404 không prerender — SPA client-side.)

---

## License

Private — not for redistribution.
