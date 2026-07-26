# ItemEngine (`@weaver/item-engine`)

Create and modify game items.

## Role

Owns item definitions, mutations, and inventory-facing item APIs. Combat, DM, and narration treat item facts from this package as source of truth (no invented loot stats in prose-only paths).

## Boundaries

- **LLM-free** — deterministic item construction/mutation
- **No Electron**
- Consumers need `*.contract.test.ts` against the real API

## Status

Core item template, instance, inventory, and equipment-slot APIs are implemented. Future economy,
enchantment, loot, and starting-gear work lives in epics `033`-`036`.

## Public API

```ts
import { createItemService, itemEngine, type ItemTemplate } from '@weaver/item-engine'

const sword: ItemTemplate = {
  id: 'template.longsword',
  name: 'Longsword',
  equipmentSlots: ['mainHand', 'offHand'],
  tags: ['weapon']
}

itemEngine.defineTemplate(sword)
itemEngine.createInventory('character.1')
const instance = itemEngine.addItem('character.1', 'template.longsword', {
  durability: 10,
  customName: 'Gatekeeper'
})
itemEngine.equip('character.1', instance.id, 'mainHand')

itemEngine.health()
itemEngine.listEndpoints()
await itemEngine.call('health')

const isolated = createItemService()
```

| Export | Notes |
|--------|--------|
| `itemEngine` | Singleton `ItemEngineApi` |
| `createItemService()` | Fresh in-memory service for tests or DI |
| `EQUIPMENT_SLOTS` | `mainHand`, `offHand`, `shield`, `armor`, `accessories` |
| `ItemTemplate` | Definition/facts: id, name, optional description, compatible equipment slots, tags |
| `ItemInstance` / `ItemInstanceState` | Per-instance state: template id, durability, charges, custom name, enchantment refs |
| `InventorySnapshot` / `EquippedItemViews` | Query shapes that keep `template` facts separate from `instance` state |
| `ItemEngineApi` / `EngineEndpoint` | Public API and admin-callable endpoint types |

### Template and instance model

Templates are reusable item facts. Instances reference a `templateId` and hold only state that can
change per copy: durability, charges, custom name, and enchantment references. Inventory queries
return `{ template, instance }` views so NarrationEngine, DMEngine, CombatEngine, and UI callers can
read facts from this package instead of copying or inventing item stats.

### Inventory and equipment

Typed methods and admin endpoints are available for:

- `defineTemplate(template)` / `getTemplate(templateId)`
- `createInventory(characterId)`
- `addItem(characterId, templateId, instanceState?)`
- `listInventory(characterId)`
- `getEquipped(characterId)`
- `equip(characterId, instanceId, slot)`
- `unequip(characterId, slotOrInstanceId)`

`equip` enforces template slot compatibility. Fixed slots (`mainHand`, `offHand`, `shield`, `armor`)
hold at most one item; `accessories` is a list. `unequip` returns items to held inventory without
changing instance state.

### Admin endpoints

`itemEngine.listEndpoints()` includes `defineTemplate`, `getTemplate`, `createInventory`, `addItem`,
`listInventory`, `getEquipped`, `equip`, and `unequip` in addition to `health`. These endpoints accept
plain object payloads for ElectronAdmin or other admin callers; ItemEngine itself imports no Electron
modules.

## Planned direction (from epics 032–036)

| Epic | Intent |
|------|--------|
| [033](../../board/backlog/033-ItemEngine-Currency-And-Economy.md) | Single-currency debit/credit + DM-proposed price clamps |
| [034](../../board/backlog/034-ItemEngine-Weapon-Enchantments-And-Damage-Types.md) | Weapon enchantment overlays, multi-type damage |
| [035](../../board/backlog/035-ItemEngine-Loot-Generation.md) | Encounter/quest loot tables |
| [036](../../board/backlog/036-ItemEngine-Starting-Gear-Catalog.md) | Archetype starting-loadout catalog |

## Scripts

```bash
npm test -- packages/ItemEngine
npm run build:engines
```
