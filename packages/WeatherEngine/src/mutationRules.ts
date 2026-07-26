import type { LandType } from '@weaver/world-engine'
import type { WeatherCondition } from './types.js'

function floods(landType: LandType): boolean {
  return landType === 'grassland' || landType === 'forest' || landType === 'beach'
}

function chills(landType: LandType): boolean {
  return landType === 'grassland' || landType === 'forest' || landType === 'swamp'
}

function wetOverride(condition: WeatherCondition, base: LandType): LandType | null {
  if (condition !== 'rain' && condition !== 'storm') return null
  return floods(base) ? 'swamp' : null
}

function temperatureOverride(condition: WeatherCondition, base: LandType): LandType | null {
  if (condition === 'snow' && chills(base)) return 'tundra'
  if (condition === 'drought' && base === 'swamp') return 'grassland'
  if (condition === 'heatwave' && base === 'tundra') return 'grassland'
  return null
}

/** Returns an effective landType override, or null when weather leaves terrain unchanged. */
export function landTypeMutation(
  condition: WeatherCondition,
  severity: number,
  baseLandType: LandType
): LandType | null {
  if (severity < 3) return null
  return wetOverride(condition, baseLandType) ?? temperatureOverride(condition, baseLandType)
}
