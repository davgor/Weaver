# RegionalEngine (`@weaver/regional-engine`)

Deterministic map segmentation over WorldEngine cells.

## Role

Finds terrain/spatial patterns and persists region records with **machine ids** and **LLM-ready summary stats** (dominant land type, elevation, water, coastline flags, bounds, etc.). Display names (e.g. “Kokori Forest”) come later from Narration/DM — not this package.

## Boundaries

- **LLM-free** — analysis and stats only; no naming or prose
- **No Electron**
- **Depends on** WorldEngine create/get/expansion APIs (epic 012)
- Feeds civilization placement, NPC/enemy density, DM grounding
- Consumers need `*.contract.test.ts` against the real API

## Public API

```ts
import { createRegionalService, regionalEngine } from '@weaver/regional-engine'
import { createWorldService } from '@weaver/world-engine'

const world = createWorldService(dataRoot)
const regional = createRegionalService({ dataRoot, world })

regionalEngine.health()
regionalEngine.listEndpoints()
await regionalEngine.call('health')

const candidates = regional.findNewRegion(worldId, { expansionId })
const regions = regional.fillRegions(worldId, { expansionId })
```

| Export | Notes |
|--------|--------|
| `createRegionalService({ dataRoot, world })` | Dependency-injected service over a WorldEngine reader |
| `regionalEngine` | Singleton `RegionalEngineApi` with health, endpoint catalog, and typed delegating helpers |
| `RegionalService`, `RegionRecord`, `RegionCandidate`, `RegionScope`, `RegionSummary` | Public types |

## Service methods

| API | Intent |
|-----|--------|
| `findNewRegion(worldId, scope?)` | Returns unpersisted candidate regions for full world, `expansionId`, and/or AABB scope |
| `createRegion(worldId, candidate)` | Persists one candidate plus cell membership |
| `fillRegions(worldId, scope?)` | Idempotent find/create for currently unassigned cells in scope |
| `getRegion(worldId, regionId)` | Full durable region record |
| `listRegions(worldId)` | All region records for a world |
| `getRegionAt(worldId, x, y)` | Region owning a cell |
| `getRegionsInBounds(worldId, bounds)` | Regions with membership in an AABB |
| `getRegionCells(worldId, regionId)` | Sorted cell membership for a region |
| `getRegionSummary(worldId, regionId)` | Compact LLM-ready facts without names/prose |
| `clearRegions(worldId)` / `deleteRegion(worldId, regionId)` | Remove assignments |
| `hasRegions(worldId)` / `countRegions(worldId)` | Cheap readiness checks |

Admin-callable endpoint names mirror these service names and require `dataRoot`, `worldId`, and method-specific fields. Endpoint calls may also pass `worldDataRoot` when WorldEngine storage is separate from RegionalEngine storage.

## Segmentation model

RegionalEngine v1 performs deterministic 4-connected flood fill over same-`landType` WorldEngine cells. It never invents cells: all map facts are read through the injected WorldEngine service.

Region ids are deterministic machine ids derived from `worldId`, world seed, optional `sourceExpansionId`, dominant land type, and sorted cell coordinates. They are not display names.

`waterContent` is the fraction of region cells that are either `ocean`/`beach` or have a 4-neighbor that is `ocean`/`beach`. `touchesOcean` is true when that fraction is non-zero; `isLandlocked` is true for non-ocean regions that do not touch water by this formula.

## Storage

Region rows and cell membership are persisted in `{dataRoot}/{worldId}/regions.sqlite`, separate from WorldEngine's `world.sqlite` and chunk files. Region records include core stats plus `extraStats` for forward-compatible additions as WorldEngine cell fields grow.

## Post-expand workflow

After `WorldEngine.expandWorld`, prefer scoped fill:

```ts
const expansion = world.expandWorld({ worldId, bounds: expandedBounds })
const created = regional.fillRegions(worldId, { expansionId: expansion.expansionId })
```

The service resolves the expansion via `getExpansion` and loads only `expansion.addedBounds` through `getWorldSpecific`; it does not require a whole-world pass. Border merging into existing regions is intentionally left for a later ticket.

## Peer notes for DMEngine and future consumers

- Treat RegionalEngine summaries as factual grounding data for prompts; display names and prose still come from Narration/DM workflows.
- Call `hasRegions`/`countRegions` before relying on region facts, and call `fillRegions(worldId, { expansionId })` immediately after a world expansion.
- Keep consumer contract tests against `@weaver/regional-engine` and the real peer package API when DMEngine starts orchestrating region-aware flows.
- Electron apps should call the engine/API surface; no RegionalEngine persistence or segmentation rules belong in Electron processes.

## Scripts

```bash
npx vitest run packages/RegionalEngine
```
