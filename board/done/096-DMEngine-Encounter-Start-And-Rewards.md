# EPIC: DMEngine encounter start + XP/loot/level-up in the play loop

Start ad-hoc or bestiary-backed encounters from play routing, and on victory award XP / loot and surface level-up through CharacterEngine and ItemEngine APIs already shipped.

**Why now:** CombatEngine `051` can `startAdHocEncounter` and CharacterEngine/ItemEngine own XP/loot/level-up, but the turn router never starts encounters or awards rewards — combat requires a pre-supplied `encounterId` and ends without progression.

**Depends on:** `051-CombatEngine-Dynamic-Start-And-Triggers`, `025-CharacterEngine-Xp-And-Level-Up`, `035-ItemEngine-Loot-Generation`, `094-DMEngine-Combat-Resolution-Orchestration`.

## Acceptance criteria

- [x] Hostile/ad-hoc play intents can start an encounter through CombatEngine without a pre-supplied encounter id
- [x] Encounter victory awards XP via CharacterEngine and loot via ItemEngine/CombatEngine outcome APIs
- [x] Level-up when XP crosses a threshold is surfaced in the turn result for UI ceremony (numbers from CharacterEngine, not LLM)
- [x] No orphaned active encounters after flee success / full defeat resolution
- [x] Consumer `*.contract.test.ts` covers DMEngine → CombatEngine start and CharacterEngine XP/level-up APIs
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready
