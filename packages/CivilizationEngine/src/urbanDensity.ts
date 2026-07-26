/** Seeded Perlin-esque scalar field for city district density (deterministic). */

type Gradient = { x: number; y: number }

function hash(seed: number, x: number, y: number): number {
  let h = seed ^ Math.imul(x, 374_761_393) ^ Math.imul(y, 668_265_263)
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177)
  return (h ^ (h >>> 16)) >>> 0
}

function gradient(seed: number, x: number, y: number): Gradient {
  const angle = (hash(seed, x, y) / 4_294_967_296) * Math.PI * 2
  return { x: Math.cos(angle), y: Math.sin(angle) }
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function perlinSample(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const sx = fade(x - x0)
  const sy = fade(y - y0)
  const g00 = gradient(seed, x0, y0)
  const g10 = gradient(seed, x0 + 1, y0)
  const g01 = gradient(seed, x0, y0 + 1)
  const g11 = gradient(seed, x0 + 1, y0 + 1)
  const n00 = (x - x0) * g00.x + (y - y0) * g00.y
  const n10 = (x - x0 - 1) * g10.x + (y - y0) * g10.y
  const n01 = (x - x0) * g01.x + (y - y0 - 1) * g01.y
  const n11 = (x - x0 - 1) * g11.x + (y - y0 - 1) * g11.y
  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy)
}

export function urbanDensityAt(args: {
  worldSeed: number
  seedSalt: number
  x: number
  y: number
}): number {
  const seed = args.worldSeed ^ args.seedSalt
  const frequency = 0.18
  const sample = perlinSample(seed, args.x * frequency, args.y * frequency)
  return Math.max(0, Math.min(1, sample * 0.5 + 0.5))
}

export function classifyUrbanLandUse(density: number): 'building' | 'road' | 'district' {
  if (density >= 0.62) return 'building'
  if (density >= 0.48) return 'road'
  return 'district'
}
