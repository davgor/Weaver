# @weaver/action-engine

Deterministic home for usable abilities and the effects they apply. Spells and class actions share one `ActionDefinition` model; flavor tags are presentation metadata and do not change validation or resolution paths.

## Boundary

- Owns action definitions, reusable effect definitions, typed ranges, catalog-driven Action-turn costs, `validateUse` / `useAction`, and Action-turn lockout state.
- **No mana pool.** Ability cost is Action-turn lockout from the catalog only. LLM-proposed durations, ranges, and costs are ignored.
- Flavor tags (`spell`, `classAction`, …) do **not** fork resolution — the same `validateUse` / `useAction` path runs for every action.
- Does not import Electron, renderer code, LLM providers, CombatEngine, CharacterEngine, or DMEngine in production source.
- Does not invent action facts or weapon reach. Narration may describe an accepted action; DM/Combat/Character/Electron callers must ask this package for ability/effect/range/use legality.

## Call paths

| Caller | Uses ActionEngine for |
|--------|------------------------|
| **DMEngine** | Validate/use intents; apply catalog effects + lockout — do not reimplement use/lockout |
| **CombatEngine** | Turn/Action slots (`actionUsed`); consume ActionEngine lockout/effect results |
| **CharacterEngine** | Known-action id lists; grant/learn catalog ids, then gate use here |
| **Electron (Admin / AITTRPG)** | Engine catalog endpoints; play UI lockout chrome from use/lockout results |
| **ItemEngine** | Starting gear action ids; equipped weapon **reach** supplied into `weaponReachFeet` at use time |

## Shipped APIs

- Engine surface: `actionEngine.health()`, `actionEngine.listEndpoints()`, `actionEngine.call(endpoint, payload)`.
- Effects: `EffectDefinition`, `slowMovementEffect`, `createEffectRegistry`, `defineEffect`, `getEffect`.
- Ranges: `ActionRange`, `FeetRange`, `MeleeWeaponRange`, `isValidRange`.
- Actions: `ActionDefinition`, `defineAction`, `createActionRegistry`, `putAction`, `getAction`, `deleteAction`, `listActions`, `listActionsByEffect`.
- Seed catalog: `SEED_CATALOG_VERSION`, `createSeedCatalog`.
- Known actions: `createKnownActionStore`, `grantKnownAction`, `revokeKnownAction`, `listKnownActions`, `knowsAction`.
- Use / lockout: `validateUse`, `useAction`, `createActionLockoutStore`, `defaultUseActionDeps`.
- Validation/mechanics: `isValidActionDefinition`, `actionsAreMechanicallyEqual`.

Endpoints include `validateUse` and `useAction` alongside catalog and known-action helpers.

`slow_movement` is the first typed effect. Both `ice_bolt` (feet range) and `hamstring_strike` (`meleeWeapon`) apply it. Feet ranges compare `distanceFeet` to the catalog amount. `meleeWeapon` compares `distanceFeet` to caller-supplied `weaponReachFeet` from Item/Combat — the action def carries no invented reach.

## Catalog authoring

Add reusable effects first, then reference them from actions by `effectId`.
Actions should not fork into spell-only or class-action-only stat models:

```ts
defineAction({
  actionId: 'frost_cut',
  name: 'Frost Cut',
  flavorTags: ['classAction'],
  range: { kind: 'meleeWeapon' },
  effects: [{ effectId: 'slow_movement', params: { feetPenalty: 10, durationRounds: 1 } }],
  cost: { actionTurns: 1 }
})
```

Flavor tags are cosmetic presentation hints. A caller may show `spell`,
`classAction`, or another tag in UI copy, but validation and mechanical
resolution use the shared `range`, `effects`, and `cost` fields.

`createSeedCatalog()` returns a fresh deterministic catalog for new campaigns.
Persist `SEED_CATALOG_VERSION` with campaign data when a campaign needs to know
which seed generated its starting action ids. Bump the seed version only when
changing shipped seed contents or mechanics in a way that a fresh campaign
should observe.

Known-action helpers store only `actionId` values per character. Character,
item, level-up, and loadout callers should grant ids from this catalog and read
definitions back from ActionEngine instead of copying range or effect blobs.

## Use resolution

```ts
const deps = { catalog, knownActions, lockout: createActionLockoutStore() }
validateUse({ characterId, actionId: 'ice_bolt', distanceFeet: 20 }, deps)
useAction(
  { characterId, actionId: 'ice_bolt', distanceFeet: 20, targetIds: ['foe-1'] },
  deps
)
```

Successful `useAction` applies catalog `effects[]` to each target and records
catalog `cost.actionTurns` lockout. A second use while locked fails closed.
Coordinate with CombatEngine's turn `actionUsed` slot (see contract tests).

See [`docs/CONSUMER_CONTRACTS.md`](docs/CONSUMER_CONTRACTS.md) for consumer
contract-test expectations.

## Build and test

```bash
npx vitest run packages/ActionEngine
npm run build -w @weaver/action-engine
```

## Epics

- `082` — ability, effect, and range model
- `083` — seed catalog and known actions
- `084` — use resolution, effect application, and Action-turn lockout (no mana)
