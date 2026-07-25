# EPIC: DMEngine campaign export/import/backup

Port campaign portability so a full campaign (world, characters, NPCs, factions, history) can be backed up and restored.

**Ported from:** `board/done/132-campaign-export-import-backup.md`.

**Depends on:** `052-DMEngine-Campaign-Generation-Pipeline` and, transitively, every engine that owns campaign-scoped data (WorldEngine/RegionalEngine/CivilizationEngine/NPCEngine/EnemyEngine/CharacterEngine/ItemEngine).

## Acceptance criteria

- [ ] Export produces a single portable package containing everything needed to fully restore a campaign, sourced from each owning engine's export API (not a hand-rolled cross-engine dump)
- [ ] Import round-trips: export then import reproduces an equivalent campaign, verified by an automated round-trip test
- [ ] Version/schema mismatches on import are detected and reported clearly rather than silently corrupting data
- [ ] Backup format is documented so a future schema change has a defined migration path for existing exports
- [ ] This package's consumption of each owning engine's export API (WorldEngine, RegionalEngine, CivilizationEngine, NPCEngine, EnemyEngine, CharacterEngine, ItemEngine) is covered by `*.contract.test.ts` here against their real published APIs — the round-trip test in the criterion above runs through these contracts, not mocks
