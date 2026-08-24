import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const outputDir = join(rootDir, 'public', 'sounds')

const SAMPLE_RATE = 22050

/** @type {Array<{ filename: string, frequency: number, durationMs: number, amplitude?: number, fadeMs?: number }>} */
const tones = [
  { filename: 'click.wav', frequency: 880, durationMs: 45, amplitude: 0.35, fadeMs: 8 },
  { filename: 'tick.wav', frequency: 660, durationMs: 30, amplitude: 0.25, fadeMs: 6 },
  { filename: 'win.wav', frequency: 523.25, durationMs: 220, amplitude: 0.4, fadeMs: 40 },
  { filename: 'lose.wav', frequency: 196, durationMs: 280, amplitude: 0.45, fadeMs: 60 },
  { filename: 'chomp.wav', frequency: 120, durationMs: 160, amplitude: 0.55, fadeMs: 20 },
  { filename: 'explosion.wav', frequency: 90, durationMs: 320, amplitude: 0.6, fadeMs: 80 },
  { filename: 'spin.wav', frequency: 440, durationMs: 180, amplitude: 0.32, fadeMs: 24 },
]

/**
 * @param {{ filename: string, frequency: number, durationMs: number, amplitude?: number, fadeMs?: number }} spec
 */
function createWavBuffer(spec) {
  const amplitude = spec.amplitude ?? 0.35
  const fadeMs = spec.fadeMs ?? 10
  const sampleCount = Math.max(1, Math.floor((SAMPLE_RATE * spec.durationMs) / 1000))
  const fadeSamples = Math.min(sampleCount, Math.floor((SAMPLE_RATE * fadeMs) / 1000))
  const pcm = Buffer.alloc(sampleCount * 2)

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SAMPLE_RATE
    const envelope =
      index < fadeSamples
        ? index / fadeSamples
        : index > sampleCount - fadeSamples
          ? (sampleCount - index) / fadeSamples
          : 1
    const sample = Math.sin(2 * Math.PI * spec.frequency * time) * amplitude * envelope
    const intSample = Math.max(-1, Math.min(1, sample))
    pcm.writeInt16LE(Math.round(intSample * 32767), index * 2)
  }

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)

  return Buffer.concat([header, pcm])
}

mkdirSync(outputDir, { recursive: true })

for (const tone of tones) {
  const outputPath = join(outputDir, tone.filename)
  writeFileSync(outputPath, createWavBuffer(tone))
  console.log(`Generated public/sounds/${tone.filename}`)
}

console.log('Sound generation complete.')
