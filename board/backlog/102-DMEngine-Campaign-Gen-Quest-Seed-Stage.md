# EPIC: DMEngine campaign-gen quest seed stage

Wire QuestEngine `seedWorldQuests` into `runCampaignGeneration` after peer geography/NPC/item stages exist.

**Depends on:** `097-QuestEngine-World-Quest-Seeding`, `052-DMEngine-Campaign-Generation-Pipeline`. **Origin:** deferred from `097.6`.

## Sub-tickets

| Id | Summary |
|----|---------|
| `102.1` | Post-peers quest seed stage + pools from real engines + contract test |

## Acceptance criteria

- [ ] Campaign generation calls `seedWorldQuests` with pools derived from World/Regional/Civilization/NPC/Item
- [ ] Consumer `*.contract.test.ts` covers the stage against real QuestEngine
- [ ] Optional: portable package gains a `quest` slice (bump `PORTABLE_PACKAGE_VERSION` with v1 adapter)
