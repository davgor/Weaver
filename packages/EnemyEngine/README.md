# EnemyEngine (`@weaver/enemy-engine`)

Construct enemies for combat encounters.

## Role

Owns encounter-ready enemy definitions and instances consumed by CombatEngine and DM orchestration. Encounter density may later be influenced by region/civilization data; enemy facts stay deterministic here.

## Boundaries

- **LLM-free** — no Electron, no story invention
- Consumers need `*.contract.test.ts` against the real API

## Status

Bestiary catalog, scoped foe generation, CombatEngine-facing hydration, and non-blocking combat-token hooks for epics 045-047.

## Public API

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
| `listBestiary` / `getBestiaryEntry` / `hydrateBestiaryEntry` | Seeded catalog and HP hydration |
| `generateEncounterFoes` / `assignQuestFoes` | Deterministic encounter and quest foe refs |
| `hydrateCombatantFromFoe` | CombatEngine-facing combatant snapshot |
| `requestCombatToken` | Async NarrationEngine visual-token hook |

## Implemented epics

| Epic | Intent |
|------|--------|
| [045](../../board/in-progress/045-EnemyEngine-Bestiary-Catalog.md) | Bestiary catalog: species/variants, seeded creature content |
| [046](../../board/in-progress/046-EnemyEngine-Dynamic-Foe-Generation.md) | Dynamic encounter foe generation + quest-foe assignment |
| [047](../../board/in-progress/047-EnemyEngine-Combat-Token-Hook.md) | Non-blocking combat-token generation hook |

## Scripts

```bash
npm test -- packages/EnemyEngine
npm run build:engines
```
