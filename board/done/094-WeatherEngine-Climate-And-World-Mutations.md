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

- [x] Epic documents mutation-via-overlays model: WeatherEngine mutates WorldEngine **results**, not packed chunks
- [x] Sub-tickets `094.1`–`094.5` completed
- [x] Explicit: deterministic, LLM-free; Electron apps call the engine, do not own weather logic
- [x] After `ApplyWeatherField`, WorldEngine `getCell` can return a different `landType` than the base chunk; after `ClearWeatherField`, base terrain returns

## Sub-tickets

### 094.1 Scaffold WeatherEngine package + registry wiring

Create `packages/WeatherEngine` (`@weaver/weather-engine`) as a deterministic engine stub with health/catalog surface matching siblings. Wire into `build:engines`, ElectronAdmin `engines` array, AITTRPG `REQUIRED_ENGINE_IDS`, root README, and delivery-standards engine lists.

#### Acceptance criteria

- [x] `packages/WeatherEngine` exists with `@weaver/weather-engine`, `tsc` build, and a `health` endpoint matching sibling engine stubs
- [x] Vitest covers health / listEndpoints / call / unknown-endpoint rejection
- [x] Root `build:engines` includes `@weaver/weather-engine`
- [x] ElectronAdmin and ElectronAITTRPG depend on the package and register it in their engine catalogs
- [x] AITTRPG `REQUIRED_ENGINE_IDS` / `summarizeEngineHealth` includes `WeatherEngine` (tests updated)
- [x] Root README package table documents WeatherEngine’s role (climate fields that mutate WorldEngine results; LLM-free)
- [x] Delivery-standards skill engine lists include `WeatherEngine`

### 094.2 WorldEngine public sparse-overlay API + effective landType merge

Expose WorldEngine’s existing overlays table through typed public APIs and merge reserved `landTypeOverride` into cell reads.

#### Acceptance criteria

- [x] Public APIs: `setSparseOverlay`, `getSparseOverlay`, `listSparseOverlays`, `clearSparseOverlays` (bounds and/or keyPrefix filters)
- [x] `landTypeOverride` overlay values must be valid `LandType`; invalid values rejected
- [x] `getCell` / `getWorldSpecific` / `getWorldWhole` return cells with `landType` overridden when overlay present; base chunk data unchanged
- [x] Unit tests cover set/get/list/clear and effective read merge
- [x] Admin `call` endpoints expose the new overlay APIs

### 094.3 Weather condition model + seeded SampleWeather

Lock the weather condition enum and implement pure deterministic `sampleWeather`.

#### Acceptance criteria

- [x] `WeatherCondition` enum locked (`clear`, `rain`, `storm`, `snow`, `fog`, `drought`, `heatwave`)
- [x] `sampleWeather({ seed, day, x, y, landType })` returns `{ condition, severity }` deterministically for the same inputs
- [x] Severity is a bounded number (1–5) unit-tested
- [x] Land-type bias documented in tests (desert prefers drought/heatwave; tundra prefers snow)

### 094.4 ApplyWeatherField / ClearWeatherField / GetWeatherAt

WeatherEngine applies sampled weather into WorldEngine overlays so subsequent WorldEngine cell reads reflect mutations; clearing restores base terrain reads.

#### Acceptance criteria

- [x] `applyWeatherField({ dataRoot, worldId, day, bounds })` writes `weather.condition`, `weather.severity`, and optional `landTypeOverride` via WorldEngine public API
- [x] Mutation rules unit-tested (storm/rain can flood grassland→swamp; snow can chill grassland→tundra; drought can dry swamp→grassland)
- [x] After apply, WorldEngine `getCell` returns mutated `landType` where rules apply
- [x] `clearWeatherField` removes weather-owned overlays in bounds; WorldEngine reads revert to base landType
- [x] `getWeatherAt` returns current condition/severity or clear when absent

### 094.5 WeatherEngine→WorldEngine contract tests + package README

#### Acceptance criteria

- [x] `*.contract.test.ts` in WeatherEngine exercises real `@weaver/world-engine`: apply → mutated getCell → clear → restored
- [x] Package README documents role, mutation model, public APIs, LLM-free boundary
- [x] WorldEngine README documents sparse-overlay APIs and `landTypeOverride` effective reads
