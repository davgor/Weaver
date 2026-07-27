# Campaign portable package format

Weaver campaign backups are a single JSON document produced by `exportCampaignPackage` in DMEngine and restored by `importCampaignPackage`.

## Top-level shape

```json
{
  "version": 3,
  "campaignId": "my-campaign",
  "exportedAt": "2026-07-26T07:00:00.000Z",
  "slices": {
    "world": { "...": "WorldEngine slice" },
    "regional": { "...": "RegionalEngine slice" },
    "civilization": { "...": "CivilizationEngine slice" },
    "npc": { "...": "NPCEngine slice" },
    "enemy": { "...": "EnemyEngine slice" },
    "character": { "...": "CharacterEngine slice" },
    "item": { "...": "ItemEngine slice" },
    "quest": { "...": "QuestEngine slice" },
    "narration": { "...": "NarrationEngine projection slice" },
    "onboarding": { "...": "Onboarding + guided creation slice" }
  }
}
```

## Version field

- `version` is the **portable package schema version** (`PORTABLE_PACKAGE_VERSION`, currently `3`).
- Each slice also carries its own `sliceVersion` owned by the exporting engine.
- Import rejects unknown package versions with `PortabilitySchemaError` instead of partially applying data.

## Idempotency policy

Re-importing the same bundle into a campaign **replaces** each engine's campaign-scoped state (clear-then-restore). It is safe to re-apply an identical export; it is not a merge. Duplicate instance/ids are avoided by full replace rather than insert-if-missing.

## Forward migration policy

When a breaking change is required:

1. Increment `PORTABLE_PACKAGE_VERSION`.
2. Add an import adapter in DMEngine that accepts prior versions and upgrades in memory before delegating to peer engines.
3. Keep peer `sliceVersion` bumps local to the owning engine when only that engine's payload changes.
4. Document the migration in this file and add a regression test that imports a fixture from the previous version.

New exports should always write the latest `version` and slice versions. Older backups remain restorable via the adapter chain until explicitly retired.

### v1 → v2

Version `1` packages omit the `quest` slice. On import, DMEngine adapts them in memory to version `2` by inserting an empty QuestEngine slice, then continues through the v2 → v3 adapter.

### v2 → v3

Version `2` packages omit `narration` and `onboarding` slices. On import, DMEngine:

1. Upgrades older character (v2→v3), item (v1→v2), and NPC (v2→v3) slices by filling empty durable fields.
2. Inserts empty narration + onboarding slices.

## Slice ownership

| Slice | Owning package | Notes |
|-------|----------------|-------|
| `world` | WorldEngine | World metadata and deterministic seed/bounds |
| `regional` | RegionalEngine | Region records and cell membership |
| `civilization` | CivilizationEngine | Settlements, claims, NPC placeholder slots |
| `npc` | NPCEngine | NPCs, locations, memories, factions, relations, opinions (sliceVersion 3+) |
| `enemy` | EnemyEngine | Bestiary ids + generated foe snapshots |
| `character` | CharacterEngine | Day, death mode, companions, locations, stats/HP, journal, logbook, quests, known actions, autosaves (sliceVersion 3+) |
| `item` | ItemEngine | Templates, instances, inventories/equipment, balances (sliceVersion 2+) |
| `quest` | QuestEngine | Seeded world quests (`QUEST_SLICE_VERSION` 1) |
| `narration` | NarrationEngine | Social/Scene projection lines (sliceVersion 1) |
| `onboarding` | DMEngine | Wizard records, guided transcripts, hub active character |

DMEngine orchestrates export/import but does not embed cross-engine dumps; each slice is produced by the owning engine's `exportCampaignSlice` API (onboarding is owned by DMEngine persistence).
