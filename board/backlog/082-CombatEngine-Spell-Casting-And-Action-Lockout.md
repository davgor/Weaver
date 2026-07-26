# EPIC: CombatEngine spell casting & Action lockout

Port the rebuild rule that spells/abilities cost **turns** (Action lockout), not mana: cast resolution reads cost from a deterministic catalog, applies lockout on the caster's combat/turn state, and never trusts LLM-proposed durations.

**Ported from:** `REBUILD_SPEC` rules table ("Spells/abilities | Cost turns (Action lockout), not mana; cost from catalog, not LLM duration") and `src/shared/spells/SPEC.md` intent.

**Depends on:** `048-CombatEngine-Encounter-Lifecycle` (turn/encounter state to lock), `028-CharacterEngine-Journal-Logbook-Quests-Spellbook` (known spells list), `036-ItemEngine-Starting-Gear-Catalog` (or successor spell catalog seed — starter spells live with gear catalog until a dedicated catalog module exists). **Feeds:** `053-DMEngine-Turn-Routing` (cast intents), `072-ElectronAITTRPG-Play-View-Ui` (lockout chrome).

**LLM boundary:** deterministic only — catalog owns cost; CombatEngine owns lockout/resolution; Narration may describe the cast after the engine accepts it.

## Sub-tickets

| Id | Summary |
|----|---------|
| `082.1` | Spell catalog cost types + cast request validation |
| `082.2` | Apply Action lockout on successful cast (turn count from catalog) |
| `082.3` | CharacterEngine known-spell gate + consumer contract test |
| `082.4` | README / LLM-free boundary: ignore LLM-proposed durations |

## Acceptance criteria

- [ ] Cast API rejects unknown spell ids and enforces catalog Action-turn cost (unit-tested)
- [ ] Successful cast applies Action lockout on the caster for the catalog-defined turn count
- [ ] LLM-proposed durations/costs are ignored — only catalog values apply
- [ ] Spellbook/known-spell checks go through CharacterEngine data (consumer `*.contract.test.ts` when the call lands)
- [ ] Explicit: no mana pool; Electron/DM call this package rather than reimplementing lockout
- [ ] Sub-tickets listed above exist as `board/backlog/082.*` files; none implemented until separately completed
