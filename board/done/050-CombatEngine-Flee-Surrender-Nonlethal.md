# EPIC: CombatEngine flee, surrender & non-lethal resolution

Port the three combat exits beyond "fight to the death": fleeing, surrender, and non-lethal takedown, plus the execute-defeated-foe option.

**Ported from:** `board/done/033-combat-flee-resolution.md` and `034-npc-surrender-nonlethal-victory-outcomes.md`.

**Depends on:** `048-CombatEngine-Encounter-Lifecycle`, `039-NPCEngine-Attackable-Civilian-Combat-Disposition` (writes the resulting disposition), `035-ItemEngine-Loot-Generation` (non-lethal/execute outcomes can trigger loot).

## Acceptance criteria

- [x] Flee resolution: eligibility check (e.g. not restrained/stunned), success/failure roll, and encounter-state update on success
- [x] Surrender: NPCs can yield under engine-defined conditions (e.g. low HP + hopeless odds), ending hostilities without a kill
- [x] Non-lethal victory: a defeated foe can end at 0 HP "down" rather than dead when the attacker chooses non-lethal resolution
- [x] Execute: explicitly finishing a helpless/surrendered foe is a distinct, deliberate action — never an automatic side effect of winning
- [x] All four outcomes write the resulting disposition through `039-NPCEngine-Attackable-Civilian-Combat-Disposition`'s API, not a parallel CombatEngine-only status field
- [x] This package's consumption of `039`'s disposition-write API and `035`'s loot-generation API is each covered by a `*.contract.test.ts` here against their real published APIs
