# EPIC: CharacterEngine location ownership

Own **per-character location** in CharacterEngine — the durable “where is this PC?” fact that REBUILD_SPEC already names as `currentRegionId` but never implemented. WorldEngine / RegionalEngine / CivilizationEngine / DungeonEngine keep owning geography and instances; CharacterEngine stores the character’s current placement ids so travel, narration grounding, and hub UI have a single deterministic source.

**Depends on:** `021-CharacterEngine-Core-Ability-Model` (character identity exists). **Soft peer (no package import required):** RegionalEngine region ids, CivilizationEngine settlement/place ids, DungeonEngine instance ids — callers (DMEngine travel) validate destinations before calling CharacterEngine. **Feeds:** DMEngine travel intent (`resolveTravelIntent` today advances days only), NarrationEngine scene grounding, WeatherEngine field sampling at the PC’s region, exploration UX, `097-QuestEngine-World-Quest-Seeding` (location-gated quest offers later).

**Out of scope:** New ExplorationEngine package; pathfinding; fog-of-war; mutating WorldEngine cells; inventing place names (Narration/DM naming).

**LLM boundary:** deterministic only — no Electron imports, no LLM invention. **No World/Regional/Civ/Dungeon imports in CharacterEngine** — location values are opaque string ids (+ optional kind discriminant).

## Location model

| Field | Meaning |
|-------|---------|
| `characterId` | PC (or companion treated as character-scoped) |
| `regionId` | Current RegionalEngine region id (`currentRegionId` from REBUILD_SPEC) |
| `placeId?` | Optional settlement / POI / dungeon-entrance id within or linked to that region |
| `locationKind` | `overworld` \| `settlement` \| `dungeon` (extensible enum locked in a sub-ticket) |
| `updatedDay?` | Optional campaign day when last moved (from CharacterEngine day counter) |

## Core APIs

| Function | Behavior |
|----------|----------|
| `setCharacterLocation` | Upsert location for a character; validates required ids/kind shape (not peer existence) |
| `getCharacterLocation` | Return current location or `null` if unset |
| `clearCharacterLocation` | Remove stored location |
| `listCharacterLocations` | Optional campaign-scoped listing when a `campaignId` index is maintained |

## Supporting APIs

| Function | Why |
|----------|-----|
| Admin `call` endpoints | Catalog parity for set/get/clear/list |
| Portability | Export/import location records in CharacterEngine campaign slice |
| Travel integration note | DM `resolveTravelIntent` should call `setCharacterLocation` after a successful destination check (implementation may be a follow-up DM ticket; this epic owns the CharacterEngine surface) |

## Sub-tickets

| Id | Summary |
|----|---------|
| `096.1` | Location types + in-memory store + pure validators |
| `096.2` | `set` / `get` / `clear` / `list` APIs + admin endpoints |
| `096.3` | Portability slice fields + round-trip tests |
| `096.4` | README + contract tests; DM travel Feeds stub or consumer contract if wired in-scope |

## Acceptance criteria

- [ ] CharacterEngine is the sole owner of per-character `regionId` / optional `placeId` / `locationKind`
- [ ] APIs are unit-tested; unset characters return `null` without throwing
- [ ] CharacterEngine does not import World/Regional/Civilization/Dungeon packages
- [ ] Portability round-trips location records
- [ ] Sub-tickets `096.1`–`096.4` completed
- [ ] Explicit: geography generation stays in map engines; CharacterEngine only stores placement facts
