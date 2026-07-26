import type { LandType } from '@weaver/world-engine'
import {
  assertSeverity,
  type WeatherCondition,
  type WeatherSample,
  WEATHER_CONDITIONS
} from './types.js'

export type SampleWeatherInput = {
  seed: number
  day: number
  x: number
  y: number
  landType: LandType
}

function hashInputs(input: SampleWeatherInput): number {
  let h = (input.seed ^ (input.day * 374761393) ^ (input.x * 668265263) ^ (input.y * 2147483647)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

function biasForLandType(landType: LandType): readonly WeatherCondition[] {
  switch (landType) {
    case 'desert':
      return ['clear', 'drought', 'heatwave', 'heatwave', 'drought']
    case 'tundra':
      return ['clear', 'snow', 'snow', 'fog', 'storm']
    case 'ocean':
      return ['clear', 'clear', 'storm', 'rain', 'fog']
    case 'swamp':
      return ['rain', 'fog', 'storm', 'clear', 'drought']
    case 'jungle':
      return ['rain', 'rain', 'storm', 'fog', 'clear']
    case 'forest':
      return ['clear', 'rain', 'fog', 'storm', 'snow']
    case 'mountain':
      return ['clear', 'snow', 'fog', 'storm', 'rain']
    case 'beach':
      return ['clear', 'clear', 'rain', 'storm', 'fog']
    default:
      return WEATHER_CONDITIONS
  }
}

export function sampleWeather(input: SampleWeatherInput): WeatherSample {
  const hash = hashInputs(input)
  const bias = biasForLandType(input.landType)
  const condition = bias[hash % bias.length] ?? 'clear'
  const severity = assertSeverity((hash % 5) + 1)
  return { condition, severity }
}
