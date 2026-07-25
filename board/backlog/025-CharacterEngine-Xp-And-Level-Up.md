# EPIC: CharacterEngine XP, difficulty rating & level-up ceremony

Port difficulty-rated XP and the level-up perk ceremony, including the engine fallback path that must complete a level-up even when the LLM call fails.

**Ported from:** `board/done/036-xp-awards-and-agentic-level-up-perks.md` and `board/done/061-difficulty-rated-xp.md`.

**Depends on:** `021-CharacterEngine-Core-Ability-Model`, `026-CharacterEngine-Archetypes-And-Starting-Loadouts`.

## Acceptance criteria

- [ ] XP award takes a difficulty band (`easy`…`impossible`, supplied by DMEngine/NarrationEngine) and applies a fixed fraction of the level span — the engine owns the fraction, not the LLM
- [ ] Level-up produces perk choices from `computeFeatureFromTemplate`-equivalent templates; mechanical numbers never come from free-text LLM output
- [ ] If the proposing agent call fails, an engine-only fallback perk still completes the level-up ceremony (no stuck character)
- [ ] Emergent-direction detection (repeated tagged play patterns outside the archetype kit, past a count threshold) is available as an input to level-up, producing at most a fiction-flavored `custom_feature`/`passive_feature` whose numbers still come from the template engine
- [ ] Known spells gained on level-up are recorded in the character's spell-known list (feeds `028-CharacterEngine-Journal-Logbook-Quests-Spellbook`)
