# EPIC: ItemEngine weapon enchantments & multi-type damage

Port weapon enchantment overlays and multi-damage-type weapons so CombatEngine can resolve elemental/enchanted hits without inventing numbers.

**Ported from:** `board/done/037-weapon-enchantments-and-multi-type-damage.md`.

**Depends on:** `032-ItemEngine-Item-Model-And-Inventory`, `024-CharacterEngine-Damage-Conditions-Dying` (shared damage-type taxonomy). **Feeds:** `049-CombatEngine-Hit-Damage-Crit-Conditions`.

## Acceptance criteria

- [x] An item instance can carry one or more enchantment overlays, each contributing a damage-type + bonus (or on-hit effect reference)
- [x] Weapons can deal more than one damage type (e.g. a flaming sword deals Physical + Fire) with each type resolved independently against target resistance/vulnerability
- [x] Enchantment application/removal is a mutation API on this package (`character-item-modifications`-equivalent), not something other packages hand-roll
- [x] CombatEngine's contract test confirms it reads enchantment overlays from this package rather than duplicating the data
- [x] This package's own consumption of `024-CharacterEngine-Damage-Conditions-Dying`'s damage-type taxonomy is covered by a `*.contract.test.ts` here against CharacterEngine's real published API
