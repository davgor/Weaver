# EPIC: ItemEngine starting-gear catalog

Port the archetype starting-loadout catalog (the item-data side; `026-CharacterEngine-Archetypes-And-Starting-Loadouts` owns the selection UX/state that reads from this catalog).

**Ported from:** `board/done/047-starting-equipment-selection.md` and the preseeded content catalog work in `board/done/023-preseeded-ttrpg-content-catalog.md`.

**Depends on:** `032-ItemEngine-Item-Model-And-Inventory`. **Feeds:** `026-CharacterEngine-Archetypes-And-Starting-Loadouts`.

## Acceptance criteria

- [ ] Seed catalog of starting loadouts keyed by archetype (Fighter, Rogue, Mage, Cleric, Ranger), each resolving to valid item template references from `032`
- [ ] Starter **known-action grants** are represented alongside starting gear where an archetype grants actions at level 1 — as ActionEngine `actionId` references from `083-ActionEngine-Catalog-And-Known-Actions`, not a parallel ItemEngine spell-stat catalog
- [ ] Catalog is versioned/seedable the same way WorldEngine/RegionalEngine treat their seed data, so a fresh campaign gets deterministic starting gear
- [ ] `036.x` sub-tickets (once created) cover catalog authoring separately from the API surface defined in `032`
