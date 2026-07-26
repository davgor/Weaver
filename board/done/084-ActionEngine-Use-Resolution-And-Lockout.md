# EPIC: ActionEngine use resolution & Action-turn lockout

Resolve **using** an action: validate known-action + range + catalog cost, apply listed effects to targets, and enforce Action-turn lockout (no mana). CombatEngine owns encounter turn state; ActionEngine owns whether the ability use is legal and which effects/costs apply.

**Depends on:** `082-ActionEngine-Ability-Effect-And-Range-Model`, `083-ActionEngine-Catalog-And-Known-Actions`, `048-CombatEngine-Encounter-Lifecycle` (turn/Action slot to lock), `028-CharacterEngine-Journal-Logbook-Quests-Spellbook` (known-action list source). **Feeds:** `053-DMEngine-Turn-Routing` (use-action intents), `072-ElectronAITTRPG-Play-View-Ui` (lockout chrome), Combat hit/condition flows that consume applied effects (`049`).

**LLM boundary:** deterministic — ignore LLM-proposed durations, ranges, and costs; only catalog values apply. Narration describes after accept.

## Sub-tickets

| Id | Summary |
|----|---------|
| `084.1` | `validateUse` / `useAction` API: known-action gate, range check inputs, reject unknown ids |
| `084.2` | Apply action `effects[]` to targets (at least `slow_movement`), unit-tested |
| `084.3` | Action-turn lockout from catalog cost; coordinate with CombatEngine turn state (contract test) |
| `084.4` | `meleeWeapon` range resolution via Item/Combat equipped reach (contract test; no invented reach) |
| `084.5` | README + explicit: no mana; flavor tags do not fork resolution |

## Acceptance criteria

- [x] Use API rejects unknown or unknown-to-character action ids; enforces catalog Action-turn cost
- [x] Successful use applies the action's effect list (Ice Bolt and Hamstring Strike both apply `slow_movement`)
- [x] Lockout duration/cost comes only from catalog — LLM-proposed values ignored in tests
- [x] `meleeWeapon` range defers reach to Item/Combat inputs; feet ranges compare numeric distance inputs
- [x] Consumer `*.contract.test.ts` cover CharacterEngine known-actions and CombatEngine turn lockout call edges
- [x] Explicit: no mana pool; Electron/DM call ActionEngine rather than reimplementing use/lockout
- [x] Sub-tickets listed above exist as `board/backlog/084.*` files; none implemented until separately completed

## Sub-tickets

### 084.1 084.1 — validateUse / useAction API

Known-action gate, structured range inputs, reject unknown ids. Effect application can be stubbed until `084.2`.

**Parent:** `084-ActionEngine-Use-Resolution-And-Lockout`. **Depends on:** `083`.

#### Acceptance criteria

- [x] Rejects unknown action ids and actions not known to the character
- [x] Accepts distance/reach inputs appropriate to range kind (unit-tested)
- [x] Does not trust LLM-supplied cost/range overrides

### 084.2 084.2 — Apply action effects to targets

Apply the action's `effects[]` (at least `slow_movement`) as structured outcomes.

**Parent:** `084-ActionEngine-Use-Resolution-And-Lockout`. **Depends on:** `084.1`.

#### Acceptance criteria

- [x] Successful use returns/applies effect payloads for each effect on the action
- [x] Ice Bolt and Hamstring Strike both yield `slow_movement` in tests
- [x] Effect magnitudes come from catalog/effect defs, not caller free text

### 084.3 084.3 — Action-turn lockout + CombatEngine contract

Catalog turn cost locks the caster's Action slot via CombatEngine encounter state.

**Parent:** `084-ActionEngine-Use-Resolution-And-Lockout`. **Depends on:** `084.1`, `048-CombatEngine-Encounter-Lifecycle`.

#### Acceptance criteria

- [x] Successful use requests/applies lockout for catalog turn count
- [x] `*.contract.test.ts` exercises CombatEngine's real published turn/Action API
- [x] No mana pool; second Action in lockout window fails closed

### 084.4 084.4 — meleeWeapon range resolution via Item/Combat

Resolve `meleeWeapon` range using equipped weapon reach from Item/Combat inputs.

**Parent:** `084-ActionEngine-Use-Resolution-And-Lockout`. **Depends on:** `084.1`, ItemEngine equip surface (`032`+).

#### Acceptance criteria

- [x] `meleeWeapon` use compares caller-supplied distance to resolved weapon reach (not a hardcoded spell-style feet value inside the action def)
- [x] Contract or fixture tests prove reach comes from item/combat inputs
- [x] Feet-range actions still use numeric feet comparison unchanged

### 084.5 084.5 — README: no mana; flavor does not fork resolution

**Parent:** `084-ActionEngine-Use-Resolution-And-Lockout`. **Depends on:** `084.2`, `084.3`, `084.4`.

#### Acceptance criteria

- [x] ActionEngine README documents use/lockout APIs and epics `082`–`084`
- [x] Explicit: no mana; LLM durations/costs ignored; flavor tags do not fork resolution
- [x] DM/Electron/Combat call paths documented
