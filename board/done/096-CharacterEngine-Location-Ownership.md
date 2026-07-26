# EPIC: CharacterEngine location ownership

Own **per-character location** in CharacterEngine — the durable “where is this PC?” fact that REBUILD_SPEC already names as `currentRegionId` but never implemented. WorldEngine / RegionalEngine / CivilizationEngine / DungeonEngine keep owning geography and instances; CharacterEngine stores the character’s current placement ids so travel, narration grounding, and hub UI have a single deterministic source.

**Depends on:** `021-CharacterEngine-Core-Ability-Model` (character identity exists). **Soft peer (no package import required):** RegionalEngine region ids, CivilizationEngine settlement/place ids, DungeonEngine instance ids — callers (DMEngine travel) validate destinations before calling CharacterEngine. **Feeds:** DMEngine travel intent (`resolveTravelIntent` today advances days only), NarrationEngine scene grounding, WeatherEngine field sampling at the PC’s region, exploration UX, `097-QuestEngine-World-Quest-Seeding` (location-gated quest offers later).

**Out of scope:** New ExplorationEngine package; pathfinding; fog-of-war; mutating WorldEngine cells; inventing place names (Narration/DM naming).

**LLM boundary:** deterministic only — no Electron imports, no LLM invention. **No World/Regional/Civ/Dungeon imports in CharacterEngine** — location values are opaque string ids (+ optional kind discriminant).

**Follow-up:** DM travel wiring deferred to `101-DMEngine-Travel-Set-Character-Location`.

## Location model

| Field | Meaning |
|-------|---------|
| `characterId` | PC (or companion treated as character-scoped) |
| `campaignId` | Campaign index for listing / portability |
| `regionId` | Current RegionalEngine region id (`currentRegionId` from REBUILD_SPEC) |
| `placeId?` | Optional settlement / POI / dungeon-entrance id within or linked to that region |
| `locationKind` | `overworld` \| `settlement` \| `dungeon` |
| `updatedDay?` | Optional campaign day when last moved (from CharacterEngine day counter) |

## Core APIs

| Function | Behavior |
|----------|----------|
| `setCharacterLocation` | Upsert location for a character; validates required ids/kind shape (not peer existence) |
| `getCharacterLocation` | Return current location or `null` if unset |
| `clearCharacterLocation` | Remove stored location |
| `listCharacterLocations` | Campaign-scoped listing when `campaignId` is supplied |

## Supporting APIs

| Function | Why |
|----------|-----|
| Admin `call` endpoints | Catalog parity for set/get/clear/list |
| Portability | Export/import location records in CharacterEngine campaign slice (sliceVersion 2) |
| Travel integration note | DM `resolveTravelIntent` should call `setCharacterLocation` after a successful destination check — see `101` |

## Sub-tickets

| Id | Summary |
|----|---------|
| `096.1` | Location types + in-memory store + pure validators |
| `096.2` | `set` / `get` / `clear` / `list` APIs + admin endpoints |
| `096.3` | Portability slice fields + round-trip tests |
| `096.4` | README + contract tests; DM travel Feeds stub or consumer contract if wired in-scope |

## Acceptance criteria

- [x] CharacterEngine is the sole owner of per-character `regionId` / optional `placeId` / `locationKind`
- [x] APIs are unit-tested; unset characters return `null` without throwing
- [x] CharacterEngine does not import World/Regional/Civilization/Dungeon packages
- [x] Portability round-trips location records
- [x] Sub-tickets `096.1`–`096.4` completed
- [x] Explicit: geography generation stays in map engines; CharacterEngine only stores placement facts

## Sub-tickets

### 096.1 Location types + in-memory store

Define the CharacterEngine location record and an in-memory store with shape validation only (no peer engine lookups).

**Parent:** `096-CharacterEngine-Location-Ownership`. **Depends on:** `021`.

#### Acceptance criteria

- [x] Exported `CharacterLocation` type includes `characterId`, `regionId`, optional `placeId`, `locationKind`, optional `updatedDay`
- [x] `locationKind` enum locked (`overworld`, `settlement`, `dungeon` at minimum)
- [x] Store helpers validate non-empty ids and kind; reject invalid shapes with typed CharacterEngine errors
- [x] Unit tests cover accept/reject shapes; no set/get public API surface required beyond store helpers if `096.2` owns the façade (either is fine if tests exist)

### 096.2 set / get / clear / list location APIs

Publish CharacterEngine location façade + admin endpoints.

**Parent:** `096-CharacterEngine-Location-Ownership`. **Depends on:** `096.1`.

#### Acceptance criteria

- [x] `setCharacterLocation`, `getCharacterLocation`, `clearCharacterLocation` exported and unit-tested
- [x] `listCharacterLocations(campaignId?)` or equivalent documented listing behavior (campaign index optional but tested if present)
- [x] `setCharacterLocation` may stamp `updatedDay` from `getCampaignDay` when `campaignId` is supplied
- [x] Admin `call` endpoints expose set/get/clear (and list if implemented)
- [x] `characterEngine` README public API table updated in `096.4` or here

### 096.3 Location portability slice

Persist character locations across campaign export/import.

**Parent:** `096-CharacterEngine-Location-Ownership`. **Depends on:** `096.2`, CharacterEngine portability from prior epics.

#### Acceptance criteria

- [x] `CharacterCampaignSlice` (or equivalent) includes location records
- [x] Export/import round-trip restores `getCharacterLocation` for each character
- [x] Unit/portability tests cover empty and non-empty location sets
- [x] Schema/version bump documented if the slice format is versioned

### 096.4 Location README + contracts

Document ownership boundaries and pin consumer expectations.

**Parent:** `096-CharacterEngine-Location-Ownership`. **Depends on:** `096.2`, `096.3`.

#### Acceptance criteria

- [x] CharacterEngine README documents location ownership vs map engines (opaque ids; no WorldEngine import)
- [x] REBUILD_SPEC `currentRegionId` note satisfied by CharacterEngine `regionId` field (README cross-reference sufficient)
- [x] If this epic wires DM travel to `setCharacterLocation`, DMEngine consumer `*.contract.test.ts` exercises real CharacterEngine; otherwise document the intended DM call in the epic/README and leave DM wiring as a follow-up ticket
- [x] CharacterEngine location unit/endpoint tests pass under `npm test`
