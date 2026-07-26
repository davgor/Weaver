# EPIC: CivilizationEngine settlement placement

Add `packages/CivilizationEngine` (`@weaver/civilization-engine`): deterministic, LLM-free enrichment of **regions** with settlements (farmhouses → cities), map overlays, **consistent population totals**, and **NPC placeholder slots** for NPCEngine to fill later. Display names and NPC personalities stay out of this package.

**Depends on:** `012-WorldEngine-Chunked-Map-Store` (cells + sparse overlays + seed/meta) and `013-RegionalEngine-Map-Segmentation` (`GetRegion` / cells / summary). **Feeds:** NPCEngine assignment, EnemyEngine encounter density, Narration/DM grounding.

**Storage:** SQLite civilization + population + NPC-slot tables (same data-root family as worlds/regions) plus **WorldEngine sparse overlays** on cells (settlement footprint / land-use). Callers never invent population outside these APIs.

**LLM boundary:** raw placement + demographics only — no Electron imports, no naming/prose, no full NPC construction.

## Classification ladder

Settlements are typed; regional stats (land area, water, elevation, landlocked/coast) drive **eligible types and size bands**:

| `kind` | Typical footprint | Population band (tunable) | Notes |
|--------|-------------------|---------------------------|-------|
| `farmHouse` | 1–few cells | tiny (family) | Isolated rural; farmland overlays nearby |
| `hamlet` | small cluster | small | Few households; optional shared commons |
| `village` | modest cluster | medium | Civic/market placeholder slots |
| `castle` | fort footprint + bailey | low–medium | Strategic; walls/keep overlays; garrison slots |
| `city` | multi-district AABB | large | **Perlin-esque** urban density field (districts, roads, density bands) |

A region may host **zero or many** settlements. Ocean / pure-water regions stay empty unless a later coastal rule opts in.

## Domain model

### Civilization (settlement) record

- `civilizationId` (deterministic machine id — not a display name)
- `worldId`, `regionId`
- `kind` (`farmHouse` \| `hamlet` \| `village` \| `castle` \| `city`)
- `origin` / `bounds` (AABB); optional `centroid`
- `seedSalt` (derived from world seed + regionId + sequence — stable regen)
- `population` (authoritative headcount for this settlement)
- `npcSlotCount` / `npcSlotsAssigned` (consistency with placeholder list)
- `statsVersion` + `extraStats` for growth without breaking callers

### Population ledger (consistency)

Authoritative rolls live on the settlement; **aggregates are derived**, never independently invented:

- settlement `population`
- region total = Σ settlements in region
- world total = Σ settlements in world

APIs that mutate population must update settlement rows and invalidate/recompute aggregates (or maintain running totals transactionally).

### NPC placeholder slot

Not an NPC — a reservation for NPCEngine:

- `slotId`, `civilizationId`, `worldId`, `regionId`
- `roleHint` (e.g. `resident`, `farmer`, `guard`, `merchant`, `lord`, `mayor` — enum locked in sub-ticket)
- `status`: `unassigned` \| `assigned`
- `assignedNpcId` (optional; set only by NPCEngine / orchestrator later)
- optional `priority` / `districtTag` (cities)

### Cell overlays (via WorldEngine sparse metadata)

Per occupied / influenced cell (keys TBD in sub-ticket):

- `civilizationId`
- `landUse`: `building` \| `road` \| `farmland` \| `wall` \| `district` \| …
- optional `density` (0–1) for city Perlin field samples

## City Perlin model

For `kind: 'city'` only (villages may use simpler clustering):

1. Derive a local urban noise field from `worldMeta.seed` + `seedSalt` + absolute `(x,y)`
2. Threshold into districts / roads / building cells inside the city AABB
3. Population scales with **habitable building-cell count × density curve** (clamped by region capacity rules)
4. Overlay writes are sparse — not a second full terrain map

## Core APIs

| Function | Behavior |
|----------|----------|
| `ProposeCivilizations(worldId, regionId, opts?)` | Read region stats + cells (+ optional WorldEngine AABB). Return **candidates** (kind, bounds, draft population, draft overlays, draft NPC slots) **without** persisting. `opts`: `kinds?`, `maxCount?`, `rngSalt?`. |
| `CreateCivilization(worldId, candidate \| spec)` | Persist one settlement: record + population ledger update + NPC placeholders + WorldEngine overlays. Idempotent on stable id when re-applied. |
| `FillCivilizations(worldId, regionId \| scope?)` | `ProposeCivilizations` → each candidate → `CreateCivilization`. Scope: one `regionId`, list of region ids, or `{ expansionId }` (regions intersecting expansion AABB via RegionalEngine). Idempotent: skip cells already claimed by a settlement. |

Typical pipeline: `CreateWorld` / `ExpandWorld` → `FillRegions` → **`FillCivilizations(worldId, { expansionId })`** (or per `regionId`).

## Population APIs

| Function | Behavior |
|----------|----------|
| `GetPopulation(worldId)` | World aggregate headcount (+ optional breakdown by kind) |
| `GetRegionPopulation(worldId, regionId)` | Region aggregate |
| `GetCivilizationPopulation(worldId, civilizationId)` | Single settlement |
| `AdjustPopulation(worldId, civilizationId, delta \| absolute)` | Mutate settlement pop; recompute aggregates; resize unassigned NPC slots if policy says so (policy locked in sub-ticket) |
| `ReconcilePopulation(worldId, regionId?)` | Recompute aggregates from settlement rows (repair / migration) |

## NPC placeholder APIs

| Function | Behavior |
|----------|----------|
| `ListNpcPlaceholders(worldId, civilizationId)` | All slots for a settlement |
| `ListUnassignedNpcPlaceholders(worldId, filter?)` | Filter by region / kind / roleHint |
| `ClaimNpcPlaceholder(worldId, slotId, npcId)` | Mark `assigned` (called when NPCEngine places someone) |
| `ReleaseNpcPlaceholder(worldId, slotId)` | Back to `unassigned`; clear `assignedNpcId` |
| `EnsureNpcPlaceholders(worldId, civilizationId)` | Re-sync slot count to population/kind rules without inventing NPC facts |

## Query / lifecycle APIs

| Function | Why |
|----------|-----|
| `GetCivilization(worldId, civilizationId)` | Full record for Admin / DM |
| `ListCivilizations(worldId)` | All settlements in world |
| `ListCivilizationsInRegion(worldId, regionId)` | Region-scoped list |
| `GetCivilizationAt(worldId, x, y)` | Settlement owning / influencing a cell |
| `GetCivilizationsInBounds(worldId, x, y, length, width)` | Spatial query for local scenes |
| `GetCivilizationSummary(worldId, civilizationId)` | Compact LLM prompt payload (kind, pop, slot counts, bounds — no prose) |
| `GetRegionCivilizationSummary(worldId, regionId)` | Region pop + settlement list summary |
| `HasCivilizations(worldId)` / `CountCivilizations(worldId)` | Cheap readiness |
| `DeleteCivilization(worldId, civilizationId)` | Remove record, slots, overlays; recompute pop |
| `ClearCivilizations(worldId, regionId?)` | Wipe world or one region before re-fill |

Expose as typed methods and admin-callable endpoints (`health` / `listEndpoints` / `call` pattern), matching sibling engines.

## Peer contract (who calls what)

```text
WorldEngine
  GetWorldMeta / GetWorldSpecific / GetCell
  sparse overlay write/read (settlement landUse)     ← CivilizationEngine writes

RegionalEngine
  GetRegion / GetRegionSummary / GetRegionCells
  GetRegionsInBounds (expansion-scoped fill)         ← CivilizationEngine reads

CivilizationEngine
  Fill / Create / population / NPC placeholders      ← DMEngine / Admin / pipeline

NPCEngine (later)
  ClaimNpcPlaceholder + construct real NPC
```

**Not this package:** NPC stats/identity/dialogue, region display names, combat garrisons as combatants (EnemyEngine may read castle/city density later).

## Sub-tickets

| Id | Summary |
|----|---------|
| `016.1` | Scaffold package + catalog/health wiring (Admin + AITTRPG `REQUIRED_ENGINE_IDS`, workspaces, `build:engines`, README) |
| `016.2` | Schema: civilization, population ledger, NPC placeholders, overlay key contract with WorldEngine |
| `016.3` | Kind rules + region-informed sizing (farmHouse → city eligibility/capacity) |
| `016.4` | `ProposeCivilizations` (incl. city Perlin density field) |
| `016.5` | `CreateCivilization` + `FillCivilizations` (region- and expansion-scoped) + overlay writes |
| `016.6` | Population APIs + reconcile; NPC placeholder list/claim/release/ensure |
| `016.7` | Query/lifecycle APIs + summaries + TDD; DMEngine/README peer notes |

## Acceptance criteria

- [x] Epic defines core fill APIs, population ledger APIs, NPC placeholder APIs, and query/lifecycle APIs above
- [x] Settlements use RegionalEngine facts for eligibility/size; cities use seeded Perlin-esque density
- [x] Population is authoritative per settlement with consistent region/world aggregates
- [x] NPC placeholders are created without constructing NPCs; claim/release reserved for later assignment
- [x] Map enrichment goes through WorldEngine sparse overlays + CivilizationEngine records
- [x] Explicit: deterministic, LLM-free; depends on 012 + 013
- [x] Sub-tickets listed above exist as `board/backlog/016.*` files (`016.1` in `done/`); none implemented until separately completed

## Sub-tickets

### 016.1 — Scaffold CivilizationEngine package

Create `packages/CivilizationEngine` (`@weaver/civilization-engine`) as a deterministic engine stub with the same health/catalog surface as sibling engines. Wire it into monorepo build scripts and both Electron apps’ engine catalogs / required health ids. **No** settlement placement, population ledger, Perlin cities, or NPC placeholder APIs yet (those are later 016.* tickets).

#### Acceptance criteria

- [x] `packages/CivilizationEngine` exists with `@weaver/civilization-engine`, `tsc` build, and a `health` endpoint matching sibling engine stubs
- [x] Vitest covers health / listEndpoints / call / unknown-endpoint rejection (`packages/CivilizationEngine/src/index.test.ts`)
- [x] Root `build:engines` includes `@weaver/civilization-engine`
- [x] ElectronAdmin and ElectronAITTRPG depend on the package and register it in their engine catalogs
- [x] AITTRPG `REQUIRED_ENGINE_IDS` / `summarizeEngineHealth` includes `CivilizationEngine` (tests updated)
- [x] README package table documents CivilizationEngine’s role (deterministic region settlement enrichment; LLM-free)

### 016.2 — Schema: civilization, population ledger, NPC placeholders, overlay key contract

Persistence schema and overlay key contract with WorldEngine. No placement algorithms yet.

**Parent:** `016-CivilizationEngine-Settlement-Placement`. **Depends on:** `016.1` (done), `012`/`013` query APIs.

#### Acceptance criteria

- [x] Civilization / population / NPC placeholder schemas persist and reload
- [x] Overlay key contract with WorldEngine is documented and tested at the type/API boundary
- [x] No NPC construction or display names in this package

### 016.3 — Kind rules + region-informed sizing (farmHouse → city)

Eligibility and capacity rules from RegionalEngine facts.

**Parent:** `016-CivilizationEngine-Settlement-Placement`. **Depends on:** `016.2`.

#### Acceptance criteria

- [x] Kind ladder farmHouse → city has deterministic eligibility/capacity rules
- [x] Rules consume RegionalEngine summary facts (unit-tested with fixtures)
- [x] LLM-free pure rule module

### 016.4 — ProposeCivilizations (incl. city Perlin density field)

Proposal-only placement suggestions including city density field.

**Parent:** `016-CivilizationEngine-Settlement-Placement`. **Depends on:** `016.3`.

#### Acceptance criteria

- [x] `ProposeCivilizations` returns candidates without persisting
- [x] City proposals use a seeded Perlin-esque density field
- [x] Unit tests cover determinism for a fixed seed

### 016.5 — CreateCivilization + FillCivilizations + overlay writes

Persist settlements (region- and expansion-scoped) and write WorldEngine sparse overlays.

**Parent:** `016-CivilizationEngine-Settlement-Placement`. **Depends on:** `016.4`.

#### Acceptance criteria

- [x] Create/Fill APIs persist civilizations and overlays
- [x] Expansion-scoped fill is supported
- [x] Unit tests + WorldEngine overlay write path covered (contract test when calling WorldEngine)

### 016.6 — Population APIs + reconcile; NPC placeholder list/claim/release/ensure

Authoritative population ledger and NPC placeholder lifecycle without constructing NPCs.

**Parent:** `016-CivilizationEngine-Settlement-Placement`. **Depends on:** `016.5`.

#### Acceptance criteria

- [x] Population APIs keep settlement/region/world aggregates consistent
- [x] Placeholder list/claim/release/ensure do not construct NPCEngine actors
- [x] Unit-tested claim/release edge cases

### 016.7 — Query/lifecycle APIs + summaries + TDD; DMEngine/README peer notes

Finish query/lifecycle surface and peer documentation for DMEngine consumers.

**Parent:** `016-CivilizationEngine-Settlement-Placement`. **Depends on:** `016.6`.

#### Acceptance criteria

- [x] Query/lifecycle/summary APIs are unit-tested
- [x] Package README documents peer usage for DMEngine / NPC assignment
- [x] Explicit: deterministic, LLM-free; depends on World + Regional engines

