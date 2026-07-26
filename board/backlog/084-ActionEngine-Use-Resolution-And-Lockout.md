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

- [ ] Use API rejects unknown or unknown-to-character action ids; enforces catalog Action-turn cost
- [ ] Successful use applies the action's effect list (Ice Bolt and Hamstring Strike both apply `slow_movement`)
- [ ] Lockout duration/cost comes only from catalog — LLM-proposed values ignored in tests
- [ ] `meleeWeapon` range defers reach to Item/Combat inputs; feet ranges compare numeric distance inputs
- [ ] Consumer `*.contract.test.ts` cover CharacterEngine known-actions and CombatEngine turn lockout call edges
- [ ] Explicit: no mana pool; Electron/DM call ActionEngine rather than reimplementing use/lockout
- [ ] Sub-tickets listed above exist as `board/backlog/084.*` files; none implemented until separately completed
