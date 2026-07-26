# EPIC: DMEngine quest portability slice

Add seeded world quests to the campaign portable package so export/import carries QuestEngine instances alongside world/npc/character slices.

**Depends on:** `102-DMEngine-Campaign-Gen-Quest-Seed-Stage`, `097-QuestEngine-World-Quest-Seeding` (QuestEngine already has `exportQuestCampaignSlice` / `importQuestCampaignSlice`). **Origin:** optional AC deferred from `102`.

**Out of scope:** Replacing CharacterEngine per-PC quest log portability; inventing quest prose on import.

## Sub-tickets

| Id | Summary |
|----|---------|
| `104.1` | Bump `PORTABLE_PACKAGE_VERSION`, add `quest` slice + v1 adapter, round-trip tests |

## Acceptance criteria

- [ ] Portable package includes a `quest` slice versioned with QuestEngine’s slice schema
- [ ] `PORTABLE_PACKAGE_VERSION` bump includes a v1→current adapter path (or documented one-shot migration)
- [ ] Export/import round-trip restores `listWorldQuests(campaignId)` for seeded instances
- [ ] FORMAT.md documents the quest slice
- [ ] Sub-ticket `104.1` completed
