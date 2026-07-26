# EPIC: ActionEngine catalog & known-action grants

Seed the deterministic action/effect catalog (including Ice Bolt and Hamstring Strike as shared-effect examples) and define how characters **know** actions. CharacterEngine stores known `actionId`s (spellbook UI may still say "Spellbook"); ActionEngine owns definitions and grant validation.

**Depends on:** `082-ActionEngine-Ability-Effect-And-Range-Model`. **Feeds:** `026-CharacterEngine-Archetypes-And-Starting-Loadouts` / `036-ItemEngine-Starting-Gear-Catalog` (starting known actions), `025-CharacterEngine-Xp-And-Level-Up` (level-up grants), `028-CharacterEngine-Journal-Logbook-Quests-Spellbook` (known-actions surface), `084-ActionEngine-Use-Resolution-And-Lockout`.

**LLM boundary:** catalog is seed data — LLM must not invent action ids, ranges, or effect magnitudes.

## Sub-tickets

| Id | Summary |
|----|---------|
| `083.1` | Seed effect + action catalog (at least `slow_movement`, `ice_bolt`, `hamstring_strike`) |
| `083.2` | Known-action grant/revoke/query helpers for a character id (keys only; no duplicate definitions) |
| `083.3` | Contract notes/tests: CharacterEngine / ItemEngine starting-loadout consumers read catalog by id |
| `083.4` | README catalog authoring notes + versioning/seed determinism |

## Acceptance criteria

- [x] Seed catalog includes Ice Bolt (range feet 30, effect `slow_movement`) and Hamstring Strike (range `meleeWeapon`, same `slow_movement` effect), unit-tested for shared effect identity
- [x] Grant/query APIs track known `actionId`s per character without copying action definitions into CharacterEngine
- [x] Starting-loadout / level-up peers are expected to grant ids from this catalog (documented + contract coverage when those call sites land)
- [x] Catalog seeding is deterministic for a fresh campaign
- [x] Sub-tickets listed above exist as `board/backlog/083.*` files; none implemented until separately completed

## Sub-tickets

### 083.1 — Seed effect + action catalog (Ice Bolt & Hamstring Strike)

Deterministic seed data proving shared effects across spell and class-action flavor.

**Parent:** `083-ActionEngine-Catalog-And-Known-Actions`. **Depends on:** `082` model APIs.

#### Acceptance criteria

- [x] Seed includes `slow_movement`, `ice_bolt` (feet 30), `hamstring_strike` (`meleeWeapon`)
- [x] Unit test asserts both actions reference the same `slow_movement` effect id
- [x] Fresh seed is deterministic across runs

### 083.2 — Known-action grant/revoke/query

Track which `actionId`s a character knows without duplicating action definitions.

**Parent:** `083-ActionEngine-Catalog-And-Known-Actions`. **Depends on:** `083.1`.

#### Acceptance criteria

- [x] Grant/revoke/query APIs keyed by character id + action id, unit-tested
- [x] Granting an unknown catalog id fails closed
- [x] Definitions remain only in the ActionEngine catalog (no copied range/effect blobs on the character)

### 083.3 — Contract notes/tests for starting-loadout consumers

Document and (when call sites exist) contract-test CharacterEngine/ItemEngine reading catalog ids.

**Parent:** `083-ActionEngine-Catalog-And-Known-Actions`. **Depends on:** `083.1`.

#### Acceptance criteria

- [x] Notes or stub paths document expected consumer contract-test locations
- [x] No ItemEngine-owned parallel spell stat blocks for the same actions
- [x] Real `*.contract.test.ts` land when `026`/`036`/`025` call ActionEngine

### 083.4 — README catalog authoring + seed determinism

Authoring notes for adding actions/effects without forking spell vs class paths.

**Parent:** `083-ActionEngine-Catalog-And-Known-Actions`. **Depends on:** `083.1`, `083.2`.

#### Acceptance criteria

- [x] README documents how to add an action that reuses an existing effect
- [x] Seed/version approach is documented (deterministic fresh campaign)
- [x] Flavor-tag guidance: cosmetic only

