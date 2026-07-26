# EPIC: ItemEngine encounter & quest loot generation

Port deterministic loot-table generation so encounter and quest rewards come from engine tables, with the DM narrating them rather than inventing them.

**Ported from:** `board/done/035-encounter-and-quest-loot.md`.

**Depends on:** `032-ItemEngine-Item-Model-And-Inventory`. **Feeds:** `054-DMEngine-World-Mutations-And-Live-Population` and combat resolution (`050-CombatEngine-Flee-Surrender-Nonlethal`) as the source of what drops.

## Acceptance criteria

- [ ] Loot table API takes an encounter/quest difficulty or tag and returns a deterministic (seedable) set of item instances
- [ ] Loot generation is pure/unit-tested — no LLM call inside this package to decide what drops
- [ ] Generated loot integrates with the item template catalog from `032` rather than fabricating ad hoc item shapes
- [ ] DMEngine/NarrationEngine consume generated loot for flavor text; they cannot alter the underlying item facts
