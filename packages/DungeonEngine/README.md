# DungeonEngine (`@weaver/dungeon-engine`)

Deterministic generation and storage of **instanced dungeons** — finite multi-floor room/corridor maps — parallel to WorldEngine’s overworld terrain.

## Role

Owns dungeon instance geometry (cells, floors, rooms, connections, seed/meta) and overworld entrance links. Narration and UI consume generated data; they must not invent dungeon layouts.

## Boundaries

- **LLM-free** — deterministic generation and storage only
- **No Electron** — library only
- **Engine-local store** — packed tile chunks + `meta.json` (table-shaped stand-in for per-`dungeonId` SQLite); not campaign-bundle tables (see DMEngine epic `081`)
- Separate from WorldEngine (no shared map package); overworld entrances validate against WorldEngine’s published create/get APIs
- Consumers need `*.contract.test.ts` against the real API

## Status

Core create/query/lifecycle (`086.1`–`086.6`), topology (`086.7`), reset/restock (`086.8`), overworld entrance hook (`086.9`), and docs (`086.10`) are shipped. Design: epic [086](../../board/done/086-DungeonEngine-Instanced-Map-Store.md).

## Public API

```ts
import { dungeonEngine, createDungeonService } from '@weaver/dungeon-engine'

dungeonEngine.health()
const { meta } = dungeonEngine.createDungeon('/tmp/dungeons', {
  seed: 42,
  floorCount: 2,
  width: 32,
  height: 24,
  theme: 'crypt'
})
dungeonEngine.getCell({ dataRoot: '/tmp/dungeons', dungeonId: meta.dungeonId, floorIndex: 0, x: 1, y: 1 })
dungeonEngine.getTopology('/tmp/dungeons', meta.dungeonId)
dungeonEngine.resetDungeonInstance('/tmp/dungeons', meta.dungeonId)
dungeonEngine.setOverworldEntrance({
  dataRoot: '/tmp/dungeons',
  dungeonId: meta.dungeonId,
  worldDataRoot: '/tmp/worlds',
  entrance: { worldId: 'overworld', x: 2, y: 3, facing: 'east' }
})
await dungeonEngine.call('createDungeon', { dataRoot: '/tmp/dungeons', seed: 1, width: 16, height: 16 })
```

| Export | Notes |
|--------|--------|
| `dungeonEngine` | Singleton `DungeonEngineApi` (typed methods + admin `call`) |
| `createDungeonService(dataRoot, options?)` | DI-friendly store service (`restock`, `worldLookup`) |
| `generateDungeonLayout` | Pure seeded room–corridor generator |
| Types | `DungeonMeta`, `DungeonCell`, `DungeonRoom`, `DungeonConnection`, `OverworldEntrance`, `TileType`, … |

### Admin endpoints

`health`, `createDungeon`, `hasDungeon`, `listDungeons`, `deleteDungeon`, `getDungeonMeta`, `getDungeonBounds`, `listFloors`, `getCell`, `getDungeonSpecific`, `getFloor`, `getDungeonWhole`, `listRooms`, `getRoom`, `listConnections`, `getTopology`, `resetDungeonInstance`, `restockDungeonInstance`, `setOverworldEntrance`, `getOverworldEntrance`, `clearOverworldEntrance` — payload objects require `dataRoot` (and `dungeonId` / `worldDataRoot` where applicable).

## Scripts

```bash
npm test -- packages/DungeonEngine
npm run build:engines
```
