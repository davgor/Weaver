# Campaign portable package format

Weaver campaign backups are a single JSON document produced by `exportCampaignPackage` in DMEngine and restored by `importCampaignPackage`.

## Top-level shape

```json
{
  "version": 2,
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
    "quest": { "...": "QuestEngine slice" }
  }
}
```

## Version field

- `version` is the **portable package schema version** (`PORTABLE_PACKAGE_VERSION`, currently `2`).
- Each slice also carries its own `sliceVersion` owned by the exporting engine.
- Import rejects unknown package versions with `PortabilitySchemaError` instead of partially applying data.

## Forward migration policy

When a breaking change is required:

1. Increment `PORTABLE_PACKAGE_VERSION`.
2. Add an import adapter in DMEngine that accepts prior versions and upgrades in memory before delegating to peer engines.
3. Keep peer `sliceVersion` bumps local to the owning engine when only that engine's payload changes.
4. Document the migration in this file and add a regression test that imports a fixture from the previous version.

New exports should always write the latest `version` and slice versions. Older backups remain restorable via the adapter chain until explicitly retired.

### v1 → v2

Version `1` packages omit the `quest` slice. On import, DMEngine adapts them in memory to version `2` by inserting an empty QuestEngine slice:

```json
{
  "sliceVersion": 1,
  "campaignId": "<package.campaignId>",
  "worldQuests": []
}
```

Seeded world quests are therefore empty after a v1 restore; re-run campaign quest seeding if needed.

## Slice ownership

| Slice | Owning package | Notes |
|-------|----------------|-------|
| `world` | WorldEngine | World metadata and deterministic seed/bounds |
| `regional` | RegionalEngine | Region records and cell membership |
| `civilization` | CivilizationEngine | Settlements, claims, NPC placeholder slots |
| `npc` | NPCEngine | Campaign NPC records + current locations (sliceVersion 2+) |
| `enemy` | EnemyEngine | Bestiary ids + generated foe snapshots |
| `character` | CharacterEngine | Campaign day, death mode, companion ids, locations (sliceVersion 2+) |
| `item` | ItemEngine | Per-character currency balances |
| `quest` | QuestEngine | Seeded world quests (`QUEST_SLICE_VERSION` 1) |

DMEngine orchestrates export/import but does not embed cross-engine dumps; each slice is produced by the owning engine's `exportCampaignSlice` API.
