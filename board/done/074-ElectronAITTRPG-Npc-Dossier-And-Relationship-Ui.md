# EPIC: ElectronAITTRPG NPC dossier & relationship web UI

Build the NPC dossier modal and relationship-web view, plus the Scene/Social linking that opens a dossier from a mentioned NPC's name.

**Ported from:** the `npcDossier` / `relationshipWeb` renderer modules in AI-DND-Matrix's README, `board/done/105-npc-dossier-modal.md`, `127-npc-relationship-web-opinions-of-others.md`, `128-scene-social-person-links-npc-dossier.md`.

**Depends on:** `042-NPCEngine-Dossier-Model`, `041-NPCEngine-Relationship-Web`.

## Acceptance criteria

- [x] Dossier modal renders Traits, Facts, DM opinion, and Disposition from `042`'s single query API
- [x] Relationship web visualizes an NPC's opinions of other NPCs/PCs from `041`
- [x] Clicking a person-name link in Scene or Social text opens that NPC's dossier directly
- [x] Journal entries that mention an NPC link back to that NPC's dossier as well, matching AI-DND-Matrix's `121-journal-person-matches-open-npc-dossier`
- [x] This package's consumption of NPCEngine (`042`, `041`) is covered by a `*.contract.test.ts` here against NPCEngine's real published API
