# ItemEngine (`@weaver/item-engine`)

Create and modify game items.

## Role

Owns item definitions, mutations, and inventory-facing item APIs. Combat, DM, and narration treat item facts from this package as source of truth (no invented loot stats in prose-only paths).

## Boundaries

- **LLM-free** — deterministic item construction/mutation
- **No Electron**
- Consumers need `*.contract.test.ts` against the real API

## Status

Scaffold with health endpoints. Full design lives in epics [032](../../board/backlog/032-ItemEngine-Item-Model-And-Inventory.md)–[036](../../board/backlog/036-ItemEngine-Starting-Gear-Catalog.md).

## Public API (today)

```ts
import { itemEngine } from '@weaver/item-engine'

itemEngine.health()
itemEngine.listEndpoints()
await itemEngine.call('health')
```

| Export | Notes |
|--------|--------|
| `itemEngine` | Singleton `ItemEngineApi` |
| `ItemEngineApi` / `EngineEndpoint` | Types |

## Planned direction (from epics 032–036)

| Epic | Intent |
|------|--------|
| [032](../../board/backlog/032-ItemEngine-Item-Model-And-Inventory.md) | Item templates/instances, equipment slots (main/off hand, shield, accessories) |
| [033](../../board/backlog/033-ItemEngine-Currency-And-Economy.md) | Single-currency debit/credit + DM-proposed price clamps |
| [034](../../board/backlog/034-ItemEngine-Weapon-Enchantments-And-Damage-Types.md) | Weapon enchantment overlays, multi-type damage |
| [035](../../board/backlog/035-ItemEngine-Loot-Generation.md) | Encounter/quest loot tables |
| [036](../../board/backlog/036-ItemEngine-Starting-Gear-Catalog.md) | Archetype starting-loadout catalog |

## Scripts

```bash
npm test -- packages/ItemEngine
npm run build:engines
```
