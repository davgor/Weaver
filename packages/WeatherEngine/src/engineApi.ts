import { buildEndpoints } from './endpoints.js'
import {
  applyWeatherField,
  clearWeatherField,
  getWeatherAt,
  type ApplyWeatherResult,
  type WeatherFieldArgs
} from './weatherField.js'
import { sampleWeather, type SampleWeatherInput } from './sampleWeather.js'
import type { WeatherAt, WeatherSample } from './types.js'

export type WeatherEngineApi = {
  id: 'WeatherEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => ReturnType<typeof buildEndpoints>
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  sampleWeather: (input: SampleWeatherInput) => WeatherSample
  applyWeatherField: (args: WeatherFieldArgs) => ApplyWeatherResult
  clearWeatherField: (args: Omit<WeatherFieldArgs, 'day'>) => { cleared: number }
  getWeatherAt: (args: {
    dataRoot: string
    worldId: string
    x: number
    y: number
  }) => WeatherAt
}

const PACKAGE_NAME = '@weaver/weather-engine'
const VERSION = '0.1.0'

export const weatherEngine: WeatherEngineApi = {
  id: 'WeatherEngine',
  title: 'Weather Engine',
  description: 'Deterministic climate fields that mutate WorldEngine cell results',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((entry) => entry.name === endpoint)
    if (!match) throw new Error(`Unknown endpoint: ${endpoint}`)
    return await match.invoke(payload)
  },
  sampleWeather,
  applyWeatherField,
  clearWeatherField,
  getWeatherAt
}
