# EPIC: CharacterEngine race & background selection

Port the campaign-scoped race and background rosters used during onboarding.

**Ported from:** `board/done/049-race-selection.md`, `050-character-backgrounds.md`.

**Depends on:** `021-CharacterEngine-Core-Ability-Model`. **Feeds:** `061-DMEngine-Guided-Character-Creation-Orchestration` (identity chat references chosen race/background), `037-NPCEngine-Construction-And-Identity` (NPCs reuse the same race roster).

## Acceptance criteria

- [x] Race is campaign-scoped and "realized once" — lore text is generated the first time a race is picked in a campaign and reused after, not regenerated per character
- [x] Background roster supports both catalog entries and a personal-story generation hook (LLM-authored flavor layered on an engine-defined background record)
- [x] Race/background selection persists against the character and is queryable by DMEngine for grounding
- [x] Mundane/human-flavored race generation is supported without special-casing "human" as a lesser option (matches AI-DND-Matrix's `069-mundane-human-race-generation`)
