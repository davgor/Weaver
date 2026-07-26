# EPIC: ActionEngine ability, effect & range model

Stand up `packages/ActionEngine` (`@weaver/action-engine`): the deterministic home for **usable abilities** and the **effects** they apply. Spells and class actions are the **same mechanical type** — an `Action` with flavor tags — differing only in presentation and range expression, not in engine path.

**Design intent (product rule):**
- Ice Bolt and Hamstring Strike can share the same effect (`slow_movement`) while differing in range (`{ kind: 'feet', amount: 30 }` vs `{ kind: 'meleeWeapon' }`).
- Flavor tags (`spell` | `classAction` | …) are non-mechanical; Narration/UI may use them, rules must not branch on flavor.
- No mana. Action-turn cost / lockout is catalog-driven (resolved in `084`).

**Ported from:** `REBUILD_SPEC` spells/abilities Action-lockout rule + `src/shared/spells/SPEC.md` intent, generalized so class actions are first-class equals.

**Depends on:** none (foundation epic for this package; may proceed in parallel with Character/Item foundations). **Feeds:** `083-ActionEngine-Catalog-And-Known-Actions`, `084-ActionEngine-Use-Resolution-And-Lockout`, CombatEngine consumers (`048`+), CharacterEngine known-action surfaces (`028`).

**LLM boundary:** deterministic only — no Electron, no LLM invention of ranges, costs, or effect magnitudes. Narration describes an action only after ActionEngine (+ Combat when in encounter) accepts it.

## Core model

| Concept | Owns | Notes |
|---------|------|-------|
| **Effect** | Reusable mechanical outcome (`slow_movement`, damage overlays later, conditions, …) | Identified by stable `effectId`; parameters are typed, not free text |
| **Range** | How far an action may reach | Discriminated union: `{ kind: 'feet', amount: number }` **or** `{ kind: 'meleeWeapon' }` (reach resolved at use time via Item/Combat equipped weapon — ActionEngine does not invent weapon reach) |
| **Action** | One usable ability definition | `actionId`, display/flavor metadata, `range`, `effects[]`, Action-turn `cost`, optional grants/requirements keys |
| **Flavor** | `spell` / `classAction` / similar tags | **Cosmetic only** — same validation and resolution path |

### Example definitions (epic-level, locked in sub-tickets)

| actionId | flavor | range | effects |
|----------|--------|-------|---------|
| `ice_bolt` | spell | feet: 30 | `slow_movement` |
| `hamstring_strike` | classAction | meleeWeapon | `slow_movement` |

## Sub-tickets

| Id | Summary |
|----|---------|
| `082.1` | Scaffold `packages/ActionEngine` + Admin/AITTRPG registry wiring |
| `082.2` | Effect model + registry API (stable ids, typed params), unit-tested |
| `082.3` | Range model (`feet` \| `meleeWeapon`) + validation helpers |
| `082.4` | Action definition model (unified; flavor non-mechanical) + CRUD/query |
| `082.5` | Package README + root README planned→current wiring notes + LLM-free boundary |

## Acceptance criteria

- [x] Package scaffolded matching sibling engines (`health` / `listEndpoints` / `call`), on `build:engines`, registered in ElectronAdmin + AITTRPG `REQUIRED_ENGINE_IDS`
- [x] Effect and Action are distinct types; multiple Actions may reference the same `effectId`
- [x] Range supports fixed feet and `meleeWeapon` without separate spell vs class-action code paths
- [x] Flavor tags cannot change validation outcomes in unit tests (same effects+range+cost ⇒ same accept/reject)
- [x] Explicit: deterministic, LLM-free; Electron/DM/Combat call this package for ability/effect facts
- [x] Sub-tickets listed above exist as `board/backlog/082.*` files; none implemented until separately completed

## Sub-tickets

### 082.1 082.1 — Scaffold ActionEngine package + registry wiring

Create `packages/ActionEngine` (`@weaver/action-engine`) as a deterministic engine stub with health/catalog surface matching siblings. Wire into `build:engines`, ElectronAdmin `engines` array, and AITTRPG `REQUIRED_ENGINE_IDS`. No ability/effect APIs yet.

**Parent:** `082-ActionEngine-Ability-Effect-And-Range-Model`.

#### Acceptance criteria

- [x] Package exists with tsc build, Vitest health/listEndpoints/call/unknown-endpoint coverage
- [x] Root `build:engines` includes `@weaver/action-engine`
- [x] ElectronAdmin and ElectronAITTRPG register the package (Admin engines array + `REQUIRED_ENGINE_IDS`)
- [x] Root README package table lists ActionEngine (no longer "planned-only" once scaffold lands)

### 082.2 082.2 — Effect model + registry API

Reusable effect definitions with stable ids and typed parameters (starting with `slow_movement`).

**Parent:** `082-ActionEngine-Ability-Effect-And-Range-Model`. **Depends on:** `082.1`.

#### Acceptance criteria

- [x] Effect registry can define/get effects by `effectId`
- [x] `slow_movement` (or equivalent) is expressible with typed params, unit-tested
- [x] No Electron/LLM imports; effects are data + pure helpers

### 082.3 082.3 — Range model (feet | meleeWeapon)

Discriminated range union and validation helpers. No weapon-reach invention — `meleeWeapon` is a token resolved at use time.

**Parent:** `082-ActionEngine-Ability-Effect-And-Range-Model`. **Depends on:** `082.1`.

#### Acceptance criteria

- [x] Range type supports `{ kind: 'feet', amount: number }` and `{ kind: 'meleeWeapon' }`
- [x] Helpers validate/reject malformed ranges (unit-tested)
- [x] No separate spell-range vs class-action-range types

### 082.4 082.4 — Action definition model (unified)

Action definitions reference range + effects + turn cost; flavor tags are non-mechanical.

**Parent:** `082-ActionEngine-Ability-Effect-And-Range-Model`. **Depends on:** `082.2`, `082.3`.

#### Acceptance criteria

- [x] Action CRUD/query by `actionId` with range, effects[], cost, flavor tags
- [x] Unit test: two actions sharing an effect id remain distinct actions
- [x] Unit test: changing only flavor tags does not change mechanical equality helpers used by validation

### 082.5 082.5 — Package README + LLM-free boundary

Document ActionEngine role: unified abilities, shared effects, typed ranges.

**Parent:** `082-ActionEngine-Ability-Effect-And-Range-Model`. **Depends on:** `082.1`, `082.4`.

#### Acceptance criteria

- [x] `packages/ActionEngine/README.md` covers role, LLM/Electron boundary, build/test, shipped APIs
- [x] Explicit: spells and class actions share one resolution path; Combat/Character/DM call this package
- [x] Planned epics `083`/`084` referenced

