# CharacterEngine (`@weaver/character-engine`)

Deterministic player-character facts and core ability resolution for Weaver campaigns.

## Role

Owns the PC-side ability model: Body, Agility, Mind, Presence; ability modifiers; core
`d20 + ability modifier + optional proficiency` checks; and armor class from Agility plus
a caller-supplied armor bonus. CombatEngine, DMEngine, Electron shells, and later UI flows
call this package instead of reimplementing the math.

## Boundaries

- **LLM-free** - no model calls, prompts, or story invention.
- **No Electron** - library only; UI shells call through published exports.
- **No ItemEngine dependency for AC** - equipment flows pass a numeric armor bonus.
- Consumers that call this package need `*.contract.test.ts` against the real API.

## Public API (today)

```ts
import {
  ABILITIES,
  calculateArmorClass,
  characterEngine,
  getAbilityModifier,
  resolveAbilityCheck
} from '@weaver/character-engine'

const modifier = getAbilityModifier(12) // 1
const ac = calculateArmorClass({ agilityScore: 18, armorBonus: 4 }) // 18

const result = resolveAbilityCheck(
  {
    ability: 'Body',
    scores: { Body: 14, Agility: 12, Mind: 10, Presence: 8 },
    proficient: true,
    proficiencyBonus: 2,
    target: 15,
    rollMode: 'advantage'
  },
  () => 17
)

characterEngine.health()
characterEngine.listEndpoints()
await characterEngine.call('health')
```

| Export | Notes |
|--------|-------|
| `ABILITIES` / `Ability` / `AbilityScores` | The only core abilities: Body, Agility, Mind, Presence |
| `getAbilityModifier` | `floor((score - 10) / 2)` |
| `resolveAbilityCheck` | Rolls d20, applies ability modifier and proficiency bonus, supports advantage/disadvantage |
| `calculateArmorClass` | `10 + Agility modifier + armor bonus` |
| `characterEngine` | Singleton `CharacterEngineApi` with health/listEndpoints/call |
| `CharacterEngineApi` / `EngineEndpoint` | Admin-compatible endpoint types |

## Planned direction (from epics 022-031)

| Epic | Intent |
|------|--------|
| [022](../../board/backlog/022-CharacterEngine-Ability-Score-Generation.md) | Ability score generation and assignment flows |
| [023](../../board/backlog/023-CharacterEngine-Hp-Model.md) | HP model shared by PCs, NPCs, and enemies |
| [024](../../board/backlog/024-CharacterEngine-Damage-Conditions-Dying.md) | Damage types, conditions, dying state |
| [025](../../board/backlog/025-CharacterEngine-Xp-And-Level-Up.md) | XP and level-up progression |
| [026](../../board/backlog/026-CharacterEngine-Archetypes-And-Starting-Loadouts.md) | Archetypes and starting loadout selection |
| [027](../../board/backlog/027-CharacterEngine-Death-Modes-And-Obituary.md) | Death modes and obituary flow |
| [028](../../board/backlog/028-CharacterEngine-Journal-Logbook-Quests-Spellbook.md) | Journal, log book, quest log, and known-action list |
| [029](../../board/backlog/029-CharacterEngine-Race-And-Background-Selection.md) | Race and background selection |
| [030](../../board/backlog/030-CharacterEngine-Companions-And-Inactive-Proxy.md) | Companions and inactive PC proxying |
| [031](../../board/backlog/031-CharacterEngine-Time-And-Rest.md) | Time and rest state |

## Scripts

```bash
npx vitest run packages/CharacterEngine
npm run build -w @weaver/character-engine
```
