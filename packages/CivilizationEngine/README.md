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

## Peer usage (DMEngine / NPCEngine)

Typical pipeline after world + region fill:

```ts
import { createWorldService } from '@weaver/world-engine'
import { createRegionalService } from '@weaver/regional-engine'
import { createCivilizationService } from '@weaver/civilization-engine'

const world = createWorldService(dataRoot)
const regional = createRegionalService({ dataRoot, world })
const civ = createCivilizationService({ dataRoot, regional, world })

regional.fillRegions(worldId, { expansionId })
civ.fillCivilizations(worldId, { expansionId })

// NPCEngine later:
const slots = civ.listUnassignedNpcPlaceholders(worldId, { regionId })
civ.claimNpcPlaceholder(worldId, slots[0].slotId, npcId)
```

DMEngine should call CivilizationEngine for settlement facts and population — never invent headcounts. NPCEngine claims placeholders; this package never constructs NPC actors.

## Public API

```ts
import { civilizationEngine, createCivilizationService } from '@weaver/civilization-engine'

civilizationEngine.health()
civilizationEngine.listEndpoints()
await civilizationEngine.call('fillCivilizations', { dataRoot, worldId, expansionId })
```

| Export | Notes |
|--------|--------|
| `createCivilizationService({ dataRoot, regional, world })` | Dependency-injected service |
| `civilizationEngine` | Singleton with health, endpoint catalog, typed helpers |
| `OVERLAY_KEYS` | Sparse overlay key contract (`civ.civilizationId`, `civ.landUse`, `civ.density`) |

## Service methods

| Area | APIs |
|------|------|
| Placement | `proposeCivilizations`, `createCivilization`, `fillCivilizations` |
| Population | `getPopulation`, `getRegionPopulation`, `getCivilizationPopulation`, `adjustPopulation`, `reconcilePopulation` |
| NPC placeholders | `listNpcPlaceholders`, `listUnassignedNpcPlaceholders`, `claimNpcPlaceholder`, `releaseNpcPlaceholder`, `ensureNpcPlaceholders` |
| Query / lifecycle | `getCivilization`, `listCivilizations`, `listCivilizationsInRegion`, `getCivilizationAt`, `getCivilizationsInBounds`, summaries, `hasCivilizations`, `countCivilizations`, `deleteCivilization`, `clearCivilizations` |

## Storage

- `{dataRoot}/{worldId}/civilizations.sqlite` — civilization rows, cell claims, NPC placeholders
- WorldEngine `{dataRoot}/{worldId}/world.sqlite` overlays table — settlement land-use via `OVERLAY_KEYS`

## Scripts

```bash
npx vitest run packages/CivilizationEngine
npm run build:engines
```
