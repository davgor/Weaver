# EnemyEngine (`@weaver/enemy-engine`)

Construct enemies for combat encounters.

## Role

Owns encounter-ready enemy definitions and instances consumed by CombatEngine and DM orchestration. Encounter density may later be influenced by region/civilization data; enemy facts stay deterministic here.

## Boundaries

- **LLM-free** — no Electron, no story invention
- Consumers need `*.contract.test.ts` against the real API

## Status

Scaffold with health endpoints. Full design lives in epics [045](../../board/backlog/045-EnemyEngine-Bestiary-Catalog.md)–[047](../../board/backlog/047-EnemyEngine-Combat-Token-Hook.md).

## Public API (today)

```ts
import { enemyEngine } from '@weaver/enemy-engine'

enemyEngine.health()
enemyEngine.listEndpoints()
await enemyEngine.call('health')
```

| Export | Notes |
|--------|--------|
| `enemyEngine` | Singleton `EnemyEngineApi` |
| `EnemyEngineApi` / `EngineEndpoint` | Types |

## Planned direction (from epics 045–047)

| Epic | Intent |
|------|--------|
| [045](../../board/backlog/045-EnemyEngine-Bestiary-Catalog.md) | Bestiary catalog: species/variants, seeded creature content |
| [046](../../board/backlog/046-EnemyEngine-Dynamic-Foe-Generation.md) | Dynamic encounter foe generation + quest-foe assignment |
| [047](../../board/backlog/047-EnemyEngine-Combat-Token-Hook.md) | Non-blocking combat-token generation hook |

## Scripts

```bash
npm test -- packages/EnemyEngine
npm run build:engines
```
