# EPIC: CharacterEngine core ability & resolution model

Stand up `packages/CharacterEngine` (`@weaver/character-engine`): the deterministic home for player-character facts that don't belong to CombatEngine (combat-session state), ItemEngine (items), or NPCEngine/EnemyEngine (non-player actors). This epic lays the foundation other CharacterEngine epics build on: the four abilities, modifiers, and the core `d20 + mod (+ proficiency) vs DC/AC` resolution used everywhere a check is made.

**Ported from:** AI-DND-Matrix's rules engine (`board/done/004-engine.md` and the "Rules Engine" section of its README) — Body/Agility/Mind/Presence, `floor((score-10)/2)` modifiers, advantage/disadvantage (2d20 take higher/lower), no fixed skill list (DM flags ability + proficiency boolean; engine owns the bonus amount), AC = `10 + Agility mod + armor`.

**Depends on:** none (foundation epic, parallel to `012-WorldEngine-Chunked-Map-Store`). **Feeds:** every other CharacterEngine epic, plus CombatEngine (`048-CombatEngine-Encounter-Lifecycle`).

**LLM boundary:** deterministic only — no Electron imports, no LLM calls. DMEngine/NarrationEngine may propose which ability + whether proficiency applies; this package always owns the actual bonus math and the roll.

## Acceptance criteria

- [ ] Four abilities (Body, Agility, Mind, Presence) with `floor((score-10)/2)` modifier math, unit-tested at score boundaries
- [ ] Core resolution API: `d20 + abilityMod + (proficiencyBonus if proficient) vs target`, with advantage/disadvantage support
- [ ] AC formula (`10 + Agility mod + armor bonus`) as a pure function consuming ItemEngine-supplied armor bonus
- [ ] Package scaffolded matching sibling engines (`health` / `listEndpoints` / `call`), added to root README package table and `build:engines`
- [ ] Wired into both existing engine registries — `ElectronAdmin/src/main/index.ts`'s `engines` array (so it shows up in AI ADMIN's endpoint tester, per board `078`) and `ElectronAITTRPG/src/shared/engineHealth.ts`'s `REQUIRED_ENGINE_IDS` (so boot health checks for it) — these are hardcoded lists, not auto-discovered, and are easy to forget since every sibling engine is already in both
- [ ] Explicit: deterministic, LLM-free; Electron apps and DMEngine call this package, they do not reimplement resolution math
