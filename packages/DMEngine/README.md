# DMEngine (`@weaver/dm-engine`)

DM / story control by orchestrating peer engines (and the LLM against those APIs).

## Role

Coordinates scenes, plot beats, and tool-like calls into combat, world, items, NPCs, enemies, and narration. It **pulls and applies** facts via package APIs — it does **not** invent world or combat facts itself.

## Boundaries

- Orchestration only — durable truth lives in peer engines
- May drive **LLMEngine** / **NarrationEngine** for prose, then validate/apply via peers
- **No Electron** chrome here
- Owns the campaign-bundle SQLite file lifecycle, but not peer engine store internals
- Consumers need `*.contract.test.ts` against the real API

## Campaign persistence

DMEngine owns one SQLite file per campaign. Use **`createCampaignSession` /
`openCampaignSession`** for production play: they migrate the DB and bind
SQLite-backed stores into CharacterEngine, ItemEngine, NPCEngine, EnemyEngine,
QuestEngine, and NarrationEngine so gameplay facts survive restart. Closing the
session unbinds those stores. Admin `createCampaign` / `openCampaign` still
migrate and summarize without keeping engine stores bound.

Schema versions:

| Version | Contents |
|---------|----------|
| 1 | Campaign stubs (`081`): meta, placeholder refs, catalog seed |
| 2 | Character facts: stats/HP, journal, logbook, quest log, known actions, locations, companions |
| 3 | Item facts: templates, instances (single owner), inventories, currency, place inventories |
| 4 | NPC facts: records, memories, world facts, factions, relations, reputations, opinions, locations |
| 5 | Enemy foes + token cache, quest templates/world quests, narration Social/Scene projections |

World, regional, civilization, and dungeon facts remain in their owning engine
stores under each campaign’s `data/` root. DMEngine does **not** duplicate world
cells, region partitions, civilization ledgers, or dungeon cells into the
campaign bundle. Electron/renderer never talks SQL — only DMEngine opens the
campaign file.

`seedCatalog` is an optional deterministic hook invoked through the campaign
migration/open path. It receives a narrow catalog writer that can upsert static
catalog fixtures; it does not receive an LLM or a raw database connection.

## Electron call path

Electron apps call the DMEngine API, and DMEngine is the only package in this
path that opens the campaign SQLite file:

```text
Renderer UI -> typed Electron engine bridge -> DMEngine create/open campaign API -> SQLite file
```

There is no raw SQL IPC channel. Admin/dev endpoints expose
`campaign.create` and `campaign.open` through the existing engine endpoint
catalog; they return campaign summaries and close the underlying handle.

## Status

Campaign persistence scaffold plus commerce/travel intent handlers (055) and
quest proposal/tracking orchestration (056). Exposes `health`, `describeRole`
(`invents: false`, lists pull-from packages), `createCampaign`, `openCampaign`,
matching admin endpoints, and the intent/quest orchestration helpers below.
Full design lives in epics
[052](../../board/done/052-DMEngine-Campaign-Generation-Pipeline.md)–[062](../../board/done/062-DMEngine-Context-Efficiency-And-Rag-Integration.md),
with production campaign stores shipped in [106](../../board/done/106-DMEngine-Production-Campaign-Stores.md).

## Public API (today)

```ts
import {
  dmEngine,
  classifyPlayerIntent,
  resolvePlayerIntent,
  proposeQuest,
  completeQuest,
  failQuest
} from '@weaver/dm-engine'
import type { DmEngineDeps } from '@weaver/dm-engine'

dmEngine.health()
await dmEngine.call('describeRole')
const campaign = dmEngine.createCampaign({
  campaignId: 'example-campaign',
  filePath: '/path/to/example-campaign.sqlite'
})
campaign.close()

classifyPlayerIntent('I buy the iron sword') // 'buy'
```

| Export | Notes |
|--------|--------|
| `dmEngine` | Singleton `DmEngineApi` |
| `createCampaign` / `openCampaign` | Campaign file lifecycle helpers used by the singleton |
| `CURRENT_CAMPAIGN_SCHEMA_VERSION` | Latest supported campaign schema version |
| `classifyPlayerIntent` / `resolvePlayerIntent` | Heuristic intent branch targets for future 053 router |
| `resolveBuyIntent` / `resolveSellIntent` / `resolveTravelIntent` | Commerce/travel handlers via ItemEngine + CharacterEngine; travel advances campaign day and sets traveler placement via `setCharacterLocation` (opaque destination ids) |
| `proposeQuest` / `updateQuestProgress` / `completeQuest` / `failQuest` | Quest orchestration against CharacterEngine quest log |
| `Campaign*` / `CatalogSeed*` / `DmEngineApi` / `DmEngineDeps` / `EngineEndpoint` | Types (`DmEngineDeps` includes injected peer APIs) |

## Planned direction (from epics 052–062)

| Epic | Intent |
|------|--------|
| [052](../../board/done/052-DMEngine-Campaign-Generation-Pipeline.md) | Cascading campaign-gen pipeline; orchestrates NarrationEngine for content, persists via peer engines |
| [053](../../board/done/053-DMEngine-Turn-Routing.md) | Turn routing: merged intent+route, heuristic fast path, dedicated commerce/travel/combat branches |
| [054](../../board/done/054-DMEngine-World-Mutations-And-Live-Population.md) | Typed world mutations; on-demand live place/NPC population |
| [055](../../board/done/055-DMEngine-Commerce-And-Travel-Intents.md) | Reliable buy/sell/travel intents |
| [056](../../board/done/056-DMEngine-Quest-Proposal-And-Tracking.md) | Quest proposal & tracking against CharacterEngine's quest log |
| [057](../../board/done/057-DMEngine-Ask-The-Dm.md) | Ask-the-DM (OOC) — never touches `turn:resolve` |
| [058](../../board/done/058-DMEngine-Shared-Time-And-Hub-Recap.md) | Shared multi-PC time/causality; campaign-hub session recap |
| [059](../../board/done/059-DMEngine-Campaign-Portability.md) | Campaign export/import/backup |
| [060](../../board/done/060-DMEngine-World-Naming-And-History-Authoring.md) | World/region/pantheon naming & history (orchestrates NarrationEngine) |
| [061](../../board/done/061-DMEngine-Guided-Character-Creation-Orchestration.md) | Guided identity + opening-scene chat orchestration |
| [062](../../board/done/062-DMEngine-Context-Efficiency-And-Rag-Integration.md) | Token/context budget discipline; wires NarrationEngine's RAG into grounding |

**Invention boundary, concretely:** DMEngine never calls LLMEngine directly for player-facing lore/prose — it calls **NarrationEngine**, which invents and validates, then DMEngine persists the accepted result via the owning peer engine's API. DMEngine's own direct LLM calls are limited to internal orchestration decisions (e.g. intent/routing classification) that aren't themselves invented narrative content.

## Scripts

```bash
npm test -- packages/DMEngine
npm run build:engines
```
