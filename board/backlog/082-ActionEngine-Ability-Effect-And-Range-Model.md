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

- [ ] Package scaffolded matching sibling engines (`health` / `listEndpoints` / `call`), on `build:engines`, registered in ElectronAdmin + AITTRPG `REQUIRED_ENGINE_IDS`
- [ ] Effect and Action are distinct types; multiple Actions may reference the same `effectId`
- [ ] Range supports fixed feet and `meleeWeapon` without separate spell vs class-action code paths
- [ ] Flavor tags cannot change validation outcomes in unit tests (same effects+range+cost ⇒ same accept/reject)
- [ ] Explicit: deterministic, LLM-free; Electron/DM/Combat call this package for ability/effect facts
- [ ] Sub-tickets listed above exist as `board/backlog/082.*` files; none implemented until separately completed
