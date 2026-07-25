# EPIC: NPCEngine dossier data model

Port the NPC dossier record: the structured Traits → Facts → persisted DM opinion → Disposition pipeline that backs the dossier modal.

**Ported from:** `board/done/105-npc-dossier-modal.md`.

**Depends on:** `037-NPCEngine-Construction-And-Identity`, `038-NPCEngine-Memory-Isolation`, `041-NPCEngine-Relationship-Web`. **Feeds:** `074-ElectronAITTRPG-Npc-Dossier-And-Relationship-Ui`.

## Acceptance criteria

- [ ] Dossier record aggregates Traits (identity facts), Facts (world-fact mentions tied to this NPC), a persisted DM opinion field, and current Disposition into one queryable shape
- [ ] Dossier assembly reads from `037`/`038`/`041`/`039` rather than duplicating their data
- [ ] Dossier is per-NPC and campaign-scoped; no cross-campaign leakage
- [ ] API returns a UI-ready shape so `074-ElectronAITTRPG-Npc-Dossier-And-Relationship-Ui` doesn't need to assemble the dossier itself
