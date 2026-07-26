# QuestEngine (`@weaver/quest-engine`)

Deterministic, LLM-free owner of **world/campaign quest definitions and seeded instances**.

## Role

Seeds a coherent world quest graph at campaign generation time — templates, world-quest
instances, structured objectives with peer FK refs (NPC / place / item). Callers supply
id pools and optional lookups; QuestEngine does not invent geography, NPCs, or prose.

## Ownership split

| Package | Owns |
|---------|------|
| **QuestEngine** | World quest templates + campaign-seeded instances, objectives/hooks, seed/list/get |
| **CharacterEngine** | Per-character quest **log** (`upsertQuest` / status) — acceptance surface only |
| **DMEngine** | When to seed, when to offer/assign; FK existence checks via peer lookups |
| **NarrationEngine** | Player-facing quest prose into QuestEngine-shaped skeletons |

## Boundaries

- **LLM-free** — may accept caller-supplied titles/briefs; never calls LLMEngine/NarrationEngine.
- **No Electron** — library only.
- Seeded `questId`s are plain strings usable with CharacterEngine `upsertQuest` / DMEngine
  `proposeQuest` without QuestEngine writing the PC log.

## Public API

```ts
import {
  questEngine,
  seedWorldQuests,
  listWorldQuests,
  getWorldQuest,
  defineQuestTemplate
} from '@weaver/quest-engine'

const quests = seedWorldQuests({
  campaignId: 'campaign-1',
  worldId: 'world-1',
  seed: 'campaign-1:gen',
  pools: {
    regionIds: ['region-a'],
    placeIds: ['place-harbor'],
    npcIds: ['npc-guide'],
    itemIds: ['item.token']
  },
  counts: { main: 1, side: 2 }
})

await questEngine.call('listWorldQuests', { campaignId: 'campaign-1' })
```

| Export | Notes |
|--------|-------|
| `seedWorldQuests` | Deterministic; **re-seed replaces** all world quests for that `campaignId` |
| `listWorldQuests` / `getWorldQuest` | Query seeded instances |
| `defineQuestTemplate` | Optional reusable template registration |
| `QuestReferenceLookup` | Optional injected `hasNpc` / `hasPlace` / `hasItem` — rejects dangling FKs |
| Portability | `exportQuestCampaignSlice` / `importQuestCampaignSlice` (`QUEST_SLICE_VERSION` 1) |

## Integration contract (DM campaign-gen)

Intended stage order after peers exist (regions, civilizations/places, NPCs, items):

1. Collect id pools from World/Regional/Civilization/NPC/Item.
2. Call `seedWorldQuests({ campaignId, worldId, seed, pools, lookup? })`.
3. Later offer/assign via DMEngine `proposeQuest` using seeded `questId`s into CharacterEngine’s log.

Pipeline wiring into `runCampaignGeneration` is tracked as follow-up
`102-DMEngine-Campaign-Gen-Quest-Seed-Stage` — this package ships the seed API + contract.

## Scripts

```bash
npx vitest run packages/QuestEngine
npm run build -w @weaver/quest-engine
```
