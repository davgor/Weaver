# EPIC: ElectronAITTRPG character sheet UI

Build the character sheet overlay: stats, equipment, journal, log book, quest log, and spellbook.

**Ported from:** the `characterSheet` renderer module in AI-DND-Matrix's README, `board/done/044-character-sheet-equipment-and-logbook.md`, `045-quest-log-main-and-side-quests.md`, `046-player-spellbook-modal.md`.

**Depends on:** `028-CharacterEngine-Journal-Logbook-Quests-Spellbook`, `032-ItemEngine-Item-Model-And-Inventory`.

## Acceptance criteria

- [ ] Sheet displays live ability scores/modifiers, HP, AC, and equipped items sourced from CharacterEngine/ItemEngine APIs (no cached/stale duplication)
- [ ] Journal, log book, quest log (main + side), and spellbook each have a dedicated panel/tab within the sheet
- [ ] Equipment panel supports equip/unequip through ItemEngine's API and reflects slot constraints (main/off hand, shield, accessories)
- [ ] Sheet opens as a non-blocking overlay over the play view, matching AI-DND-Matrix's UX (no full navigation away from play)
- [ ] This package's consumption of CharacterEngine (`028`) and ItemEngine (`032`) is each covered by `*.contract.test.ts` here against their real published APIs
