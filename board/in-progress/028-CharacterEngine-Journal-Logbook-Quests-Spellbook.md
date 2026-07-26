# EPIC: CharacterEngine journal, log book, quest log & known-actions surface

Port the four character-scoped record types that make up a character's persistent play history and reference sheets. The UI may still label the fourth panel “Spellbook,” but mechanically it is the character's **known ActionEngine action ids** (spells and class actions are the same type).

**Ported from:** `board/done/025-character-log-book.md`, `027-character-journal-log.md`, `044-character-sheet-equipment-and-logbook.md`, `045-quest-log-main-and-side-quests.md`, `046-player-spellbook-modal.md`.

**Depends on:** `021-CharacterEngine-Core-Ability-Model`. **Feeds:** `056-DMEngine-Quest-Proposal-And-Tracking` (DM writes into the quest log this epic defines), `073-ElectronAITTRPG-Character-Sheet-Ui` (renders all four), `084-ActionEngine-Use-Resolution-And-Lockout` (known-action gate). Action *definitions* come from `082`/`083` — this epic stores ids only.

## Acceptance criteria

- [ ] Journal: character-authored/DM-authored narrative entries, queryable by character and (optionally) linked NPC
- [ ] Log book: structured event entries distinct from free-form journal prose
- [ ] Quest log: main and side quests with status (active/complete/failed), each with a stable id DMEngine can reference when proposing updates
- [ ] Known-actions surface (spellbook UI): known `actionId`s (not copied ActionEngine definitions), populated by starting loadout and level-up; may include both `spell` and `classAction` flavor ids
- [ ] Cross-character log-book writes are supported (an event affecting multiple PCs writes to each), matching the Campaign Hub's multi-PC model
- [ ] All four are per-character records, isolated from other characters in the same campaign except where an explicit cross-write is authored
