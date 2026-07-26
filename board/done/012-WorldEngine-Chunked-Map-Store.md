# EPIC: WorldEngine hybrid chunked map store

Turn `@weaver/world-engine` into a coordinates-driven world database: seeded Perlin generation, durable hybrid storage (packed terrain chunks + SQLite metadata), and APIs so other packages (especially RegionalEngine) can create, expand, and query worlds at million-cell scale without loading the entire map into RAM.

**Depends on:** none (foundation epic). **Feeds:** `013-RegionalEngine-Map-Segmentation`.

**Storage (chosen):** hybrid — fixed-size terrain chunks for dense elevation/landType; SQLite per `worldId` for seed, noise params, bounds, **expansion history**, chunk manifest, and sparse overlays. Callers never talk to chunks directly.

**LLM boundary:** deterministic only — no Electron imports, no LLM invention.

## Core APIs

| Function | Behavior |
|----------|----------|
| `CreateWorld` | Create world id + store; generate initial rectangle via Perlin; persist chunks + metadata. Records **expansion 0** with its AABB so region fill can target the original map the same way as later expands. |
| `ExpandWorld` | Grow bounds; generate only new cells/chunks with continuous absolute-coordinate noise. **Returns and persists expansion metadata** so RegionalEngine can fill only the new area — no whole-world re-ingest. |
| `GetWorldSpecific` | Return cells in AABB: origin `(x, y)` + `length` × `width`. |
| `GetWorldWhole` | Return all cells via chunk iteration / streaming (must not force one giant in-memory array). |

## Expansion metadata

Each `CreateWorld` / `ExpandWorld` writes a durable expansion record:

- `expansionId`, `worldId`, `sequence` (0 = create, 1..n = expands)
- `addedBounds` — AABB of newly generated cells only
- `previousBounds` / `resultingBounds`
- `createdAt`; optional `cellCount` / chunk ids touched

Regional fill uses `expansionId` or `addedBounds` + `GetWorldSpecific` — never requires `GetWorldWhole` after an expand.

## Supporting APIs

| Function | Why |
|----------|-----|
| `GetCell(worldId, x, y)` | Point lookup without AABB boilerplate |
| `GetWorldBounds(worldId)` | Current min/max rectangle |
| `GetWorldMeta(worldId)` | Seed, noise params, createdAt — no cells |
| `GetExpansion(worldId, expansionId)` | One expansion record for scoped region fill |
| `ListExpansions(worldId)` | Create + all expands |
| `GetLatestExpansion(worldId)` | Post-expand convenience |
| `ListWorlds()` | Discover worlds on disk |
| `DeleteWorld(worldId)` | Tear down store (RegionalEngine clear separate or cascaded later) |
| `HasWorld(worldId)` | Cheap existence check |

Expose as typed methods and admin-callable endpoints (`health` / `listEndpoints` / `call` pattern).

## Cell model (epic-level)

- `x`, `y`; `elevation`; `landType` (enum locked in a sub-ticket: ocean, beach, grassland, forest, jungle, desert, mountain, tundra, swamp, …)
- Sparse overlays in SQLite keyed by `(x, y)`, not packed into every chunk slot

## Sub-tickets

| Id | Summary |
|----|---------|
| `012.1` | Types + hybrid layout (chunk format + SQLite metadata + expansions schema) |
| `012.2` | Seeded Perlin (absolute coords) + land-type classification |
| `012.3` | `CreateWorld` (incl. expansion 0 metadata) |
| `012.4` | `ExpandWorld` + expansion metadata return/persist |
| `012.5` | `GetWorldSpecific` / streaming `GetWorldWhole` + scale-oriented tests |
| `012.6` | Supporting APIs (`GetCell`, bounds/meta, expansion getters, list/delete/has) |
| `012.7` | ElectronAdmin catalog / README package table wiring (when ready) |

## Acceptance criteria

- [x] Epic documents the four core APIs, expansion metadata, supporting query/lifecycle APIs, and hybrid chunk + SQLite persistence for million-cell targets
- [x] `ExpandWorld` yields scoped bounds so region fill need not re-ingest the whole world
- [x] Sub-tickets `012.1`–`012.7` completed and collapsed into this epic file
- [x] Explicit: deterministic, LLM-free; Electron apps call the engine, do not own map logic

## Sub-tickets

### 012.1 012.1 — Types + hybrid layout (chunk format + SQLite metadata + expansions schema)

Define the WorldEngine storage layout and TypeScript types for cells, chunks, world metadata, and expansion records. No generation or public Create/Expand APIs yet.

**Parent:** `012-WorldEngine-Chunked-Map-Store`.

#### Acceptance criteria

- [x] Cell / chunk / world-meta / expansion record types are exported and unit-tested for shape invariants
- [x] Hybrid layout documented in code: packed terrain chunks + SQLite metadata/overlays/expansions
- [x] Expansion record fields cover expansionId, sequence, added/previous/resulting bounds
- [x] No CreateWorld/ExpandWorld implementation in this ticket (types + schema only)

### 012.2 012.2 — Seeded Perlin (absolute coords) + land-type classification

Implement seeded Perlin noise at absolute world coordinates and map elevation → landType enum. Pure generation helpers; persistence wired in later 012.* tickets.

**Parent:** `012-WorldEngine-Chunked-Map-Store`. **Depends on:** `012.1`.

#### Acceptance criteria

- [x] Seeded Perlin at absolute (x,y) is deterministic across runs for the same seed
- [x] Land-type classification covers the epic enum set (ocean, beach, grassland, forest, jungle, desert, mountain, tundra, swamp, …) with unit tests at boundaries
- [x] Generation helpers are LLM-free pure functions with no Electron imports

### 012.3 012.3 — CreateWorld (incl. expansion 0 metadata)

Implement `CreateWorld`: create world id + store, generate initial rectangle via Perlin, persist chunks + metadata, and record expansion 0 with its AABB.

**Parent:** `012-WorldEngine-Chunked-Map-Store`. **Depends on:** `012.1`, `012.2`.

#### Acceptance criteria

- [x] `CreateWorld` persists chunks + SQLite meta and returns a world id
- [x] Expansion 0 is recorded with addedBounds matching the initial rectangle
- [x] Unit tests cover create + reload from disk for the same world id
- [x] Exposed via typed API and admin-callable endpoint pattern

### 012.4 012.4 — ExpandWorld + expansion metadata return/persist

Implement `ExpandWorld` to grow bounds, generate only new cells/chunks with continuous noise, and return/persist expansion metadata for scoped RegionalEngine fill.

**Parent:** `012-WorldEngine-Chunked-Map-Store`. **Depends on:** `012.3`.

#### Acceptance criteria

- [x] `ExpandWorld` generates only newly covered cells; prior cells unchanged
- [x] Returned expansion metadata includes expansionId, addedBounds, previous/resulting bounds
- [x] Unit tests cover expand → GetExpansion / ListExpansions consistency
- [x] Regional fill can target the expansion without GetWorldWhole

### 012.5 012.5 — GetWorldSpecific / streaming GetWorldWhole + scale-oriented tests

Query APIs for AABB slices and whole-world iteration that must not force one giant in-memory array.

**Parent:** `012-WorldEngine-Chunked-Map-Store`. **Depends on:** `012.3`.

#### Acceptance criteria

- [x] `GetWorldSpecific` returns cells for origin+(length×width) AABB
- [x] `GetWorldWhole` streams/iterates chunks without requiring a single giant array
- [x] Scale-oriented tests exercise large maps without OOM in CI defaults

### 012.6 012.6 — Supporting APIs (GetCell, bounds/meta, expansion getters, list/delete/has)

Implement the supporting query/lifecycle surface listed on the parent epic.

**Parent:** `012-WorldEngine-Chunked-Map-Store`. **Depends on:** `012.3`, `012.4`.

#### Acceptance criteria

- [x] `GetCell`, `GetWorldBounds`, `GetWorldMeta`, `GetExpansion`, `ListExpansions`, `GetLatestExpansion` behave per epic table and are unit-tested
- [x] `ListWorlds`, `DeleteWorld`, `HasWorld` cover discovery/teardown/existence
- [x] Admin `listEndpoints` / `call` expose the new methods (payload via 078 plumbing)

### 012.7 012.7 — ElectronAdmin catalog / README package table wiring

Final wiring/docs pass once core APIs exist: Admin catalog entries, package README current API, root README notes if needed.

**Parent:** `012-WorldEngine-Chunked-Map-Store`. **Depends on:** `012.5`, `012.6`.

#### Acceptance criteria

- [x] WorldEngine README documents the shipped Create/Expand/query surface (not just scaffold)
- [x] ElectronAdmin can exercise the new endpoints via parameterized `call`
- [x] Explicit: deterministic, LLM-free; Electron apps call the engine and do not own map logic

