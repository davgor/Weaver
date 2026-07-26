# ItemEngine (`@weaver/item-engine`)

Create and modify game items.

## Role

Owns item definitions, mutations, and inventory-facing item APIs. Combat, DM, and narration treat item facts from this package as source of truth (no invented loot stats in prose-only paths).

## Boundaries

- **LLM-free** — deterministic item construction/mutation
- **No Electron**
- Consumers need `*.contract.test.ts` against the real API

## Status

Core item template, instance, inventory, equipment-slot, currency, loot-table, and starting-gear
catalog APIs are implemented. Future enchantment work lives in epic `034`.

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

itemEngine.seedItemTemplateCatalog()
itemEngine.credit('character.1', 25)
itemEngine.debit('character.1', 5)
itemEngine.clampProposedPrice(25_000) // 10000 by default
itemEngine.generateLoot({ difficulty: 'standard', seed: 'encounter.1' })
itemEngine.getStartingLoadout('Mage')
```

| Export | Notes |
|--------|--------|
| `itemEngine` | Singleton `ItemEngineApi` |
| `createItemService()` | Fresh in-memory service for tests or DI |
| `EQUIPMENT_SLOTS` | `mainHand`, `offHand`, `shield`, `armor`, `accessories` |
| `ItemTemplate` | Definition/facts: id, name, optional description, compatible equipment slots, tags |
| `ItemInstance` / `ItemInstanceState` | Per-instance state: template id, durability, charges, custom name, enchantment refs |
| `InventorySnapshot` / `EquippedItemViews` | Query shapes that keep `template` facts separate from `instance` state |
| `createCurrencyService()` | Fresh in-memory single-currency balance service |
| `clampProposedPrice()` | Clamp DM-proposed prices; debits still reject insufficient funds |
| `generateLoot()` / `LOOT_TABLES` | Pure seedable loot generation returning `{ templateId, quantity }` drops |
| `seedItemTemplateCatalog()` | Registers starter/loot templates on an `ItemService` |
| `getStartingLoadout()` | Versioned Fighter/Rogue/Mage/Cleric/Ranger starter gear + known action ids |
| `ItemEngineApi` / `EngineEndpoint` | Public API and admin-callable endpoint types |

### Template and instance model

Templates are reusable item facts. Instances reference a `templateId` and hold only state that can
change per copy: durability, charges, custom name, and enchantment references. Inventory queries
return `{ template, instance }` views so NarrationEngine, DMEngine, CombatEngine, and UI callers can
read facts from this package instead of copying or inventing item stats.

### Inventory and equipment

Typed methods and admin endpoints are available for:

- `defineTemplate(template)` / `getTemplate(templateId)`
- `seedItemTemplateCatalog()`
- `createInventory(characterId)`
- `addItem(characterId, templateId, instanceState?)`
- `listInventory(characterId)`
- `getEquipped(characterId)`
- `equip(characterId, instanceId, slot)`
- `unequip(characterId, slotOrInstanceId)`
- `credit(characterId, amount)` / `debit(characterId, amount)` / `getBalance(characterId)`
- `clampProposedPrice(proposed, opts?)`
- `generateLoot({ difficulty?, tag?, seed, tableId? })`
- `getStartingLoadout(archetype)`

`equip` enforces template slot compatibility. Fixed slots (`mainHand`, `offHand`, `shield`, `armor`)
hold at most one item; `accessories` is a list. `unequip` returns items to held inventory without
changing instance state.

### Currency, loot, and starting gear

Currency is a single numeric balance per `characterId`. `credit` and `debit` reject negative or
non-finite amounts with typed `CurrencyError` subclasses, and `debit` rejects insufficient funds.
`clampProposedPrice` is intentionally separate: it bounds DM-proposed prices (default `1..10000`)
without changing balances.

Loot generation is deterministic and LLM-free. `generateLoot` accepts a seed plus optional difficulty,
tag, and table id, then returns template ids and quantities from seeded loot tables. Gold pouches are
not item templates; currency rewards should use the currency API.

`STARTING_GEAR_CATALOG_VERSION` versions the Fighter/Rogue/Mage/Cleric/Ranger loadouts. Loadout item
template ids resolve after `seedItemTemplateCatalog()`. Known-action grants are ActionEngine
`actionId` string references (`ice_bolt`, `hamstring_strike`) — not a parallel spell-stat catalog.
Consumer coverage lives in `src/contracts/actionEngineCatalog.contract.test.ts` against the real
`@weaver/action-engine` seed catalog.

### Admin endpoints

`itemEngine.listEndpoints()` includes all typed methods above in addition to `health`. These endpoints
accept plain object payloads for ElectronAdmin or other admin callers; ItemEngine itself imports no
Electron modules.

## Planned direction (from epics 032–036)

| Epic | Intent |
|------|--------|
| [033](../../board/in-progress/033-ItemEngine-Currency-And-Economy.md) | Implemented: single-currency debit/credit + DM-proposed price clamps |
| [034](../../board/backlog/034-ItemEngine-Weapon-Enchantments-And-Damage-Types.md) | Weapon enchantment overlays, multi-type damage |
| [035](../../board/in-progress/035-ItemEngine-Loot-Generation.md) | Implemented: encounter/quest loot tables |
| [036](../../board/in-progress/036-ItemEngine-Starting-Gear-Catalog.md) | Implemented: archetype starting-loadout catalog |

## Scripts

```bash
npx vitest run packages/ItemEngine
npm run build:engines
```
