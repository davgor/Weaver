# EPIC: CharacterEngine archetypes & starting loadout selection

Port the five seed archetypes and the starting-loadout selection flow (state/selection side; the loadout catalog itself is ItemEngine's data).

**Ported from:** `board/done/047-starting-equipment-selection.md` and `board/done/093-fighter-greatsword-starting-weapon.md`.

**Depends on:** `021-CharacterEngine-Core-Ability-Model`, `036-ItemEngine-Starting-Gear-Catalog` (catalog data this epic selects from). **Feeds:** `025-CharacterEngine-Xp-And-Level-Up` (L1–20 progression envelope), `061-DMEngine-Guided-Character-Creation-Orchestration`, `070-ElectronAITTRPG-Onboarding-Wizard-Ui`.

## Acceptance criteria

- [x] Five seed archetypes (Fighter, Rogue, Mage, Cleric, Ranger), levels 1–20, each with a default per-archetype starting weapon/kit
- [x] Starting-loadout selection persists the chosen gear + known ActionEngine `actionId` set against the character before onboarding continues
- [x] Archetype identity is a stable key other engines (CombatEngine, ItemEngine) can key perk/feature templates and default gear off of
- [x] Unit tests cover each archetype's default loadout resolving to valid ItemEngine item references
- [x] This package's consumption of `036-ItemEngine-Starting-Gear-Catalog`'s catalog API is covered by a `*.contract.test.ts` here that exercises ItemEngine's real published API (no mocking its public surface), per delivery-standards' cross-package contract-test rule
