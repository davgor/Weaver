# DMEngine (`@weaver/dm-engine`)

DM / story control by orchestrating peer engines (and the LLM against those APIs).

## Role

Coordinates scenes, plot beats, and tool-like calls into combat, world, items, NPCs, enemies, and narration. It **pulls and applies** facts via package APIs — it does **not** invent world or combat facts itself.

## Boundaries

- Orchestration only — durable truth lives in peer engines
- May drive **LLMEngine** / **NarrationEngine** for prose, then validate/apply via peers
- **No Electron** chrome here
- Declares type-only deps on peer engine APIs today
- Consumers need `*.contract.test.ts` against the real API

## Status

Scaffold. Exposes `health` and `describeRole` (`invents: false`, lists pull-from packages). Full design lives in epics [052](../../board/backlog/052-DMEngine-Campaign-Generation-Pipeline.md)–[062](../../board/backlog/062-DMEngine-Context-Efficiency-And-Rag-Integration.md).

## Public API (today)

```ts
import { dmEngine } from '@weaver/dm-engine'
import type { DmEngineDeps } from '@weaver/dm-engine'

dmEngine.health()
await dmEngine.call('describeRole')
```

| Export | Notes |
|--------|--------|
| `dmEngine` | Singleton `DmEngineApi` |
| `DmEngineApi` / `DmEngineDeps` / `EngineEndpoint` | Types (`DmEngineDeps` sketches injected peer APIs) |

## Planned direction (from epics 052–062)

| Epic | Intent |
|------|--------|
| [052](../../board/backlog/052-DMEngine-Campaign-Generation-Pipeline.md) | Cascading campaign-gen pipeline; orchestrates NarrationEngine for content, persists via peer engines |
| [053](../../board/backlog/053-DMEngine-Turn-Routing.md) | Turn routing: merged intent+route, heuristic fast path, dedicated commerce/travel/combat branches |
| [054](../../board/backlog/054-DMEngine-World-Mutations-And-Live-Population.md) | Typed world mutations; on-demand live place/NPC population |
| [055](../../board/backlog/055-DMEngine-Commerce-And-Travel-Intents.md) | Reliable buy/sell/travel intents |
| [056](../../board/backlog/056-DMEngine-Quest-Proposal-And-Tracking.md) | Quest proposal & tracking against CharacterEngine's quest log |
| [057](../../board/backlog/057-DMEngine-Ask-The-Dm.md) | Ask-the-DM (OOC) — never touches `turn:resolve` |
| [058](../../board/backlog/058-DMEngine-Shared-Time-And-Hub-Recap.md) | Shared multi-PC time/causality; campaign-hub session recap |
| [059](../../board/backlog/059-DMEngine-Campaign-Portability.md) | Campaign export/import/backup |
| [060](../../board/backlog/060-DMEngine-World-Naming-And-History-Authoring.md) | World/region/pantheon naming & history (orchestrates NarrationEngine) |
| [061](../../board/backlog/061-DMEngine-Guided-Character-Creation-Orchestration.md) | Guided identity + opening-scene chat orchestration |
| [062](../../board/backlog/062-DMEngine-Context-Efficiency-And-Rag-Integration.md) | Token/context budget discipline; wires NarrationEngine's RAG into grounding |

**Invention boundary, concretely:** DMEngine never calls LLMEngine directly for player-facing lore/prose — it calls **NarrationEngine**, which invents and validates, then DMEngine persists the accepted result via the owning peer engine's API. DMEngine's own direct LLM calls are limited to internal orchestration decisions (e.g. intent/routing classification) that aren't themselves invented narrative content.

## Scripts

```bash
npm test -- packages/DMEngine
npm run build:engines
```
