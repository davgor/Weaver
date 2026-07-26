# WorldEngine (`@weaver/world-engine`)

Perlin-based world generation and map storage for each game/campaign.

## Role

Owns terrain and geography facts (cells, bounds, seed/noise metadata, expansions). Narration and UI consume generated data; they must not invent map contents.

## Boundaries

- **LLM-free** — deterministic generation and storage only
- **No Electron** — library only
- Feeds **RegionalEngine** (segmentation) and later civilization / placement work
- Consumers need `*.contract.test.ts` against the real API

## Public API

```ts
import { worldEngine } from '@weaver/world-engine'

worldEngine.health()
worldEngine.listEndpoints()

const created = worldEngine.createWorld(dataRoot, {
  worldId: 'campaign-world',
  seed: 123,
  bounds: { minX: 0, minY: 0, maxX: 255, maxY: 255 }
})
const expansion = worldEngine.expandWorld(dataRoot, {
  worldId: created.meta.worldId,
  bounds: { minX: 0, minY: 0, maxX: 511, maxY: 255 }
})

worldEngine.getCell({ dataRoot, worldId: created.meta.worldId, x: 10, y: 10 })
worldEngine.getWorldSpecific({ dataRoot, worldId: created.meta.worldId, bounds: expansion.addedBounds })
for (const cell of worldEngine.getWorldWhole(dataRoot, created.meta.worldId)) {
  // Stream cells; callers do not need one giant in-memory array.
}
```

| Export | Notes |
|--------|--------|
| `worldEngine` | Singleton `WorldEngineApi` |
| `createWorldService(dataRoot)` | Data-root-bound service for tests and direct engine consumers |
| `createWorldCell`, `perlinElevation`, `classifyLandType` | Pure generation helpers |
| `Cell`, `LandType`, `Aabb`, `WorldMeta`, `ExpansionRecord`, `NoiseParams` | Public data types |
| `CHUNK_SIZE`, `LAND_TYPES`, AABB helpers | Storage constants and validation helpers |
| `WorldEngineApi` / `EngineEndpoint` | API and endpoint types |

## Shipped APIs

| Method | Behavior |
|--------|----------|
| `createWorld(dataRoot, opts?)` | Creates a world id/store, generates the initial AABB with seeded Perlin, persists packed chunks + SQLite metadata, and returns `{ meta, expansion0 }`. |
| `expandWorld(dataRoot, { worldId, bounds })` | Grows world bounds, generates only cells outside the prior bounds, persists an expansion record, and returns scoped `addedBounds` + `cellCount`. |
| `getWorldSpecific({ dataRoot, worldId, bounds })` | Returns cells intersecting the requested AABB. |
| `getWorldWhole(dataRoot, worldId)` | Returns an `Iterable<Cell>` over stored coordinates without forcing one giant array. |
| `getCell({ dataRoot, worldId, x, y })` | Returns one cell or `null` outside world bounds. |
| `getWorldBounds(dataRoot, worldId)` / `getWorldMeta(dataRoot, worldId)` | Returns current bounds or metadata without materializing cells. |
| `getExpansion`, `listExpansions`, `getLatestExpansion` | Returns create/expand history for RegionalEngine scoped fills. |
| `listWorlds`, `hasWorld`, `deleteWorld` | Discovery and lifecycle operations for stores under `dataRoot`. |
| `setSparseOverlay` / `getSparseOverlay` / `listSparseOverlays` / `clearSparseOverlays` | Sparse overlay CRUD. Reserved key `landTypeOverride` (valid `LandType`) changes effective `landType` on cell reads without rewriting packed chunks — used by WeatherEngine. |
| `call(endpoint, payload)` | Admin-callable endpoint surface. Payloads include `dataRoot`; `getWorldWhole` is materialized only for admin inspection. |

## Storage

WorldEngine uses a hybrid local layout under `${dataRoot}/${worldId}`:

- `chunks/*.bin` stores dense terrain in fixed-size `CHUNK_SIZE` binary chunks. Each packed cell stores quantized elevation and land type.
- `world.sqlite` stores world seed/noise params, current bounds, expansion history, chunk manifest, and sparse overlays.
- Expansion sequence `0` is creation; later sequences are `expandWorld` calls with previous/resulting bounds and `addedBounds`.

Callers never read chunk files or SQL tables directly. RegionalEngine and UI code should use the public methods above so terrain facts stay deterministic and reusable.

## Scripts

```bash
npm test -- packages/WorldEngine
npm run build:engines
```
