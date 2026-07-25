# EPIC: NPCEngine memory isolation

Port the non-negotiable NPC memory rule from AI-DND-Matrix: no NPC can know something only another NPC experienced.

**Ported from:** AI-DND-Matrix's Core Design principle #3 ("NPCs have isolated memory... Each NPC has its own private memory log; it only ever sees its own memories plus world facts explicitly tagged to its region/faction").

**Depends on:** `037-NPCEngine-Construction-And-Identity`. **Feeds:** `042-NPCEngine-Dossier-Model`, DMEngine/NarrationEngine grounding for any NPC line of dialogue.

## Acceptance criteria

- [ ] Each NPC has its own private memory log, keyed to that NPC only
- [ ] World facts are readable by an NPC only when explicitly tagged to that NPC's region or faction — untagged or other-region/faction facts are excluded by the query API itself, not by caller discipline
- [ ] A contract test proves that querying NPC A's grounding context never returns NPC B's private memories
- [ ] Memory-write API records provenance (which event/scene produced the memory) so later audits can trace a leak back to its source if the isolation rule is ever violated
