# EPIC: DMEngine campaign-gen quest seed stage

Wire QuestEngine `seedWorldQuests` into `runCampaignGeneration` after peer geography/NPC/item stages exist.

**Depends on:** `097-QuestEngine-World-Quest-Seeding`, `052-DMEngine-Campaign-Generation-Pipeline`. **Origin:** deferred from `097.6`.

**Feeds / deferred:** portable `quest` slice → `104-DMEngine-Quest-Portability-Slice`.

## Sub-tickets

| Id | Summary |
|----|---------|
| `102.1` | Post-peers quest seed stage + pools from real engines + contract test |

## Acceptance criteria

- [x] Campaign generation calls `seedWorldQuests` with pools derived from World/Regional/Civilization/NPC/Item
- [x] Consumer `*.contract.test.ts` covers the stage against real QuestEngine
- [x] Optional portable `quest` slice deferred to `104-DMEngine-Quest-Portability-Slice` (QuestEngine slice APIs already exist; package version bump + FORMAT wiring tracked there)

## Sub-tickets

### 102.1 Campaign-gen quest seed stage

Add a post-peers stage (or post-`persist` hook) that seeds world quests.

**Parent:** `102-DMEngine-Campaign-Gen-Quest-Seed-Stage`. **Depends on:** `097`.

#### Acceptance criteria

- [x] `runCampaignGeneration` (or documented adjacent hook invoked by the pipeline) seeds world quests for the campaign
- [x] Id pools come from peer engines already populated by earlier stages
- [x] Contract test exercises real `@weaver/quest-engine` seed API
