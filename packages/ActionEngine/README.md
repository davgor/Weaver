# @weaver/action-engine

Deterministic home for usable abilities and the effects they apply. Spells and class actions share one `ActionDefinition` model; flavor tags are presentation metadata and do not change validation or resolution paths.

## Boundary

- Owns action definitions, reusable effect definitions, typed ranges, and catalog-driven Action-turn costs.
- Does not import Electron, renderer code, LLM providers, CombatEngine, CharacterEngine, or DMEngine.
- Does not invent action facts. Narration may describe an accepted action, and DM/Combat/Character/Electron callers must ask this package for ability/effect/range data.

## Shipped APIs

- Engine surface: `actionEngine.health()`, `actionEngine.listEndpoints()`, `actionEngine.call(endpoint, payload)`.
- Effects: `EffectDefinition`, `slowMovementEffect`, `createEffectRegistry`, `defineEffect`, `getEffect`.
- Ranges: `ActionRange`, `FeetRange`, `MeleeWeaponRange`, `isValidRange`.
- Actions: `ActionDefinition`, `defineAction`, `createActionRegistry`, `putAction`, `getAction`, `deleteAction`, `listActions`, `listActionsByEffect`.
- Seed catalog: `SEED_CATALOG_VERSION`, `createSeedCatalog`.
- Known actions: `createKnownActionStore`, `grantKnownAction`, `revokeKnownAction`, `listKnownActions`, `knowsAction`.
- Validation/mechanics: `isValidActionDefinition`, `actionsAreMechanicallyEqual`.

`slow_movement` is the first typed effect. For example, both `ice_bolt` and `hamstring_strike` can reference `{ effectId: 'slow_movement', params: { feetPenalty, durationRounds } }` while keeping distinct `actionId`, flavor tags, and ranges.

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
See [`docs/CONSUMER_CONTRACTS.md`](docs/CONSUMER_CONTRACTS.md) for the future
consumer contract-test expectations.

## Build and test

```bash
npx vitest run packages/ActionEngine
npm run build -w @weaver/action-engine
```

## Planned work

- Epic `084`: use resolution, Action-turn lockout, and CombatEngine consumption of accepted action effects.
