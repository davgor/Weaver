# EPIC: CharacterEngine rest recovery API

Close the gap left by `031-CharacterEngine-Time-And-Rest`: `longRest` today only advances the campaign day counter and does **not** perform the full recovery that epic promised (“long rest … is the only source of full recovery”). Add a first-class **rest recovery API** on CharacterEngine so long rests restore PC vitality deterministically, stay LLM-free, and remain the single recovery path Combat/DM/UI call.

**Depends on:** `023-CharacterEngine-Hp-Model`, `024-CharacterEngine-Damage-Conditions-Dying`, `031-CharacterEngine-Time-And-Rest`. **Feeds:** `058-DMEngine-Shared-Time-And-Hub-Recap` (hub/rest orchestration), WeatherEngine day advance (apply climate after rest day bump), ActionEngine lockout clear on rest (optional peer hook). Related CharacterEngine backlog: `096-CharacterEngine-Location-Ownership` (placement facts; independent of rest recovery).

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

- [ ] Epic documents that long rest is the **only** full-recovery source and advances the campaign day by exactly 1
- [ ] After `longRest({ campaignId, characterIds })`, each listed character with stats is at full HP, not dying, and free of rest-clearable conditions
- [ ] Day counter behavior from `031` remains campaign-scoped and unit-tested
- [ ] No CharacterEngine → ActionEngine/Electron/LLM imports; lockout clear stays a caller/peer concern
- [ ] Sub-tickets `095.1`–`095.4` completed
