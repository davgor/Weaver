# EPIC: CharacterEngine in-game time & rest

Port the simple day-counter model used for long rests and travel.

**Ported from:** AI-DND-Matrix's README ("In-game time: a simple day counter per campaign — long rest advances it 1 day, travel advances it by a DM-estimated, engine-clamped amount").

**Depends on:** `021-CharacterEngine-Core-Ability-Model`. **Feeds:** `058-DMEngine-Shared-Time-And-Hub-Recap` (multi-PC causality over this same counter).

## Acceptance criteria

- [x] Day counter is campaign-scoped (shared across all PCs in that campaign), not per-character
- [x] Long rest advances the counter by exactly 1 day and is the only source of full recovery (recovery rules defined alongside HP model)
- [x] Travel advances the counter by a DM-estimated amount that the engine clamps to a sane range — DMEngine cannot propose an unbounded time skip
- [x] Time-advance functions are pure and unit-tested independent of any specific travel/rest UI
