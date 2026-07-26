# EPIC: ItemEngine item model & inventory slots

Give `@weaver/item-engine` its core domain model: item definitions, character-held instances, and equipment slots — the foundation every other ItemEngine epic builds on.

**Ported from:** `board/done/024-item-tracking-and-equipment.md` and the "Inventory/economy" section of AI-DND-Matrix's README (narrative item list with equipment slots including main hand / off hand / shield / accessories).

**Depends on:** none (foundation epic for this package). **Feeds:** `033`–`036` (all other ItemEngine epics), CombatEngine (`049-CombatEngine-Hit-Damage-Crit-Conditions` reads equipped weapon/armor), CharacterEngine (`026-CharacterEngine-Archetypes-And-Starting-Loadouts` assigns starting items).

**LLM boundary:** deterministic only — no Electron, no invented item stats. NarrationEngine may describe an item in prose but must query this package for the facts first.

## Sub-tickets

| Id | Summary |
|----|---------|
| `032.1` | Item template vs instance types + equipment slot enum |
| `032.2` | Create / query inventory APIs for a character, unit-tested |
| `032.3` | Equip / unequip APIs with slot rules, unit-tested |
| `032.4` | Confirm scaffold/README/`build:engines` wiring; LLM-free boundary docs |

## Acceptance criteria

- [x] Item template (definition) and item instance are distinct types — instances reference a template plus instance-specific state (durability, charges, custom name, enchantment refs)
- [x] Equipment slots cover at least: main hand, off hand, shield, armor, and a generic accessories list
- [x] Create / equip / unequip / query APIs for a character's inventory, all unit-tested
- [x] Package scaffolded matching sibling engines, added to root README package table and `build:engines`
- [x] Explicit: no invented loot stats in prose-only paths — NarrationEngine and DMEngine must read item facts from this package
- [x] Sub-tickets listed above exist as `board/backlog/032.*` files; none implemented until separately completed

## Sub-tickets

### 032.1 032.1 — Item template vs instance types + equipment slots

Define distinct item template and instance types plus equipment slot coverage (main hand, off hand, shield, armor, accessories).

**Parent:** `032-ItemEngine-Item-Model-And-Inventory`.

#### Acceptance criteria

- [x] Template and instance are distinct exported types; instances reference a template id plus instance state fields
- [x] Slots cover main hand, off hand, shield, armor, and accessories list
- [x] Unit tests cover type/slot invariants

### 032.2 032.2 — Create / query inventory APIs

APIs to create items into a character inventory and query held/equipped state.

**Parent:** `032-ItemEngine-Item-Model-And-Inventory`. **Depends on:** `032.1`.

#### Acceptance criteria

- [x] Create + query APIs are unit-tested for a character inventory
- [x] Query distinguishes template facts vs instance state
- [x] Admin-callable endpoints registered for the new APIs

### 032.3 032.3 — Equip / unequip APIs

Equip and unequip with slot rules, unit-tested.

**Parent:** `032-ItemEngine-Item-Model-And-Inventory`. **Depends on:** `032.2`.

#### Acceptance criteria

- [x] Equip/unequip enforce slot compatibility and are unit-tested
- [x] Unequip returns items to inventory without destroying instance state
- [x] Explicit: no invented item stats — callers read facts from this package

### 032.4 032.4 — Scaffold/README confirmation + LLM-free boundary

Confirm ItemEngine scaffold, root README/`build:engines` wiring, and docs for the shipped inventory surface.

**Parent:** `032-ItemEngine-Item-Model-And-Inventory`. **Depends on:** `032.3`.

#### Acceptance criteria

- [x] Package remains on `build:engines` and README documents template/instance/slot APIs
- [x] Explicit: NarrationEngine/DMEngine must read item facts from this package
- [x] No Electron imports in the engine package

