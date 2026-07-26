# NPCEngine (`@weaver/npc-engine`)

Construct NPCs for campaigns.

## Role

Owns NPC facts: stats, identity keys, spawn/home placement links, **current location**, and other durable character data. Dialogue flavor may be narrated elsewhere, but NPC existence and attributes stay here.

## Boundaries

- **LLM-free** for construction and facts (no prose invention here)
- **No Electron**
- Consumes CivilizationEngine placeholder slots at construction; **current location** uses opaque region/place ids (no World/Regional/Civilization/Dungeon imports for placement validation)
- Consumers need `*.contract.test.ts` against the real API

## Public API (today)

```ts
import {
  constructNpc,
  getNpcLocation,
  setNpcLocation,
  npcEngine
} from '@weaver/npc-engine'

const npc = constructNpc({ /* … */ })
// Spawn/home on the record:
npc.regionId
npc.civilizationId
// Current placement (seeded at construct; movable afterward):
getNpcLocation(npc.npcId)
setNpcLocation({
  npcId: npc.npcId,
  campaignId: npc.campaignId,
  regionId: 'region-elsewhere',
  placeId: 'place-inn',
  locationKind: 'settlement'
})
```

| Export | Notes |
|--------|--------|
| `npcEngine` | Singleton `NpcEngineApi` |
| `constructNpc` / `getNpc` / … | Construction and identity |
| `setNpcLocation` / `getNpcLocation` / `clearNpcLocation` / `listNpcLocations` | Sole owner of per-NPC **current** placement: opaque `regionId` (+ optional `placeId`), `locationKind` (`overworld` \| `settlement` \| `dungeon`), optional `updatedDay` (stamped from CharacterEngine campaign day when omitted). `NpcRecord.regionId` / `civilizationId` remain **spawn/home** from placeholder claim and are not rewritten by movement. |
| `NpcEngineApi` / `EngineEndpoint` | Types |

NPC campaign portability slice version **2** includes `locations[]` alongside `npcs` / `npcIds`.

## Planned direction (from epics 037–044)

| Epic | Intent |
|------|--------|
| [037](../../board/done/037-NPCEngine-Construction-And-Identity.md) | Claim a CivilizationEngine placeholder slot; construct stats/race/alignment/temperament/speaking-style seed |
| [038](../../board/done/038-NPCEngine-Memory-Isolation.md) | Per-NPC private memory log; only region/faction-tagged world facts otherwise |
| [039](../../board/done/039-NPCEngine-Attackable-Civilian-Combat-Disposition.md) | Civilian vs. combat-tier stats; defeat disposition (yielded/fled/non-lethal/executed) |
| [040](../../board/done/040-NPCEngine-Factions-And-Reputation.md) | Factions, faction relations, per-character reputation |
| [041](../../board/done/041-NPCEngine-Relationship-Web.md) | NPC opinions of other NPCs/PCs |
| [042](../../board/done/042-NPCEngine-Dossier-Model.md) | Dossier: Traits → Facts → DM opinion → Disposition |
| [043](../../board/done/043-NPCEngine-Speaking-Style-And-Selective-Replies.md) | Speaking-style samples; selective Social replies |
| [044](../../board/done/044-NPCEngine-Face-Token-Hook.md) | Non-blocking portrait generation hook (reused by companions) |
| [103](../../board/done/103-NPCEngine-Location-Ownership.md) | Current location ownership for movable quest givers / NPCs |

Display names are still supplied/approved via NarrationEngine/DMEngine (see epic `052`), not invented here.

## Scripts

```bash
npm test -- packages/NPCEngine
npm run build:engines
```
