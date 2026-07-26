# EPIC: DMEngine quest proposal & tracking orchestration

Port DM-side quest proposal and progress tracking against the character-scoped quest log.

**Ported from:** `board/done/045-quest-log-main-and-side-quests.md` (DM half) and the FK-hardening lessons in `111-quest-proposal-invalid-fk-hardening.md`.

**Depends on:** `028-CharacterEngine-Journal-Logbook-Quests-Spellbook` (owns the quest log storage this epic writes into).

## Acceptance criteria

- [x] DMEngine proposes new quests (main or side) and progress updates through `028`'s quest-log API — it does not hold a shadow quest list
- [x] Quest proposals referencing an NPC/place/item that doesn't exist are rejected at the API boundary with a typed error, not persisted as a dangling reference
- [x] Quest completion/failure transitions are explicit calls, not inferred from narration text
- [x] This package's consumption of `028`'s quest-log API is covered by a `*.contract.test.ts` here against CharacterEngine's real published API, proving DMEngine can propose, update, and complete a quest end-to-end against it (no mocking CharacterEngine's public surface)
