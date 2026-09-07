import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = join(rootDir, 'assets', 'source')

/**
 * Android crops a maskable icon to a circle 80% across. On the full-bleed artwork that beheads the
 * crocodile and eats the wheel, the dice and both mug handles, so the maskable variant is derived
 * here rather than kept as a second hand-made file that drifts out of sync.
 *
 * Insetting the art alone is not enough: a shrunken square shows its own edge as a hard line, on
 * flat padding and on a blurred backdrop alike. So the art is feathered and laid over a blurred,
 * darkened copy of itself, which continues the glow outward with nothing to contrast against.
 */
const MASKABLE_INPUT = 'icon-maskable'
const MASKABLE_SIZE = 1024
const MASKABLE_ART_SCALE = 0.7

async function buildMaskableSource(iconPath) {
  const inner = Math.round(MASKABLE_SIZE * MASKABLE_ART_SCALE)
  const offset = Math.round((MASKABLE_SIZE - inner) / 2)

  const backdrop = await sharp(iconPath)
    .resize(MASKABLE_SIZE, MASKABLE_SIZE)
    .blur(30)
    .modulate({ brightness: 0.62 })
    .png()
    .toBuffer()

  const feather = Buffer.from(
    `<svg width="${inner}" height="${inner}"><rect x="26" y="26" width="${inner - 52}" height="${inner - 52}" rx="70" fill="#fff"/></svg>`,
  )
  const softEdge = await sharp(feather).blur(18).png().toBuffer()
  const art = await sharp(
    await sharp(iconPath).resize(inner, inner).ensureAlpha().png().toBuffer(),
  )
    .composite([{ input: softEdge, blend: 'dest-in' }])
    .png()
    .toBuffer()

  return sharp(backdrop)
    .composite([{ input: art, left: offset, top: offset }])
    .png()
    .toBuffer()
}

const outputs = [
  { input: 'icon.webp', output: 'public/icons/icon-192.png', width: 192, height: 192 },
  { input: 'icon.webp', output: 'public/icons/icon-512.png', width: 512, height: 512 },
  {
    input: MASKABLE_INPUT,
    output: 'public/icons/icon-maskable-512.png',
    width: 512,
    height: 512,
  },
  {
    input: 'icon.webp',
    output: 'public/icons/apple-touch-icon.png',
    width: 180,
    height: 180,
  },
  {
    input: 'splash.svg',
    output: 'public/splash/splash-1280x720.png',
    width: 1280,
    height: 720,
  },
  { input: 'og-home.svg', output: 'public/og/og-home.png', width: 1200, height: 630 },
  { input: 'og-crocodile.svg', output: 'public/og/og-crocodile.png', width: 1200, height: 630 },
  { input: 'og-mine.svg', output: 'public/og/og-mine.png', width: 1200, height: 630 },
  { input: 'og-wheel.svg', output: 'public/og/og-wheel.png', width: 1200, height: 630 },
  { input: 'og-cards.svg', output: 'public/og/og-cards.png', width: 1200, height: 630 },
  { input: 'og-bomb.svg', output: 'public/og/og-bomb.png', width: 1200, height: 630 },
  { input: 'icon.webp', output: 'assets/icon-only.png', width: 1024, height: 1024 },
  { input: 'splash.svg', output: 'assets/splash.png', width: 2732, height: 2732 },
]

const maskableSource = await buildMaskableSource(join(sourceDir, 'icon.webp'))

for (const item of outputs) {
  const outputPath = join(rootDir, item.output)
  mkdirSync(dirname(outputPath), { recursive: true })

  const source =
    item.input === MASKABLE_INPUT ? maskableSource : readFileSync(join(sourceDir, item.input))
  await sharp(source).resize(item.width, item.height).png().toFile(outputPath)
  console.log(`Generated ${item.output}`)
}


/**
 * The lower jaw's photograph has twelve moulded sockets, but they sit as little as 17px apart at a
 * 320px toy, so teeth pinned to them are crowded and ambiguous to tap. The game therefore places
 * its own evenly spaced sockets - which means the photographed ones have to go, or they show
 * through beside the new ones. Inpaint them here, once, rather than covering them at runtime with
 * a drawn gum plate (which never matched the photograph's plastic and left a two-tone seam).
 *
 * Coordinates are the socket openings measured off the source image; re-measure if the art changes.
 */
const PHOTO_SOCKETS = [
  [247, 367, 70, 51],
  [229.5, 425.5, 74, 59],
  [233.5, 487, 75, 57],
  [269, 548.5, 76, 63],
  [353, 595, 76, 61],
  [459.5, 617.5, 76, 52],
  [564.5, 616.5, 70, 50],
  [662.5, 596, 76, 62],
  [750.5, 549.5, 76, 64],
  [786, 487.5, 76, 69],
  [788.5, 421, 73, 59],
  [783, 368.5, 77, 67],
]

const plateSourcePath = join(sourceDir, 'crocodile-base.webp')
const platePath = join(rootDir, 'public/assets/crocodile/crocodile-base.webp')
const {
  data: platePixels,
  info: plateInfo,
} = await sharp(plateSourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

const { width: plateWidth, height: plateHeight, channels: plateChannels } = plateInfo
const original = Buffer.from(platePixels)
const patched = Buffer.from(platePixels)
const readPixel = (buffer, x, y) => {
  const offset = (y * plateWidth + x) * plateChannels
  return [buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]]
}
const writePixel = (buffer, x, y, rgb) => {
  const offset = (y * plateWidth + x) * plateChannels
  buffer[offset] = rgb[0]
  buffer[offset + 1] = rgb[1]
  buffer[offset + 2] = rgb[2]
  buffer[offset + 3] = 255
}
/** Bright red gum, as opposed to the near-black inside of a socket or the green shell around it. */
const isGum = (x, y) => {
  if (x < 0 || x >= plateWidth || y < 0 || y >= plateHeight) return false
  const [r, g, b, a] = readPixel(original, x, y)
  if (a < 200) return false
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return r > 90 && r > g * 1.8 && r > b * 1.8 && luminance > 28
}

// Fill each socket by extending the surrounding gum inward along the radius.
for (const [cx, cy, w, h] of PHOTO_SOCKETS) {
  const rx = w / 2 + 4
  const ry = h / 2 + 4
  for (let y = Math.round(cy - ry); y <= cy + ry; y += 1) {
    for (let x = Math.round(cx - rx); x <= cx + rx; x += 1) {
      if (x < 0 || x >= plateWidth || y < 0 || y >= plateHeight) continue
      const u = (x - cx) / rx
      const v = (y - cy) / ry
      const radius = Math.hypot(u, v)
      if (radius > 1) continue
      const length = radius || 1e-6
      const ux = u / length
      const uy = v / length
      let donor = null
      for (let k = 1.02; k <= 1.9 && !donor; k += 0.04) {
        const sx = Math.round(cx + ux * rx * k)
        const sy = Math.round(cy + uy * ry * k)
        if (isGum(sx, sy)) donor = readPixel(original, sx, sy)
      }
      for (let a = 0; a < 64 && !donor; a += 1) {
        const angle = (a * Math.PI) / 32
        const sx = Math.round(cx + Math.cos(angle) * rx * 1.25)
        const sy = Math.round(cy + Math.sin(angle) * ry * 1.25)
        if (isGum(sx, sy)) donor = readPixel(original, sx, sy)
      }
      if (!donor) continue
      const target = readPixel(patched, x, y)
      const blend = Math.min(1, Math.max(0, (1 - radius) / 0.22))
      writePixel(
        patched,
        x,
        y,
        [0, 1, 2].map((k) => Math.round(target[k] + (donor[k] - target[k]) * blend)),
      )
    }
  }
}

// Radial extension leaves spokes, so blend a heavily blurred copy over just the patched ellipses.
const blurred = await sharp(patched, {
  raw: { width: plateWidth, height: plateHeight, channels: plateChannels },
})
  .blur(7)
  .raw()
  .toBuffer()
for (const [cx, cy, w, h] of PHOTO_SOCKETS) {
  const rx = w / 2 + 7
  const ry = h / 2 + 7
  for (let y = Math.round(cy - ry); y <= cy + ry; y += 1) {
    for (let x = Math.round(cx - rx); x <= cx + rx; x += 1) {
      if (x < 0 || x >= plateWidth || y < 0 || y >= plateHeight) continue
      const radius = Math.hypot((x - cx) / rx, (y - cy) / ry)
      if (radius > 1) continue
      const smooth = readPixel(blurred, x, y)
      if (smooth[3] < 200) continue
      const target = readPixel(patched, x, y)
      const blend = Math.min(1, Math.max(0, (1 - radius) / 0.45))
      writePixel(
        patched,
        x,
        y,
        [0, 1, 2].map((k) => Math.round(target[k] + (smooth[k] - target[k]) * blend)),
      )
    }
  }
}

await sharp(patched, {
  raw: { width: plateWidth, height: plateHeight, channels: plateChannels },
})
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(platePath)
console.log('Generated public/assets/crocodile/crocodile-base.webp (sockets inpainted)')

/**
 * The lower jaw's raster has empty sockets, so its teeth have to be supplied. Drawing them as
 * vectors never matched the photograph's plastic, so cut a real tooth out of the upper jaw instead
 * and flip it: same mould, same gloss, same cream. Regenerate this if the artwork changes.
 */
const upperJawPath = join(rootDir, 'public/assets/crocodile/upper-jaw.webp')
const lowerToothPath = join(rootDir, 'public/assets/crocodile/lower-tooth.webp')
const { data: jawPixels, info: jawInfo } = await sharp(upperJawPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width: jawWidth, height: jawHeight, channels } = jawInfo
const pixelAt = (x, y) => {
  const offset = (y * jawWidth + x) * channels
  return [jawPixels[offset], jawPixels[offset + 1], jawPixels[offset + 2], jawPixels[offset + 3]]
}
const isEnamel = (x, y) => {
  const [r, g, b, a] = pixelAt(x, y)
  if (a < 230) return false
  const max = Math.max(r, g, b)
  const saturation = max ? (max - Math.min(r, g, b)) / max : 0
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 150 && saturation < 0.3 && r >= g - 4 && g >= b - 4
}

const visited = new Uint8Array(jawWidth * jawHeight)
const blobs = []
for (let y = Math.round(jawHeight * 0.6); y < jawHeight; y += 1) {
  for (let x = 0; x < jawWidth; x += 1) {
    if (visited[y * jawWidth + x] || !isEnamel(x, y)) continue
    const stack = [[x, y]]
    visited[y * jawWidth + x] = 1
    let minX = x
    let maxX = x
    let minY = y
    let maxY = y
    let count = 0
    while (stack.length) {
      const [cx, cy] = stack.pop()
      count += 1
      if (cx < minX) minX = cx
      if (cx > maxX) maxX = cx
      if (cy < minY) minY = cy
      if (cy > maxY) maxY = cy
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || nx >= jawWidth || ny < 0 || ny >= jawHeight) continue
        if (visited[ny * jawWidth + nx] || !isEnamel(nx, ny)) continue
        visited[ny * jawWidth + nx] = 1
        stack.push([nx, ny])
      }
    }
    if (count > 2000) {
      blobs.push({ count, minX, minY, w: maxX - minX + 1, h: maxY - minY + 1, seed: [x, y] })
    }
  }
}

// Want a whole fang: tall enough not to be a stub, and the biggest of those, since the ones at
// the corners of the jaw are clipped by the lip and cut out ragged.
const fang = blobs
  .filter((blob) => blob.h / blob.w > 1.4)
  .sort((a, b) => b.count - a.count)[0]
if (!fang) throw new Error('no clean fang found in upper-jaw.webp')
// Re-flood just the chosen fang so the mask is that one connected shape.
const fangMask = new Set()
const floodStack = [fang.seed]
while (floodStack.length) {
  const [cx, cy] = floodStack.pop()
  const key = cy * jawWidth + cx
  if (fangMask.has(key)) continue
  fangMask.add(key)
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = cx + dx
    const ny = cy + dy
    if (nx < 0 || nx >= jawWidth || ny < 0 || ny >= jawHeight) continue
    if (fangMask.has(ny * jawWidth + nx) || !isEnamel(nx, ny)) continue
    floodStack.push([nx, ny])
  }
}
// Close the mask row by row. Where the fang met the lip the enamel test drops out, leaving a bite
// out of the silhouette; a tooth is convex across any row, so spanning each row repairs it.
const bounds = []
for (let y = 0; y < fang.h; y += 1) {
  let first = -1
  let last = -1
  for (let x = 0; x < fang.w; x += 1) {
    if (!fangMask.has((fang.minY + y) * jawWidth + (fang.minX + x))) continue
    if (first < 0) first = x
    last = x
  }
  bounds.push(first < 0 ? null : [first, last])
}
// The lip in front of the fang bites a step out of one side, and that step lands at the end of its
// row, so spanning the row cannot repair it. A fang only widens from tip to root, so enforce that -
// but cap how far a row may grow, or the envelope inflates the silhouette into a rectangle.
const MAX_REPAIR_PX = 7
const spans = bounds.map((b) => (b ? [...b] : null))
let tipRow = 0
let narrowest = Infinity
bounds.forEach((b, y) => {
  if (b && b[1] - b[0] < narrowest) {
    narrowest = b[1] - b[0]
    tipRow = y
  }
})
const growToward = (from, to, step) => {
  for (let y = from; y !== to; y += step) {
    const here = spans[y + step]
    const previous = spans[y]
    const raw = bounds[y + step]
    if (!here || !previous || !raw) continue
    here[0] = Math.max(raw[0] - MAX_REPAIR_PX, Math.min(here[0], previous[0]))
    here[1] = Math.min(raw[1] + MAX_REPAIR_PX, Math.max(here[1], previous[1]))
  }
}
growToward(tipRow, 0, -1)
growToward(tipRow, spans.length - 1, 1)
const rowSpan = new Uint8Array(fang.w * fang.h)
spans.forEach((span, y) => {
  if (!span) return
  for (let x = span[0]; x <= span[1]; x += 1) rowSpan[y * fang.w + x] = 1
})
// Erode by one pixel: the outermost ring is where the enamel blends into the lip behind it, and
// keeping it leaves a fringe of gum colour around the tooth.
const filled = (x, y) =>
  x >= 0 && x < fang.w && y >= 0 && y < fang.h && rowSpan[y * fang.w + x] === 1
const isInterior = (x, y) =>
  filled(x, y) && filled(x - 1, y) && filled(x + 1, y) && filled(x, y - 1) && filled(x, y + 1)

// A binary mask stair-steps badly once the sprite is scaled up, so average the mask over a 3x3
// box for a soft edge. Semi-transparent pixels must not carry gum colour or the tooth gets a red
// fringe, so borrow the nearest enamel pixel's colour instead.
/** True only where the photograph really is enamel, before the envelope repaired the silhouette. */
const wasEnamel = (x, y) =>
  x >= 0 && x < fang.w && y >= 0 && y < fang.h && fangMask.has((fang.minY + y) * jawWidth + (fang.minX + x))

/**
 * Colour for a pixel the envelope added. Search along the row first: enamel shading runs mostly
 * across the tooth, so a horizontal continuation blends, while a radial search leaves diagonal
 * streaks in the repaired corners.
 */
const borrowedEnamel = (x, y) => {
  for (let dx = 1; dx < fang.w; dx += 1) {
    if (wasEnamel(x - dx, y)) return pixelAt(fang.minX + x - dx, fang.minY + y)
    if (wasEnamel(x + dx, y)) return pixelAt(fang.minX + x + dx, fang.minY + y)
  }
  for (let dy = 1; dy < fang.h; dy += 1) {
    if (wasEnamel(x, y - dy)) return pixelAt(fang.minX + x, fang.minY + y - dy)
    if (wasEnamel(x, y + dy)) return pixelAt(fang.minX + x, fang.minY + y + dy)
  }
  return null
}

const cut = Buffer.alloc(fang.w * fang.h * 4)
for (let y = 0; y < fang.h; y += 1) {
  for (let x = 0; x < fang.w; x += 1) {
    let covered = 0
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (isInterior(x + dx, y + dy)) covered += 1
      }
    }
    const offset = (y * fang.w + x) * 4
    if (covered === 0) continue
    // Pixels the envelope added are not enamel in the photograph, so borrow real enamel colour
    // rather than the gum and shadow that happened to sit there.
    const [r, g, b] = wasEnamel(x, y)
      ? pixelAt(fang.minX + x, fang.minY + y)
      : (borrowedEnamel(x, y) ?? pixelAt(fang.minX + x, fang.minY + y))
    cut[offset] = r
    cut[offset + 1] = g
    cut[offset + 2] = b
    cut[offset + 3] = Math.round((covered / 9) * 255)
  }
}

await sharp(cut, { raw: { width: fang.w, height: fang.h, channels: 4 } })
  .flip()
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(lowerToothPath)
console.log(`Generated public/assets/crocodile/lower-tooth.webp (${fang.w}x${fang.h})`)

console.log('Asset generation complete.')
