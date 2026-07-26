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

- [ ] Epic documents the four core APIs, expansion metadata, supporting query/lifecycle APIs, and hybrid chunk + SQLite persistence for million-cell targets
- [ ] `ExpandWorld` yields scoped bounds so region fill need not re-ingest the whole world
- [ ] Sub-tickets listed above exist as `board/backlog/012.*` files; none implemented until separately completed
- [ ] Explicit: deterministic, LLM-free; Electron apps call the engine, do not own map logic
