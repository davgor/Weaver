# ActionEngine consumer contracts

ActionEngine owns action and effect definitions. Consumers should store and grant
catalog `actionId` values, then read the corresponding definitions from
ActionEngine when they need range, effect, cost, or flavor metadata.

## Consumer contract tests

- `packages/ItemEngine/src/contracts/actionEngineCatalog.contract.test.ts`
  - Starting gear from ticket `036` refers to catalog ids (`ice_bolt`,
    `hamstring_strike`) instead of carrying parallel spell/class-action stats.
  - Asserts those ids resolve from the real `createSeedCatalog()` export.

## Expected future contract tests

When additional CharacterEngine call sites land, add consumer-owned contract
tests that import the real `@weaver/action-engine` public API:

- `packages/CharacterEngine/src/actionCatalog.contract.test.ts`
  - Starting loadouts from ticket `026` grant catalog ids such as `ice_bolt`.
  - Level-up grants from ticket `025` validate ids through ActionEngine before
    recording them as known actions.

Those tests should assert the import path, exported seed/grant helpers, and the
action ids each consumer depends on. They should not mock ActionEngine's public
API or duplicate `range`, `effects`, or `cost` blobs in the consumer package.
