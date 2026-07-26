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

## Public API

```ts
import {
  ABILITIES,
  addJournalEntry,
  advanceTravelDays,
  assignStandardArrayAbilityScores,
  calculateArmorClass,
  characterEngine,
  computeMaxHp,
  getCampaignDay,
  getAbilityModifier,
  listKnownActions,
  longRest,
  persistCharacterMaxHp,
  pointBuyAbilityScores,
  resolveAbilityCheck
} from '@weaver/character-engine'

const modifier = getAbilityModifier(12) // 1
const ac = calculateArmorClass({ agilityScore: 18, armorBonus: 4 }) // 18
const scores = pointBuyAbilityScores({ Body: 11, Agility: 11, Mind: 11, Presence: 11 })
const standard = assignStandardArrayAbilityScores({ Body: 14, Agility: 12, Mind: 10, Presence: 8 })
const maxHp = computeMaxHp(8, 3, 2, [8, 5, 6]) // 21

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
await characterEngine.call('advanceTravelDays', { campaignId: 'campaign-1', proposedDays: 4 })
```

| Export | Notes |
|--------|-------|
| `ABILITIES` / `Ability` / `AbilityScores` | The only core abilities: Body, Agility, Mind, Presence |
| `getAbilityModifier` | `floor((score - 10) / 2)` |
| `resolveAbilityCheck` | Rolls d20, applies ability modifier and proficiency bonus, supports advantage/disadvantage |
| `calculateArmorClass` | `10 + Agility modifier + armor bonus` |
| `pointBuyAbilityScores` | Validates a 12-point allocation from base score 8, with scores 8-20 |
| `assignStandardArrayAbilityScores` | Validates a unique assignment of 14, 12, 10, and 8 |
| `rollAbilityScoreDraft` / `confirmRolledAbilityScores` | Pure roll-for-stats draft and confirm flow; roller is injectable for tests |
| `computeMaxHp` | Pure HP model; sums per-level hit-die contributions and applies Body modifier once at level 1 |
| `persistCharacterMaxHp` / `getCharacterStats` | In-memory `stats.maxHp` snapshot helpers for characters |
| Journal/log/quest/known-action helpers | Character-scoped in-memory records; known actions store action ids only |
| Race/background helpers | Campaign-scoped rosters plus persisted character selections; race lore is realized once per campaign |
| Time/rest helpers | Campaign-scoped day counter; long rest adds 1 day, travel clamps to 1-30 days |
| `characterEngine` | Singleton `CharacterEngineApi` with health/listEndpoints/call |
| `CharacterEngineApi` / `EngineEndpoint` | Admin-compatible endpoint types |

## Consumer notes

- HP is computed as the sum of per-level hit-die contributions plus the Body modifier once at level 1.
  When rolls are omitted, `computeMaxHp` uses the hit die value as that level's fixed contribution.
- Villagers/civilians default to 10 HP. NPC and enemy hydration should use that default for ordinary
  civilians and `computeMaxHp` for catalog creatures or retired adventurers instead of inventing a separate formula.
- Catalog-authored `hp` fields are authoring reference only. Runtime hydration recomputes max HP from
  hit die, level, Body modifier, and any stored rolls, then persists the resulting `stats.maxHp`.
- The "spellbook" UI surface should store known ActionEngine action ids only. Action definitions remain
  owned by ActionEngine and are not copied into CharacterEngine records.
- Race lore can be supplied by an orchestrating caller on first selection; CharacterEngine stores and
  reuses it for the campaign without calling an LLM.

## Planned direction

| Epic | Intent |
|------|--------|
| [022](../../board/in-progress/022-CharacterEngine-Ability-Score-Generation.md) | Ability score generation and assignment flows |
| [023](../../board/in-progress/023-CharacterEngine-Hp-Model.md) | HP model shared by PCs, NPCs, and enemies |
| [024](../../board/backlog/024-CharacterEngine-Damage-Conditions-Dying.md) | Damage types, conditions, dying state |
| [025](../../board/backlog/025-CharacterEngine-Xp-And-Level-Up.md) | XP and level-up progression |
| [026](../../board/backlog/026-CharacterEngine-Archetypes-And-Starting-Loadouts.md) | Archetypes and starting loadout selection |
| [027](../../board/backlog/027-CharacterEngine-Death-Modes-And-Obituary.md) | Death modes and obituary flow |
| [028](../../board/in-progress/028-CharacterEngine-Journal-Logbook-Quests-Spellbook.md) | Journal, log book, quest log, and known-action list |
| [029](../../board/in-progress/029-CharacterEngine-Race-And-Background-Selection.md) | Race and background selection |
| [030](../../board/backlog/030-CharacterEngine-Companions-And-Inactive-Proxy.md) | Companions and inactive PC proxying |
| [031](../../board/in-progress/031-CharacterEngine-Time-And-Rest.md) | Time and rest state |

## Scripts

```bash
npx vitest run packages/CharacterEngine
npm run build -w @weaver/character-engine
```
