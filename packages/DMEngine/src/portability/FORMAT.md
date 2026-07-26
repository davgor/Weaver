# Campaign portable package format

Weaver campaign backups are a single JSON document produced by `exportCampaignPackage` in DMEngine and restored by `importCampaignPackage`.

## Top-level shape

```json
{
  "version": 1,
  "campaignId": "my-campaign",
  "exportedAt": "2026-07-26T07:00:00.000Z",
  "slices": {
    "world": { "...": "WorldEngine slice" },
    "regional": { "...": "RegionalEngine slice" },
    "civilization": { "...": "CivilizationEngine slice" },
    "npc": { "...": "NPCEngine slice" },
    "enemy": { "...": "EnemyEngine slice" },
    "character": { "...": "CharacterEngine slice" },
    "item": { "...": "ItemEngine slice" }
  }
}
```

## Version field

- `version` is the **portable package schema version** (`PORTABLE_PACKAGE_VERSION`, currently `1`).
- Each slice also carries its own `sliceVersion` owned by the exporting engine.
- Import rejects unknown package versions with `PortabilitySchemaError` instead of partially applying data.

## Forward migration policy

When a breaking change is required:

1. Increment `PORTABLE_PACKAGE_VERSION`.
2. Add an import adapter in DMEngine that accepts prior versions and upgrades in memory before delegating to peer engines.
3. Keep peer `sliceVersion` bumps local to the owning engine when only that engine's payload changes.
4. Document the migration in this file and add a regression test that imports a fixture from the previous version.

New exports should always write the latest `version` and slice versions. Older backups remain restorable via the adapter chain until explicitly retired.

## Slice ownership

| Slice | Owning package | Notes |
|-------|----------------|-------|
| `world` | WorldEngine | World metadata and deterministic seed/bounds |
| `regional` | RegionalEngine | Region records and cell membership |
| `civilization` | CivilizationEngine | Settlements, claims, NPC placeholder slots |
| `npc` | NPCEngine | Campaign NPC records |
| `enemy` | EnemyEngine | Bestiary ids + generated foe snapshots |
| `character` | CharacterEngine | Campaign day, death mode, companion ids |
| `item` | ItemEngine | Per-character currency balances |

DMEngine orchestrates export/import but does not embed cross-engine dumps; each slice is produced by the owning engine's `exportCampaignSlice` API.
