# DungeonEngine (`@weaver/dungeon-engine`)

Deterministic generation and storage of **instanced dungeons** — finite multi-floor room/corridor maps — parallel to WorldEngine’s overworld terrain.

## Role

Owns dungeon instance geometry (cells, floors, seed/meta). Narration and UI consume generated data; they must not invent dungeon layouts.

## Boundaries

- **LLM-free** — deterministic generation and storage only
- **No Electron** — library only
- **Engine-local store** — packed tile chunks + `meta.json` (table-shaped stand-in for per-`dungeonId` SQLite); not campaign-bundle tables (see DMEngine epic `081`)
- Separate from WorldEngine (no shared map package yet); overworld entrances are ticket `086.9`
- Consumers need `*.contract.test.ts` against the real API

## Status

Scaffold + core create/query/lifecycle APIs (`086.1`–`086.6`). Topology, reset/restock, and overworld entrances are later tickets. Design: epic [086](../../board/in-progress/086-DungeonEngine-Instanced-Map-Store.md).

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
await dungeonEngine.call('createDungeon', { dataRoot: '/tmp/dungeons', seed: 1, width: 16, height: 16 })
```

| Export | Notes |
|--------|--------|
| `dungeonEngine` | Singleton `DungeonEngineApi` (typed methods + admin `call`) |
| `createDungeonService(dataRoot)` | DI-friendly store service used by the singleton |
| `generateDungeonLayout` | Pure seeded room–corridor generator |
| Types | `DungeonMeta`, `DungeonCell`, `TileType`, `FloorRecord`, … |

### Admin endpoints

`health`, `createDungeon`, `hasDungeon`, `listDungeons`, `deleteDungeon`, `getDungeonMeta`, `getDungeonBounds`, `listFloors`, `getCell`, `getDungeonSpecific`, `getFloor`, `getDungeonWhole` — payload objects require `dataRoot` (and `dungeonId` where applicable).

## Scripts

```bash
npm test -- packages/DungeonEngine
npm run build:engines
```
