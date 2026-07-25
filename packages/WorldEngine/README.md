# WorldEngine (`@weaver/world-engine`)

Perlin-based world generation and map storage for each game/campaign.

## Role

Owns terrain and geography facts (cells, bounds, seed/noise metadata, expansions). Narration and UI consume generated data; they must not invent map contents.

## Boundaries

- **LLM-free** — deterministic generation and storage only
- **No Electron** — library only
- Feeds **RegionalEngine** (segmentation) and later civilization / placement work
- Consumers need `*.contract.test.ts` against the real API

## Status

Scaffold with health endpoints. Epic [012](../../board/backlog/012-WorldEngine-Chunked-Map-Store.md) targets a hybrid chunked map store (packed terrain chunks + SQLite metadata) at large scale.

## Public API (today)

```ts
import { worldEngine } from '@weaver/world-engine'

worldEngine.health()
worldEngine.listEndpoints()
await worldEngine.call('health')
```

| Export | Notes |
|--------|--------|
| `worldEngine` | Singleton `WorldEngineApi` |
| `WorldEngineApi` / `EngineEndpoint` | Types |

## Planned direction (from epic 012)

| API | Intent |
|-----|--------|
| `CreateWorld` | Seeded Perlin rectangle; persist chunks + expansion 0 |
| `ExpandWorld` | Grow bounds; return expansion metadata for scoped region fill |
| `GetWorldSpecific` / `GetCell` / `GetWorldBounds` | Query without loading the whole map |
| `GetWorldWhole` | Stream/iterate all cells |
| Expansion queries | `GetExpansion`, `ListExpansions`, `GetLatestExpansion` |

Storage sketch: fixed-size terrain chunks for dense elevation/landType; SQLite per `worldId` for seed, bounds, expansion history, chunk manifest, sparse overlays.

## Scripts

```bash
npm test -- packages/WorldEngine
npm run build:engines
```
