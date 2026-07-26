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
- [x] Sub-tickets listed above exist as `board/backlog/086.*` files; later tickets (`086.7`+) remain unimplemented until separately completed
- [x] Explicit: deterministic, LLM-free; Electron apps call the engine, do not own dungeon map logic
- [x] Engine-local store — not campaign-bundle cell ownership (`081.2`)
