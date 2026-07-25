# EPIC: RegionalEngine map segmentation

Add `packages/RegionalEngine` (`@weaver/regional-engine`): deterministic, LLM-free analysis of WorldEngine maps that finds terrain/spatial patterns and persists region entries with **LLM-ready summary stats**. Display names (e.g. “Kokori Forest”) come later via Narration/DM — this package only assigns machine ids and facts.

**Depends on:** `012-WorldEngine-Chunked-Map-Store` (at least create/get/expansion APIs usable). **Feeds:** future naming, NPC/Enemy placement, DM grounding.

**Storage:** SQLite region rows + cell→region membership (same data-root family as worlds). Stats schema is **extensible** as WorldEngine cell fields grow.

**LLM boundary:** raw data analysis only — no Electron imports, no LLM naming or prose.

## Analysis model

- Contiguous / pattern-based segmentation (land-type continuity, elevation bands, water adjacency, coastlines, basins — rules tuned in sub-tickets)
- Uses WorldEngine cells **and** world/expansion metadata (seed, bounds, `expansionId`) for stable ids and **scoped** analysis
- After `ExpandWorld`: prefer `FillRegions(worldId, { expansionId })` — load expansion AABB via `GetExpansion` + `GetWorldSpecific`, not the whole world

## Region record (core stats for later LLM use)

- `regionId` (deterministic machine id — not a display name)
- `worldId`
- `sourceExpansionId` (optional — which create/expand produced the region’s primary area)
- `dominantLandType` (+ optional land-type histogram)
- `averageElevation` (min/max optional)
- `waterContent` (formula locked later)
- `isOcean` / `touchesOcean` / `isLandlocked`
- `cellCount`, bounding box, centroid
- `statsVersion` + `extraStats` (or additive columns) for growth without breaking callers

## Core APIs

| Function | Behavior |
|----------|----------|
| `FindNewRegion(worldId, scope?)` | Analyze map; return **list** of candidate regions (geometry + draft stats) **without** persisting. Scope: `expansionId` and/or AABB (preferred after expand); unscoped = full current bounds. |
| `CreateRegion(worldId, candidate \| spec)` | Persist one region: membership + core stats from WorldEngine cells for that segment. |
| `FillRegions(worldId, scope?)` | `FindNewRegion` → each candidate → `CreateRegion` (idempotent: skip already-covered cells). Typical post-expand: `FillRegions(worldId, { expansionId })`. |

## Supporting APIs

| Function | Why |
|----------|-----|
| `GetRegion(worldId, regionId)` | Full row + stats for Admin / DM / future naming |
| `ListRegions(worldId)` | All persisted regions for a world |
| `GetRegionAt(worldId, x, y)` | Region owning a cell |
| `GetRegionsInBounds(worldId, x, y, length, width)` | Spatial query for local scenes |
| `GetRegionCells(worldId, regionId)` | Membership (paged/streamed if large) |
| `GetRegionSummary(worldId, regionId)` | Compact LLM prompt payload (stats only) |
| `ClearRegions(worldId)` | Wipe assignments before full re-fill |
| `DeleteRegion(worldId, regionId)` | Remove one region + free cells |
| `HasRegions(worldId)` / `CountRegions(worldId)` | Cheap readiness checks |

**Post-expand path:** `ExpandWorld` → `expansionId` → `FillRegions(worldId, { expansionId })`. Border merge into adjacent existing regions is a later sub-ticket; v1 may create regions only inside the expansion AABB (optional one-cell halo for coastline/landlocked without full-world scan).

## Sub-tickets

| Id | Summary |
|----|---------|
| `013.1` | Scaffold package + catalog/health wiring (Admin + AITTRPG `REQUIRED_ENGINE_IDS`, workspaces, `build:engines`) |
| `013.2` | Extensible region schema + membership store (SQLite) |
| `013.3` | `FindNewRegion` pattern analysis (full + expansion-scoped) |
| `013.4` | `CreateRegion` + `FillRegions` (scoped) |
| `013.5` | Query APIs (`GetRegion`, `GetRegionAt`, summaries, etc.) + TDD |
| `013.6` | ExpandWorld → scoped fill contract + DMEngine/README peer notes |

## Acceptance criteria

- [ ] Epic defines `FindNewRegion` / `CreateRegion` / `FillRegions` with expansion/AABB scope plus supporting query APIs
- [ ] Region fill after expand uses WorldEngine expansion metadata — no whole-world pass required
- [ ] Region stats include LLM-ready core fields and an extension path as WorldEngine grows
- [ ] Explicit: deterministic, LLM-free naming; Electron apps call the engine
- [ ] Package wiring called out (workspaces, `build:engines`, Electron catalogs, `REQUIRED_ENGINE_IDS`)
- [ ] Sub-tickets listed above; none implemented until separately completed
