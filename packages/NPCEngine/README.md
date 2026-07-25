# NPCEngine (`@weaver/npc-engine`)

Construct NPCs for campaigns.

## Role

Owns NPC facts: stats, identity keys, placement/region links, and other durable character data. Dialogue flavor may be narrated elsewhere, but NPC existence and attributes stay here.

## Boundaries

- **LLM-free** for construction and facts (no prose invention here)
- **No Electron**
- Likely consumes CivilizationEngine placeholder slots and RegionalEngine placement data once those APIs exist
- Consumers need `*.contract.test.ts` against the real API

## Status

Scaffold with health endpoints. Full design lives in epics [037](../../board/backlog/037-NPCEngine-Construction-And-Identity.md)–[044](../../board/backlog/044-NPCEngine-Face-Token-Hook.md).

## Public API (today)

```ts
import { npcEngine } from '@weaver/npc-engine'

npcEngine.health()
npcEngine.listEndpoints()
await npcEngine.call('health')
```

| Export | Notes |
|--------|--------|
| `npcEngine` | Singleton `NpcEngineApi` |
| `NpcEngineApi` / `EngineEndpoint` | Types |

## Planned direction (from epics 037–044)

| Epic | Intent |
|------|--------|
| [037](../../board/backlog/037-NPCEngine-Construction-And-Identity.md) | Claim a CivilizationEngine placeholder slot; construct stats/race/alignment/temperament/speaking-style seed |
| [038](../../board/backlog/038-NPCEngine-Memory-Isolation.md) | Per-NPC private memory log; only region/faction-tagged world facts otherwise |
| [039](../../board/backlog/039-NPCEngine-Attackable-Civilian-Combat-Disposition.md) | Civilian vs. combat-tier stats; defeat disposition (yielded/fled/non-lethal/executed) |
| [040](../../board/backlog/040-NPCEngine-Factions-And-Reputation.md) | Factions, faction relations, per-character reputation |
| [041](../../board/backlog/041-NPCEngine-Relationship-Web.md) | NPC opinions of other NPCs/PCs |
| [042](../../board/backlog/042-NPCEngine-Dossier-Model.md) | Dossier: Traits → Facts → DM opinion → Disposition |
| [043](../../board/backlog/043-NPCEngine-Speaking-Style-And-Selective-Replies.md) | Speaking-style samples; selective Social replies |
| [044](../../board/backlog/044-NPCEngine-Face-Token-Hook.md) | Non-blocking portrait generation hook (reused by companions) |

Display names are still supplied/approved via NarrationEngine/DMEngine (see epic `052`), not invented here.

## Scripts

```bash
npm test -- packages/NPCEngine
npm run build:engines
```
