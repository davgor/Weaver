# WeatherEngine (`@weaver/weather-engine`)

Deterministic weather / climate fields that **mutate WorldEngine cell results** via sparse overlays.

## Role

Owns weather condition sampling and mutation rules. Applies temporary climate overlays through WorldEngine’s public API so `getCell` / map queries can return a different effective `landType` than the packed Perlin base — without rewriting chunk files.

## Boundaries

- **LLM-free** — deterministic sampling and overlay writes only
- **No Electron** — library only
- **Mutates WorldEngine results** — writes `weather.*` and optional `landTypeOverride` overlays; never touches WorldEngine storage internals
- Consumers that call WorldEngine through this package keep `*.contract.test.ts` coverage against the real provider

## Public API

```ts
import { weatherEngine } from '@weaver/weather-engine'

const sample = weatherEngine.sampleWeather({
  seed: 99,
  day: 12,
  x: 3,
  y: 7,
  landType: 'grassland'
})

weatherEngine.applyWeatherField({
  dataRoot,
  worldId,
  day: 12,
  bounds: { minX: 0, minY: 0, maxX: 31, maxY: 31 }
})

// WorldEngine reads now reflect weather landType overrides where rules fired
weatherEngine.getWeatherAt({ dataRoot, worldId, x: 3, y: 7 })
weatherEngine.clearWeatherField({ dataRoot, worldId, bounds })
```

| Export | Notes |
|--------|-------|
| `weatherEngine` | Singleton `WeatherEngineApi` |
| `sampleWeather` / `landTypeMutation` | Pure helpers |
| `applyWeatherField` / `clearWeatherField` / `getWeatherAt` | World-mutating field APIs |
| `WEATHER_CONDITIONS`, overlay key constants | Shared vocabulary |

## Mutation model

1. `applyWeatherField` clears prior weather-owned overlays in the AABB.
2. Samples weather per base cell (`seed` from WorldEngine meta + campaign `day` + coords + base `landType`).
3. Writes `weather.condition`, `weather.severity`, and optional WorldEngine `landTypeOverride`.
4. WorldEngine `getCell` merges `landTypeOverride` into the returned cell; packed chunks stay unchanged.
5. `clearWeatherField` removes those overlays so reads revert to base terrain.

## Scripts

```bash
npm test -- packages/WeatherEngine
npm run build:engines
```
