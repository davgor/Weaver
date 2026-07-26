import {
  LAND_TYPE_OVERRIDE_KEY,
  worldEngine,
  type Aabb,
  type LandType
} from '@weaver/world-engine'
import { landTypeMutation } from './mutationRules.js'
import { sampleWeather } from './sampleWeather.js'
import {
  assertSeverity,
  assertWeatherCondition,
  WEATHER_CONDITION_KEY,
  WEATHER_KEY_PREFIX,
  WEATHER_SEVERITY_KEY,
  type WeatherAt,
  type WeatherSample
} from './types.js'

export type WeatherFieldArgs = {
  dataRoot: string
  worldId: string
  day: number
  bounds: Aabb
}

export type ApplyWeatherResult = {
  cellsTouched: number
  overridesWritten: number
}

function requireMetaSeed(dataRoot: string, worldId: string): number {
  return worldEngine.getWorldMeta(dataRoot, worldId).seed
}

type WriteWeatherArgs = {
  dataRoot: string
  worldId: string
  x: number
  y: number
  sample: WeatherSample
  override: LandType | null
}

function setOverlay(
  args: Pick<WriteWeatherArgs, 'dataRoot' | 'worldId' | 'x' | 'y'>,
  key: string,
  value: string
): void {
  worldEngine.setSparseOverlay({ ...args, key, value })
}

function writeWeatherOverlays(args: WriteWeatherArgs): number {
  setOverlay(args, WEATHER_CONDITION_KEY, args.sample.condition)
  setOverlay(args, WEATHER_SEVERITY_KEY, String(args.sample.severity))
  if (!args.override) return 0
  setOverlay(args, LAND_TYPE_OVERRIDE_KEY, args.override)
  return 1
}

function applyCellWeather(
  args: WeatherFieldArgs,
  seed: number,
  cell: { x: number; y: number; landType: LandType }
): number {
  const sample = sampleWeather({
    seed,
    day: args.day,
    x: cell.x,
    y: cell.y,
    landType: cell.landType
  })
  const override = landTypeMutation(sample.condition, sample.severity, cell.landType)
  return writeWeatherOverlays({
    dataRoot: args.dataRoot,
    worldId: args.worldId,
    x: cell.x,
    y: cell.y,
    sample,
    override
  })
}

export function applyWeatherField(args: WeatherFieldArgs): ApplyWeatherResult {
  const seed = requireMetaSeed(args.dataRoot, args.worldId)
  // Clear first so sampling uses base terrain, not a prior weather override.
  clearWeatherOwnedOverlays(args)
  const cells = worldEngine.getWorldSpecific({
    dataRoot: args.dataRoot,
    worldId: args.worldId,
    bounds: args.bounds
  })
  let overridesWritten = 0
  for (const cell of cells) {
    overridesWritten += applyCellWeather(args, seed, cell)
  }
  return { cellsTouched: cells.length, overridesWritten }
}

function clearWeatherOwnedOverlays(args: Omit<WeatherFieldArgs, 'day'>): number {
  const weatherCleared = worldEngine.clearSparseOverlays({
    dataRoot: args.dataRoot,
    worldId: args.worldId,
    keyPrefix: WEATHER_KEY_PREFIX,
    bounds: args.bounds
  })
  const overridesCleared = worldEngine.clearSparseOverlays({
    dataRoot: args.dataRoot,
    worldId: args.worldId,
    keyPrefix: LAND_TYPE_OVERRIDE_KEY,
    bounds: args.bounds
  })
  return weatherCleared + overridesCleared
}

export function clearWeatherField(args: Omit<WeatherFieldArgs, 'day'>): { cleared: number } {
  return { cleared: clearWeatherOwnedOverlays(args) }
}

export function getWeatherAt(args: {
  dataRoot: string
  worldId: string
  x: number
  y: number
}): WeatherAt {
  const conditionOverlay = worldEngine.getSparseOverlay({
    dataRoot: args.dataRoot,
    worldId: args.worldId,
    x: args.x,
    y: args.y,
    key: WEATHER_CONDITION_KEY
  })
  if (!conditionOverlay) return { condition: 'clear', severity: 0 }
  const severityOverlay = worldEngine.getSparseOverlay({
    dataRoot: args.dataRoot,
    worldId: args.worldId,
    x: args.x,
    y: args.y,
    key: WEATHER_SEVERITY_KEY
  })
  const severity = severityOverlay ? assertSeverity(Number(severityOverlay.value)) : 1
  return {
    condition: assertWeatherCondition(conditionOverlay.value),
    severity
  }
}
