# EPIC: EnemyEngine dynamic encounter foe generation

Port on-demand foe spawning for encounters and quests, plus the referential-integrity hardening AI-DND-Matrix had to add after shipping it.

**Ported from:** `board/done/116-dynamic-encounter-foe-generation.md` and the quest-foe-assignment FK hardening in `board/done/111-quest-proposal-invalid-fk-hardening.md`.

**Depends on:** `045-EnemyEngine-Bestiary-Catalog`. **Feeds:** `048-CombatEngine-Encounter-Lifecycle`, `051-CombatEngine-Dynamic-Start-And-Triggers`.

## Acceptance criteria

- [ ] Given a region/scene context, generate an encounter-appropriate foe set from the bestiary catalog (not invented ad hoc by the LLM)
- [ ] Quest-to-foe assignment references valid bestiary entries only — assigning a foe id that doesn't exist in the catalog is rejected at the API boundary, not caught later as a runtime crash
- [ ] Foe generation is scoped (region/difficulty/tag) so DMEngine can request "something appropriate here" without hand-picking a species
- [ ] Contract test proves CombatEngine can hydrate a full combatant from a generated foe reference alone
