# EPIC: DungeonEngine instanced map store

Add `packages/DungeonEngine` (`@weaver/dungeon-engine`): deterministic, LLM-free generation and storage of **instanced dungeons** — finite multi-floor maps of rooms and corridors — parallel to WorldEngine’s planet-scale terrain but scoped to a single `dungeonId` instance.

**Depends on:** none (foundation epic; parallel to `012-WorldEngine-Chunked-Map-Store`). **Feeds:** DMEngine travel-into-instance flows, CombatEngine encounter grounding, EnemyEngine spawn anchors; later overworld entrance hooks once WorldEngine create/get exists. Engine-local store (same family as World/Regional/Civ) — campaign bundle (`081`) may reference dungeon ids later but never owns cells.

**Storage (chosen):** hybrid — fixed-size packed chunks for dense `tileType`; SQLite (or table-shaped durable meta) per `dungeonId` for seed, floor list, chunk manifest, sparse overlays. Callers never talk to chunks directly.

**Reuse:** separate package; copy/adapt WorldEngine patterns. No shared map package and no WorldEngine dependency in this epic’s core store.

**LLM boundary:** deterministic only — no Electron imports, no LLM invention.

## Core APIs

| Function | Behavior |
|----------|----------|
| `CreateDungeon` | Create `dungeonId` + store; generate N floors via seeded room–corridor layout; persist chunks + metadata. |
| `GetDungeonSpecific` | Return cells in AABB on a given `floorIndex`: origin `(x, y)` + `length` × `width`. |
| `GetFloor` | All cells / bounds for one floor (streaming if large). |
| `GetDungeonWhole` | Iterate all floors/cells without forcing one giant in-memory array. |

## Supporting APIs

| Function | Why |
|----------|-----|
| `GetCell(dungeonId, floorIndex, x, y)` | Point lookup |
| `GetDungeonBounds(dungeonId)` / per-floor bounds | Current min/max rectangle(s) |
| `GetDungeonMeta(dungeonId)` | Seed, theme, floorCount, createdAt — no cells |
| `ListFloors(dungeonId)` | Floor index list + per-floor bounds |
| `ListDungeons()` | Discover instances on disk |
| `DeleteDungeon(dungeonId)` | Tear down store |
| `HasDungeon(dungeonId)` | Cheap existence check |

Expose as typed methods and admin-callable endpoints (`health` / `listEndpoints` / `call` pattern).

## Cell model (epic-level)

- `floorIndex`, `x`, `y`; `tileType` (enum locked in `086.2`: wall, floor, door, stairsUp, stairsDown, …)
- Sparse overlays in metadata keyed by `(floorIndex, x, y)`, not packed into every chunk slot

## Sub-tickets

| Id | Summary |
|----|---------|
| `086.1` | Scaffold package + monorepo/Electron/README/delivery-standards wiring |
| `086.2` | Types + hybrid layout (chunk format + SQLite metadata + floors schema) |
| `086.3` | Seeded room–corridor layout generation (absolute floor coords) |
| `086.4` | `CreateDungeon` (persist floors + cells + meta) |
| `086.5` | `GetDungeonSpecific` / `GetFloor` / streaming whole-dungeon queries + scale-oriented tests |
| `086.6` | Supporting APIs (`GetCell`, bounds/meta, list/delete/has, `ListFloors`) |
| `086.7` | Room/corridor topology queries (rooms, connections, stairs) |
| `086.8` | Instance reset / restock lifecycle |
| `086.9` | Overworld entrance hook (depends on WorldEngine `012` usable create/get) |
| `086.10` | Package README polish + admin endpoint docs when APIs stabilize |

## Acceptance criteria

- [x] Epic documents core create/query APIs, supporting lifecycle APIs, cell model, and hybrid chunk + metadata persistence for instanced dungeons
- [x] Sub-tickets `086.1`–`086.10` completed and collapsed into this epic file
- [x] Explicit: deterministic, LLM-free; Electron apps call the engine, do not own dungeon map logic
- [x] Engine-local store — not campaign-bundle cell ownership (`081.2`)

## Sub-tickets

### 086.1 086.1 — Scaffold DungeonEngine package + registry wiring

Create `packages/DungeonEngine` (`@weaver/dungeon-engine`) as a deterministic engine stub with health/catalog surface matching siblings. Wire into `build:engines`, ElectronAdmin `engines` array, AITTRPG `REQUIRED_ENGINE_IDS`, root README, and delivery-standards engine lists. No dungeon map APIs yet (those are later `086.*` tickets).

**Parent:** `086-DungeonEngine-Instanced-Map-Store`.

#### Acceptance criteria

- [x] `packages/DungeonEngine` exists with `@weaver/dungeon-engine`, `tsc` build, and a `health` endpoint matching sibling engine stubs
- [x] Vitest covers health / listEndpoints / call / unknown-endpoint rejection (`packages/DungeonEngine/src/index.test.ts`)
- [x] Root `build:engines` includes `@weaver/dungeon-engine`
- [x] ElectronAdmin and ElectronAITTRPG depend on the package and register it in their engine catalogs
- [x] AITTRPG `REQUIRED_ENGINE_IDS` / `summarizeEngineHealth` includes `DungeonEngine` (tests updated)
- [x] Root README package table documents DungeonEngine’s role (instanced dungeon maps; LLM-free)
- [x] Delivery-standards skill engine lists include `DungeonEngine`

### 086.2 086.2 — Types + hybrid layout (chunk format + metadata + floors schema)

Define the DungeonEngine storage layout and TypeScript types for cells, chunks, dungeon metadata, and floors. No generation or public Create APIs yet.

**Parent:** `086-DungeonEngine-Instanced-Map-Store`.

#### Acceptance criteria

- [x] Cell / chunk / dungeon-meta / floor record types are exported and unit-tested for shape invariants
- [x] `tileType` enum locked (wall, floor, door, stairsUp, stairsDown at minimum)
- [x] Hybrid layout documented in code: packed tile chunks + durable metadata/overlays/floors
- [x] Floor record fields cover floorIndex, bounds, optional cellCount
- [x] No CreateDungeon implementation in this ticket (types + schema only)

### 086.3 086.3 — Seeded room–corridor layout generation

Implement seeded deterministic room-and-corridor layout at absolute floor coordinates. Pure generation helpers; persistence wired in later `086.*` tickets.

**Parent:** `086-DungeonEngine-Instanced-Map-Store`. **Depends on:** `086.2`.

#### Acceptance criteria

- [x] Same seed + params yields identical floor grids across runs
- [x] Layout produces rooms connected by corridors with wall/floor/door tiles
- [x] Multi-floor helper can place stairsUp / stairsDown between adjacent floors
- [x] Generation helpers are LLM-free pure functions with no Electron imports

### 086.4 086.4 — CreateDungeon (persist floors + cells + meta)

Persist a new dungeon instance: allocate `dungeonId`, run seeded layout for N floors, write packed chunks + metadata.

**Parent:** `086-DungeonEngine-Instanced-Map-Store`. **Depends on:** `086.2`, `086.3`.

#### Acceptance criteria

- [x] `CreateDungeon` returns dungeon id + meta (seed, floorCount, bounds) and persists durable store under configurable data root
- [x] Re-open / reload after create can read the same cells (round-trip test)
- [x] Idempotent reject or stable id behavior documented and tested when `dungeonId` already exists
- [x] Admin-callable `createDungeon` endpoint wired through `call`

### 086.5 086.5 — GetDungeonSpecific / GetFloor / GetDungeonWhole

Query APIs for AABB slices, single-floor reads, and streaming whole-dungeon iteration without forcing one giant array.

**Parent:** `086-DungeonEngine-Instanced-Map-Store`. **Depends on:** `086.4`.

#### Acceptance criteria

- [x] `GetDungeonSpecific` returns only cells in the requested floor AABB
- [x] `GetFloor` returns cells for one floor (or streams/iterates for large floors)
- [x] `GetDungeonWhole` iterates floors/cells without requiring a single in-memory full dump
- [x] Scale-oriented tests cover a multi-floor dungeon larger than a trivial stub
- [x] Admin endpoints for the query APIs are callable

### 086.6 086.6 — Supporting APIs (GetCell, bounds/meta, list/delete/has, ListFloors)

Complete the lifecycle/query surface needed by admin and future consumers.

**Parent:** `086-DungeonEngine-Instanced-Map-Store`. **Depends on:** `086.4`.

#### Acceptance criteria

- [x] `GetCell`, `GetDungeonBounds`, `GetDungeonMeta`, `ListFloors`, `ListDungeons`, `DeleteDungeon`, `HasDungeon` behave as documented on the epic
- [x] Unit tests cover happy path + missing dungeon errors
- [x] Admin endpoints registered for the supporting APIs

### 086.7 086.7 — Room/corridor topology queries

Expose room and corridor graphs (rooms, connections, stairs) derived from generated layout metadata — not just raw cells.

**Parent:** `086-DungeonEngine-Instanced-Map-Store`. **Depends on:** `086.4`.

#### Acceptance criteria

- [x] APIs return room bounds/ids and corridor/stairs connections for a floor or dungeon
- [x] Topology is deterministic from the same seed as cell generation
- [x] Unit tests cover a known small fixture layout

### 086.8 086.8 — Instance reset / restock lifecycle

Support resetting or restocking an instanced dungeon without destroying its layout identity (for respawn / revisit flows).

**Parent:** `086-DungeonEngine-Instanced-Map-Store`. **Depends on:** `086.6`.

#### Acceptance criteria

- [x] Reset clears instance-scoped overlays/state while preserving geometry (or regenerates from seed as specified)
- [x] Restock hooks are defined for later Enemy/Item consumers (even if stubbed)
- [x] Unit tests cover reset idempotence

### 086.9 086.9 — Overworld entrance hook

Link a dungeon instance to a WorldEngine overworld cell/entrance once WorldEngine create/get APIs exist.

**Parent:** `086-DungeonEngine-Instanced-Map-Store`. **Depends on:** `012-WorldEngine-Chunked-Map-Store` (usable create/get), `086.6`.

#### Acceptance criteria

- [x] Entrance record stores worldId + coordinates (+ optional facing) for a dungeonId
- [x] Consumer contract test against WorldEngine’s real published get/create APIs
- [x] Missing world / invalid coords rejected with clear errors

### 086.10 086.10 — Package README polish + admin endpoint docs

Finalize package README and admin-facing endpoint documentation once core APIs from `086.2`–`086.6` have stabilized.

**Parent:** `086-DungeonEngine-Instanced-Map-Store`. **Depends on:** `086.6`.

#### Acceptance criteria

- [x] Package README lists public typed methods and admin endpoints with short examples
- [x] Boundaries (LLM-free, engine-local store, no Electron) restated
- [x] Planned later APIs (`086.7`–`086.9`) noted as not yet implemented

