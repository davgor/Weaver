# EPIC: NPCEngine construction & identity bundle

Give `@weaver/npc-engine` its core construction pipeline: turning a CivilizationEngine placeholder slot into a full NPC record with stats, race, alignment/temperament, and a speaking-style seed.

**Ported from:** `board/done/028-alignment-temperament-and-non-speaking-creatures.md`, `052-npc-core-identity-bundle.md`, `068-npc-traits-show-race.md`.

**Depends on:** `016-CivilizationEngine-Settlement-Placement` (claims an NPC placeholder slot), `021-CharacterEngine-Core-Ability-Model` (shares ability/modifier math), `029-CharacterEngine-Race-And-Background-Selection` (reuses the campaign race roster). **Feeds:** every other NPCEngine epic.

**LLM boundary:** stats/identity construction is deterministic; display names and dialogue flavor are proposed by NarrationEngine/DMEngine and only attached here as facts once accepted — this package does not invent them itself.

## Acceptance criteria

- [x] `ClaimNpcPlaceholder` (from CivilizationEngine) → construct NPC record: ability scores, race, alignment, temperament, and non-speaking-creature flag where applicable
- [x] NPC identity bundle groups race + background + alignment + temperament as one coherent, queryable record (not scattered fields callers must assemble themselves)
- [x] Non-speaking creatures (animals, constructs) are a supported identity shape that skips speaking-style/dialogue fields entirely rather than leaving them empty
- [x] Package scaffolded matching sibling engines, added to root README package table and `build:engines`
- [x] Explicit: deterministic construction only; names/dialogue flavor come from NarrationEngine/DMEngine proposals, not invented here
- [x] This package's consumption of CivilizationEngine's placeholder-slot API and CharacterEngine's ability-modifier/race-roster APIs (`016`, `021`, `029`) is each covered by a `*.contract.test.ts` here against their real published APIs — the shared ability math is called, not re-implemented, so the two packages can't drift
