# EPIC: ItemEngine item model & inventory slots

Give `@weaver/item-engine` its core domain model: item definitions, character-held instances, and equipment slots — the foundation every other ItemEngine epic builds on.

**Ported from:** `board/done/024-item-tracking-and-equipment.md` and the "Inventory/economy" section of AI-DND-Matrix's README (narrative item list with equipment slots including main hand / off hand / shield / accessories).

**Depends on:** none (foundation epic for this package). **Feeds:** `033`–`036` (all other ItemEngine epics), CombatEngine (`049-CombatEngine-Hit-Damage-Crit-Conditions` reads equipped weapon/armor), CharacterEngine (`026-CharacterEngine-Archetypes-And-Starting-Loadouts` assigns starting items).

**LLM boundary:** deterministic only — no Electron, no invented item stats. NarrationEngine may describe an item in prose but must query this package for the facts first.

## Acceptance criteria

- [ ] Item template (definition) and item instance are distinct types — instances reference a template plus instance-specific state (durability, charges, custom name, enchantment refs)
- [ ] Equipment slots cover at least: main hand, off hand, shield, armor, and a generic accessories list
- [ ] Create / equip / unequip / query APIs for a character's inventory, all unit-tested
- [ ] Package scaffolded matching sibling engines, added to root README package table and `build:engines`
- [ ] Explicit: no invented loot stats in prose-only paths — NarrationEngine and DMEngine must read item facts from this package
