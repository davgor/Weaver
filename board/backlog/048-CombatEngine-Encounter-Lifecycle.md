# EPIC: CombatEngine encounter lifecycle & initiative

Give `@weaver/combat-engine` its first real behavior: starting an encounter, rolling initiative once, and running the Action + Movement turn structure.

**Ported from:** `board/done/031-combat-encounter-mode.md` and the "Combat" section of AI-DND-Matrix's README (initiative rolled once per encounter (`d20 + Agility`); one Action + Movement per turn; typed combat actions in the same free-text box as exploration).

**Depends on:** `021-CharacterEngine-Core-Ability-Model` (Agility mod for initiative), `037-NPCEngine-Construction-And-Identity` / `045-EnemyEngine-Bestiary-Catalog` (combatants come from these packages). **Feeds:** `049`–`051` (remaining CombatEngine epics), DMEngine turn routing (`053-DMEngine-Turn-Routing`), ActionEngine use/lockout (`084-ActionEngine-Use-Resolution-And-Lockout` — Combat owns turn/Action slots; ActionEngine owns ability legality, effects, and catalog turn cost).

**LLM boundary:** deterministic — no Electron, no LLM invention of outcomes. DMEngine decides *when* combat starts and narrates it; this package owns encounter turn/hit resolution. **Ability definitions and effect catalogs live in ActionEngine**, not here.

## Acceptance criteria

- [ ] `startEncounter` rolls initiative once (`d20 + Agility mod` per combatant) and produces a stable turn order
- [ ] Each combatant's turn allows one Action + Movement; the engine rejects a second Action in the same turn
- [ ] Encounter state (active combatants, turn order, current turn, round count) is durable and queryable mid-encounter, not held only in memory
- [ ] Package scaffolded matching sibling engines, added to root README package table and `build:engines`
- [ ] Combat actions share the same "typed free-text" input contract DMEngine already routes exploration actions through — no separate combat-only input mode required at this layer
- [ ] This package's consumption of CharacterEngine's ability-modifier API (`021`) and combatant hydration from NPCEngine (`037`) / EnemyEngine (`045`) is each covered by a `*.contract.test.ts` here against their real published APIs
