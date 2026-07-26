# EPIC: WeatherEngine climate fields that mutate WorldEngine results

Add `packages/WeatherEngine` (`@weaver/weather-engine`): deterministic, LLM-free **weather / climate fields** that **mutate what WorldEngine returns** for overworld cells — without rewriting packed Perlin chunks. Weather owns condition sampling and mutation rules; WorldEngine owns durable sparse overlays and effective cell reads.

**Depends on:** `012-WorldEngine-Chunked-Map-Store` (overlay table already exists; this epic adds the public mutation/read-merge surface). **Feeds:** DMEngine day/travel orchestration, NarrationEngine scene tone, later CombatEngine environmental modifiers.

**Mutation model (chosen):** WorldEngine exposes sparse-overlay CRUD. Reserved overlay key `landTypeOverride` changes effective `Cell.landType` on `getCell` / `getWorldSpecific` / `getWorldWhole`. Base elevation/landType in chunks stay the Perlin truth; clearing weather overlays restores prior reads. WeatherEngine writes `weather.condition` / `weather.severity` plus optional `landTypeOverride` via WorldEngine’s public API only — never touches chunk files or SQL directly.

**LLM boundary:** deterministic only — no Electron imports, no LLM invention.

## Core APIs

| Function | Behavior |
|----------|----------|
| `SampleWeather` | Pure: from world seed + campaign day + cell coords + base landType → condition + severity (deterministic). |
| `ApplyWeatherField` | For an AABB: sample weather per cell, write WorldEngine overlays (`weather.*`, optional `landTypeOverride`). Subsequent WorldEngine reads reflect mutations. |
| `ClearWeatherField` | Remove weather-owned overlays in an AABB (or whole world) so WorldEngine reads revert to base terrain. |
| `GetWeatherAt` | Read current weather overlays for one cell (condition/severity), or `clear` when absent. |

## Supporting APIs

| Function | Why |
|----------|-----|
| `health` / `listEndpoints` / `call` | Admin catalog parity |
| WorldEngine `setSparseOverlay` / `getSparseOverlay` / `listSparseOverlays` / `clearSparseOverlays` | Mutation surface WeatherEngine (and future mutators) call |

## Sub-tickets

| Id | Summary |
|----|---------|
| `094.1` | Scaffold WeatherEngine package + monorepo/Electron/README/delivery-standards wiring |
| `094.2` | WorldEngine public sparse-overlay API + effective `landTypeOverride` merge on cell reads |
| `094.3` | Weather condition model + seeded `SampleWeather` |
| `094.4` | `ApplyWeatherField` / `ClearWeatherField` / `GetWeatherAt` mutating WorldEngine results |
| `094.5` | WeatherEngine→WorldEngine contract tests + package README |

## Acceptance criteria

- [ ] Epic documents mutation-via-overlays model: WeatherEngine mutates WorldEngine **results**, not packed chunks
- [ ] Sub-tickets `094.1`–`094.5` completed
- [ ] Explicit: deterministic, LLM-free; Electron apps call the engine, do not own weather logic
- [ ] After `ApplyWeatherField`, WorldEngine `getCell` can return a different `landType` than the base chunk; after `ClearWeatherField`, base terrain returns
