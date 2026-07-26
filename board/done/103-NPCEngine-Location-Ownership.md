# EPIC: NPCEngine location ownership

Own **per-NPC current location** in NPCEngine — a durable “where is this NPC now?” fact separate from spawn/home fields on `NpcRecord` (`regionId` / `civilizationId` from placeholder claim). Quest givers and other NPCs may leave their original settlement; callers need `set`/`get` without mutating identity/construction records.

**Depends on:** `037-NPCEngine-Construction-And-Identity`, `096-CharacterEngine-Location-Ownership` (shared location-kind vocabulary + campaign day stamp via CharacterEngine). **Soft peer (no map-engine import):** Regional / Civilization / Dungeon opaque ids — DMEngine (or other orchestrators) validate destinations before calling NPCEngine. **Feeds:** location-gated quest offers, narration grounding for “where is the giver,” future DM NPC travel / relocation intents.

**Out of scope:** Pathfinding; inventing place names; mutating World/Regional/Civ geography; DM travel orchestration for PCs (`101`); QuestEngine offer gating UI.

**LLM boundary:** deterministic only — no Electron imports, no LLM invention. **No World/Regional/Civ/Dungeon imports in NPCEngine for placement** — location values are opaque string ids (+ kind discriminant). `NpcRecord.regionId` remains **spawn/home** from construction; current placement lives in the location store.

## Location model

| Field | Meaning |
|-------|---------|
| `npcId` | Constructed NPC |
| `campaignId` | Campaign index for listing / portability |
| `regionId` | Current RegionalEngine region id |
| `placeId?` | Optional settlement / POI / dungeon id |
| `locationKind` | `overworld` \| `settlement` \| `dungeon` |
| `updatedDay?` | Optional campaign day when last moved (from CharacterEngine day counter) |

## Core APIs

| Function | Behavior |
|----------|----------|
| `setNpcLocation` | Upsert current location; shape validation only |
| `getNpcLocation` | Return current location or `null` if unset |
| `clearNpcLocation` | Remove stored location |
| `listNpcLocations` | Campaign-scoped listing when `campaignId` is supplied |

## Supporting APIs

| Function | Why |
|----------|-----|
| Seed on `constructNpc` | Initial current location from claimed placeholder (`settlement` + `regionId`, `placeId` = civilization id) |
| Admin `call` endpoints | Catalog parity for set/get/clear/list |
| Portability | Export/import location records in NPC campaign slice (sliceVersion 2) |

## Sub-tickets

| Id | Summary |
|----|---------|
| `103.1` | Location types + in-memory store + pure validators |
| `103.2` | `set` / `get` / `clear` / `list` APIs + admin endpoints + construct seed |
| `103.3` | Portability slice fields + round-trip tests |
| `103.4` | README + contract tests; spawn vs current documented |

## Acceptance criteria

- [x] NPCEngine is the sole owner of per-NPC **current** placement (`regionId` / optional `placeId` / `locationKind`)
- [x] `NpcRecord.regionId` / placeholder remain spawn/home and are not the movement API
- [x] APIs are unit-tested; unset NPCs return `null` without throwing
- [x] Placement validation does not import World/Regional/Civilization/Dungeon packages
- [x] Portability round-trips location records (sliceVersion 2)
- [x] Sub-tickets `103.1`–`103.4` completed

## Sub-tickets

### 103.1 — Location types + in-memory store

Define the NPCEngine location record and an in-memory store with shape validation only (no peer engine lookups).

**Parent:** `103-NPCEngine-Location-Ownership`. **Depends on:** `037`, `096` (kind vocabulary alignment).

#### Acceptance criteria

- [x] Exported `NpcLocation` type includes `npcId`, `campaignId`, `regionId`, optional `placeId`, `locationKind`, optional `updatedDay`
- [x] `locationKind` enum locked (`overworld`, `settlement`, `dungeon`)
- [x] Store helpers validate non-empty ids and kind; reject invalid shapes with typed `NpcEngineError`
- [x] Unit tests cover accept/reject shapes


### 103.2 — set / get / clear / list + construct seed

Publish NPCEngine location façade, admin endpoints, and seed current location on construction.

**Parent:** `103-NPCEngine-Location-Ownership`. **Depends on:** `103.1`.

#### Acceptance criteria

- [x] `setNpcLocation`, `getNpcLocation`, `clearNpcLocation`, `listNpcLocations` exported and unit-tested
- [x] `setNpcLocation` stamps `updatedDay` from CharacterEngine `getCampaignDay` when omitted
- [x] `constructNpc` seeds current location from the claimed placeholder (`locationKind: 'settlement'`, `regionId`, `placeId` = civilization id) without clearing spawn fields on `NpcRecord`
- [x] Admin `call` endpoints expose set/get/clear/list
- [x] Failed/invalid set inputs do not leave a partial record


### 103.3 — Location portability slice

Persist NPC current locations across campaign export/import.

**Parent:** `103-NPCEngine-Location-Ownership`. **Depends on:** `103.2`, existing NPCEngine portability.

#### Acceptance criteria

- [x] `NpcCampaignSlice` includes `locations: NpcLocation[]`
- [x] `NPC_SLICE_VERSION` bumped to `2` with export/import round-trip restoring `getNpcLocation`
- [x] Unit/portability tests cover empty and non-empty location sets
- [x] Slice campaignId mismatches on location records are rejected


### 103.4 — Location README + contracts

Document spawn vs current ownership and pin consumer expectations.

**Parent:** `103-NPCEngine-Location-Ownership`. **Depends on:** `103.2`, `103.3`.

#### Acceptance criteria

- [x] NPCEngine README documents current-location ownership vs spawn/home on `NpcRecord`, opaque ids, and no map-engine import for placement
- [x] Consumer/contract test exercises real `setNpcLocation` / `getNpcLocation` (and CharacterEngine day stamp when used)
- [x] DMEngine portable FORMAT notes npc slice locations when sliceVersion ≥ 2 (no package version bump required for peer-only payload change)
- [x] NPCEngine location unit/endpoint tests pass under `npm test`

