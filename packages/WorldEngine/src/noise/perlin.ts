import type { Cell, LandType, NoiseParams } from '../types.js'

export const DEFAULT_NOISE: NoiseParams = {
  frequency: 0.045,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2
}

type NoiseInput = {
  seed: number
  x: number
  y: number
  noise?: Partial<NoiseParams>
}

type Gradient = { x: number; y: number }
type Point = { x: number; y: number }

function params(input?: Partial<NoiseParams>): NoiseParams {
  return { ...DEFAULT_NOISE, ...input }
}

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

function dotGrid(seed: number, grid: Point, point: Point): number {
  const { x: ix, y: iy } = grid
  const g = gradient(seed, ix, iy)
  return (point.x - ix) * g.x + (point.y - iy) * g.y
}

function perlin(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = x0 + 1
  const y1 = y0 + 1
  const sx = fade(x - x0)
  const sy = fade(y - y0)
  const point = { x, y }
  const n0 = dotGrid(seed, { x: x0, y: y0 }, point)
  const n1 = dotGrid(seed, { x: x1, y: y0 }, point)
  const ix0 = lerp(n0, n1, sx)
  const n2 = dotGrid(seed, { x: x0, y: y1 }, point)
  const n3 = dotGrid(seed, { x: x1, y: y1 }, point)
  return lerp(ix0, lerp(n2, n3, sx), sy)
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function perlinElevation(input: NoiseInput): number {
  const noise = params(input.noise)
  let amplitude = 1
  let frequency = noise.frequency
  let total = 0
  let maxAmplitude = 0
  for (let octave = 0; octave < noise.octaves; octave++) {
    total += perlin(input.seed + octave * 10_007, input.x * frequency, input.y * frequency) * amplitude
    maxAmplitude += amplitude
    amplitude *= noise.persistence
    frequency *= noise.lacunarity
  }
  return clamp01(total / maxAmplitude + 0.5)
}

export function classifyLandType(elevation: number): LandType {
  if (elevation < 0.3) return 'ocean'
  if (elevation < 0.36) return 'beach'
  if (elevation < 0.43) return 'swamp'
  if (elevation < 0.55) return 'grassland'
  if (elevation < 0.66) return 'forest'
  if (elevation < 0.74) return 'jungle'
  if (elevation < 0.8) return 'desert'
  if (elevation < 0.87) return 'tundra'
  return 'mountain'
}

export function createWorldCell(input: NoiseInput): Cell {
  const elevation = perlinElevation(input)
  return {
    x: input.x,
    y: input.y,
    elevation,
    landType: classifyLandType(elevation)
  }
}
