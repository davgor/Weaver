# CivilizationEngine (`@weaver/civilization-engine`)

Deterministic settlements on regions: placement, population ledger, map overlays, and NPC placeholder slots.

## Role

Enriches regions with settlements (farmhouse → city), authoritative population totals, sparse WorldEngine overlays for footprints, and NPC slots for **NPCEngine** to fill later. Display names and NPC personalities stay out of this package.

## Boundaries

- **LLM-free** — placement + demographics only
- **No Electron**
- **Depends on** WorldEngine (cells/overlays/seed) and RegionalEngine (`GetRegion` / cells / summary)
- Feeds NPCEngine assignment, EnemyEngine density, Narration/DM grounding
- Consumers need `*.contract.test.ts` against the real API

## Status

Scaffold with health endpoints. Full design lives in epic [016](../../board/backlog/016-CivilizationEngine-Settlement-Placement.md). Package scaffold is done (`016.1`).

## Public API (today)

```ts
import { civilizationEngine } from '@weaver/civilization-engine'

civilizationEngine.health()
civilizationEngine.listEndpoints()
await civilizationEngine.call('health')
```

| Export | Notes |
|--------|--------|
| `civilizationEngine` | Singleton `CivilizationEngineApi` |
| `CivilizationEngineApi` / `EngineEndpoint` | Types |

## Planned direction (from epic 016)

Settlement kinds: `farmHouse` | `hamlet` | `village` | `castle` | `city`, driven by regional stats (land area, water, elevation, coast/landlocked).

| Concern | Intent |
|---------|--------|
| Civilization records | Machine id, region/world, kind, bounds, seedSalt, population, NPC slot counts |
| Population ledger | Authoritative on settlement; aggregates derived, never independently invented |
| Overlays | Footprint / land-use written through WorldEngine sparse overlays |
| NPC placeholders | Slots for later NPCEngine assignment — not full NPC construction |

## Scripts

```bash
npm test -- packages/CivilizationEngine
npm run build:engines
```
