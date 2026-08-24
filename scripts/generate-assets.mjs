import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = join(rootDir, 'assets', 'source')

const outputs = [
  { input: 'icon.svg', output: 'public/icons/icon-192.png', width: 192, height: 192 },
  { input: 'icon.svg', output: 'public/icons/icon-512.png', width: 512, height: 512 },
  {
    input: 'icon-maskable.svg',
    output: 'public/icons/icon-maskable-512.png',
    width: 512,
    height: 512,
  },
  {
    input: 'icon.svg',
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
  { input: 'og-slot.svg', output: 'public/og/og-slot.png', width: 1200, height: 630 },
  { input: 'og-cards.svg', output: 'public/og/og-cards.png', width: 1200, height: 630 },
  { input: 'icon.svg', output: 'assets/icon-only.png', width: 1024, height: 1024 },
  { input: 'splash.svg', output: 'assets/splash.png', width: 2732, height: 2732 },
]

for (const item of outputs) {
  const inputPath = join(sourceDir, item.input)
  const outputPath = join(rootDir, item.output)
  mkdirSync(dirname(outputPath), { recursive: true })

  const svg = readFileSync(inputPath)
  await sharp(svg).resize(item.width, item.height).png().toFile(outputPath)
  console.log(`Generated ${item.output}`)
}

console.log('Asset generation complete.')
