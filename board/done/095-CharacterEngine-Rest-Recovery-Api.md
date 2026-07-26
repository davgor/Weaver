# EPIC: CharacterEngine rest recovery API

Close the gap left by `031-CharacterEngine-Time-And-Rest`: `longRest` today only advances the campaign day counter and does **not** perform the full recovery that epic promised (“long rest … is the only source of full recovery”). Add a first-class **rest recovery API** on CharacterEngine so long rests restore PC vitality deterministically, stay LLM-free, and remain the single recovery path Combat/DM/UI call.

**Depends on:** `023-CharacterEngine-Hp-Model`, `024-CharacterEngine-Damage-Conditions-Dying`, `031-CharacterEngine-Time-And-Rest`. **Feeds:** `058-DMEngine-Shared-Time-And-Hub-Recap` (hub/rest orchestration), WeatherEngine day advance (apply climate after rest day bump), ActionEngine lockout clear on rest (optional peer hook). Related backlog: `096-CharacterEngine-Location-Ownership` (placement facts); `097-QuestEngine-World-Quest-Seeding` (world quest catalog — CharacterEngine keeps the per-PC log).

**Out of scope:** short-rest Hit-Die spend economy (not in current product rules); HTTP/REST transport (this epic is the CharacterEngine **rest** domain API, not a web server); story invention of “you feel rested” prose (NarrationEngine).

**LLM boundary:** deterministic only — no Electron imports, no LLM invention.

## Core APIs

| Function | Behavior |
|----------|----------|
| `longRest` (extended) | Advance campaign day by exactly 1 (existing), **and** fully recover each supplied character that has CharacterEngine stats: `currentHp → maxHp`, clear rest-clearable conditions, clear dying state / Unconscious from 0 HP. |
| `previewLongRest` | Pure preview of day + per-character recovery deltas without mutating stores (for Ask-DM / UI confirm). |
| `listRestClearableConditions` | Documented, unit-tested set of conditions removed by a long rest (at minimum Unconscious from 0 HP path; poison/stun/etc. per table locked in a sub-ticket). |

## Supporting APIs

| Function | Why |
|----------|-----|
| Admin `call('longRest', …)` payload | Accept `campaignId` + `characterIds[]` (breaking-compatible: missing ids = day advance only, documented) |
| Optional ActionEngine hook | Caller-supplied `onCleared?: (characterId) => void` or documented peer call to `clearLockout` — CharacterEngine does not import ActionEngine |
| Contract tests | CharacterEngine rest ↔ HP/conditions; DMEngine consumer contract when turn/hub calls rest |

## Sub-tickets

| Id | Summary |
|----|---------|
| `095.1` | Spec rest-clearable conditions + `previewLongRest` pure shapes |
| `095.2` | `longRest` recovers HP / clears dying + rest-clearable conditions for listed characters |
| `095.3` | Endpoints + README + admin catalog payload docs |
| `095.4` | Contract tests (CharacterEngine rest recovery; DMEngine consumer if wired) |

## Acceptance criteria

- [x] Epic documents that long rest is the **only** full-recovery source and advances the campaign day by exactly 1
- [x] After `longRest({ campaignId, characterIds })`, each listed character with stats is at full HP, not dying, and free of rest-clearable conditions
- [x] Day counter behavior from `031` remains campaign-scoped and unit-tested
- [x] No CharacterEngine → ActionEngine/Electron/LLM imports; lockout clear stays a caller/peer concern
- [x] Sub-tickets `095.1`–`095.4` completed

## Sub-tickets

### 095.1 Spec rest-clearable conditions + previewLongRest

Lock which conditions a long rest clears and add a pure `previewLongRest` helper that reports day/recovery deltas without mutating stores.

**Parent:** `095-CharacterEngine-Rest-Recovery-Api`. **Depends on:** `024`, `031`.

#### Acceptance criteria

- [x] Exported `REST_CLEARABLE_CONDITIONS` (or equivalent) is unit-tested and documented in CharacterEngine README
- [x] Unconscious (and dying state) are cleared by long rest; table explicitly lists every clearable vs sticky condition
- [x] `previewLongRest({ campaignId, characterIds })` returns next day + per-character `{ fromHp, toHp, clearedConditions }` without mutating day/stats stores
- [x] No recovery mutation in this ticket (apply path is `095.2`)

### 095.2 longRest recovers HP and clears rest-clearable state

Extend `longRest` so it remains the only full-recovery source: advance day by 1 and restore each listed character’s stats.

**Parent:** `095-CharacterEngine-Rest-Recovery-Api`. **Depends on:** `095.1`.

#### Acceptance criteria

- [x] `longRest({ campaignId, characterIds })` advances campaign day by exactly 1
- [x] Each listed character with persisted stats ends at `currentHp === maxHp`, `dying === null`, and without rest-clearable conditions
- [x] Characters without stats are skipped (no throw) so travel-only campaigns still advance the day
- [x] Empty/omitted `characterIds` still advances the day (backward compatible with today’s day-only call sites) and recovers nobody
- [x] Unit tests cover damaged / dying / conditioned PCs before and after rest

### 095.3 Rest endpoints + README

Wire the extended rest API through CharacterEngine admin endpoints and document the recovery contract.

**Parent:** `095-CharacterEngine-Rest-Recovery-Api`. **Depends on:** `095.2`.

#### Acceptance criteria

- [x] `call('longRest', { campaignId, characterIds? })` and `call('previewLongRest', …)` work via the published endpoint surface
- [x] CharacterEngine README documents rest recovery (day + HP + conditions), clearable table, and that ActionEngine lockout clear is a caller concern
- [x] Root README / package table needs no new package; CharacterEngine row may mention rest recovery if it still only says “day counter”

### 095.4 Rest recovery contract tests

Pin CharacterEngine rest recovery against the real HP/conditions APIs; add or update DMEngine consumer contracts if DM already calls `longRest`.

**Parent:** `095-CharacterEngine-Rest-Recovery-Api`. **Depends on:** `095.2`, `095.3`.

#### Acceptance criteria

- [x] CharacterEngine has tests exercising rest recovery through published helpers/endpoints (stats + day) without mocking its own HP API
- [x] If DMEngine (or Electron) calls `longRest`, consumer `*.contract.test.ts` updated for the new payload/recovery behavior against real CharacterEngine
- [x] If no DM consumer exists yet, document the intended call shape in the epic/README and skip DM contract (do not invent DM orchestration in this ticket)
