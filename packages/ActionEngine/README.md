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
- Validation/mechanics: `isValidActionDefinition`, `actionsAreMechanicallyEqual`.

`slow_movement` is the first typed effect. For example, both `ice_bolt` and `hamstring_strike` can reference `{ effectId: 'slow_movement', params: { feetPenalty, durationRounds } }` while keeping distinct `actionId`, flavor tags, and ranges.

## Build and test

```bash
npx vitest run packages/ActionEngine
npm run build -w @weaver/action-engine
```

## Planned work

- Epic `083`: seed/catalog APIs and known-action catalog integration.
- Epic `084`: use resolution, Action-turn lockout, and CombatEngine consumption of accepted action effects.
