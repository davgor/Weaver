import type { LandType } from '@weaver/world-engine'
import type { WeatherCondition } from './types.js'

/** Returns an effective landType override, or null when weather leaves terrain unchanged. */
export function landTypeMutation(
  condition: WeatherCondition,
  severity: number,
  baseLandType: LandType
): LandType | null {
  if (severity < 3) return null
  if ((condition === 'rain' || condition === 'storm') && floods(baseLandType)) return 'swamp'
  if (condition === 'snow' && chills(baseLandType)) return 'tundra'
  if (condition === 'drought' && baseLandType === 'swamp') return 'grassland'
  if (condition === 'heatwave' && baseLandType === 'tundra') return 'grassland'
  return null
}

function floods(landType: LandType): boolean {
  return landType === 'grassland' || landType === 'forest' || landType === 'beach'
}

function chills(landType: LandType): boolean {
  return landType === 'grassland' || landType === 'forest' || landType === 'swamp'
}
