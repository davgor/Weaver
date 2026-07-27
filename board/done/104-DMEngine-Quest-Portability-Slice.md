# EPIC: DMEngine quest portability slice

Add seeded world quests to the campaign portable package so export/import carries QuestEngine instances alongside world/npc/character slices.

**Depends on:** `102-DMEngine-Campaign-Gen-Quest-Seed-Stage`, `097-QuestEngine-World-Quest-Seeding` (QuestEngine already has `exportQuestCampaignSlice` / `importQuestCampaignSlice`). **Origin:** optional AC deferred from `102`.

**Out of scope:** Replacing CharacterEngine per-PC quest log portability; inventing quest prose on import.

## Sub-tickets

| Id | Summary |
|----|---------|
| `104.1` | Bump `PORTABLE_PACKAGE_VERSION`, add `quest` slice + v1 adapter, round-trip tests |

## Acceptance criteria

- [x] Portable package includes a `quest` slice versioned with QuestEngine’s slice schema
- [x] `PORTABLE_PACKAGE_VERSION` bump includes a v1→current adapter path (or documented one-shot migration)
- [x] Export/import round-trip restores `listWorldQuests(campaignId)` for seeded instances
- [x] FORMAT.md documents the quest slice
- [x] Sub-ticket `104.1` completed

## Sub-tickets

### 104.1 — Quest slice export/import + version bump

Wire QuestEngine portability into DMEngine’s campaign package.

**Parent:** `104-DMEngine-Quest-Portability-Slice`. **Depends on:** `102`, QuestEngine portability from `097.5`.

#### Acceptance criteria

- [x] `exportCampaign` / `importCampaign` include quest slice via real QuestEngine APIs
- [x] Unsupported/old package versions fail clearly or adapt from v1
- [x] Unit/portability tests cover empty and non-empty seeded quest sets
- [x] FORMAT.md + schema constants updated
