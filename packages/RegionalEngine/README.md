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

## Status

Scaffold with health endpoints. Full design lives in epic [013](../../board/backlog/013-RegionalEngine-Map-Segmentation.md). Package scaffold is done (`013.1`).

## Public API (today)

```ts
import { regionalEngine } from '@weaver/regional-engine'

regionalEngine.health()
regionalEngine.listEndpoints()
await regionalEngine.call('health')
```

| Export | Notes |
|--------|--------|
| `regionalEngine` | Singleton `RegionalEngineApi` |
| `RegionalEngineApi` / `EngineEndpoint` | Types |

## Planned direction (from epic 013)

| API | Intent |
|-----|--------|
| `FindNewRegion` | Candidates (geometry + draft stats) without persisting; prefer scoped by `expansionId` / AABB |
| `CreateRegion` | Persist one region + membership + stats |
| `FillRegions` | Find → create; idempotent; typical post-expand: `{ expansionId }` |
| Getters | Region by id, cells in region, list by world, summary stats |

Analysis model (guess): contiguous land-type / elevation / water adjacency segmentation; stable ids from world seed + expansion metadata.

## Scripts

```bash
npm test -- packages/RegionalEngine
npm run build:engines
```
