# EPIC: NPCEngine relationship web

Port the NPC-to-NPC and NPC-to-PC opinion graph.

**Ported from:** `board/done/127-npc-relationship-web-opinions-of-others.md`.

**Depends on:** `037-NPCEngine-Construction-And-Identity`, `038-NPCEngine-Memory-Isolation` (opinions are a form of memory and must respect the same isolation rule). **Feeds:** `042-NPCEngine-Dossier-Model`, `074-ElectronAITTRPG-Npc-Dossier-And-Relationship-Ui`.

## Acceptance criteria

- [ ] NPCs can hold a typed opinion (e.g. trust/fear/affection score, or stance enum) about specific other NPCs and PCs
- [ ] Opinions are readable only in the context of the NPC that holds them — this does not become a backdoor around memory isolation (`038`)
- [ ] Opinion updates are an explicit API call (DM/Narration propose, this package persists) rather than free-form world-fact writes
- [ ] Query API supports "who does NPC X have an opinion of" and "who has an opinion of subject Y" for dossier/relationship-web UI use
