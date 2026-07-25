# EPIC: NPCEngine attackable NPCs, civilian stats & defeat disposition

Port the civilian-vs-combat-tier distinction and the disposition states a defeated NPC can end up in.

**Ported from:** `board/done/032-attackable-npcs-civilian-stats-and-defeat-disposition.md` and `034-npc-surrender-nonlethal-victory-outcomes.md`.

**Depends on:** `037-NPCEngine-Construction-And-Identity`, `023-CharacterEngine-Hp-Model` (civilian default HP, catalog hydration). **Feeds:** `050-CombatEngine-Flee-Surrender-Nonlethal` (combat resolution reads/writes disposition here).

## Acceptance criteria

- [ ] Civilian NPCs default to a fixed baseline (10 HP, no combat tier) unless explicitly promoted to a combat-capable stat block
- [ ] Catalog/combat-tier NPCs hydrate HP and combat stats from the shared HP model (`023`), not a separate formula
- [ ] Defeat disposition is a first-class state: yielded/surrendered, fled, non-lethally defeated, or executed — each distinct from "dead"
- [ ] Disposition transitions are exposed as an API CombatEngine calls at encounter resolution, not mutated ad hoc by narration
- [ ] This package's consumption of `023-CharacterEngine-Hp-Model`'s hydration function is covered by a `*.contract.test.ts` here against CharacterEngine's real published API
