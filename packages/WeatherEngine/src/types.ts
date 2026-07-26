export const WEATHER_CONDITIONS = [
  'clear',
  'rain',
  'storm',
  'snow',
  'fog',
  'drought',
  'heatwave'
] as const

export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number]

export type WeatherSample = {
  condition: WeatherCondition
  /** Integer severity from 1 (mild) to 5 (extreme). */
  severity: number
}

export type WeatherAt = WeatherSample | { condition: 'clear'; severity: 0 }

export const WEATHER_CONDITION_KEY = 'weather.condition'
export const WEATHER_SEVERITY_KEY = 'weather.severity'
export const WEATHER_KEY_PREFIX = 'weather.'

export function assertWeatherCondition(value: string): WeatherCondition {
  if ((WEATHER_CONDITIONS as readonly string[]).includes(value)) {
    return value as WeatherCondition
  }
  throw new Error(`Unknown weather condition: ${value}`)
}

export function assertSeverity(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(`Invalid weather severity: ${value}`)
  }
  return value
}
