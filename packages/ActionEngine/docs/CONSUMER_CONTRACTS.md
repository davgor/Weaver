# ActionEngine consumer contracts

ActionEngine owns action and effect definitions, use validation, effect
application, and Action-turn lockout. Consumers should store and grant catalog
`actionId` values, then read definitions and call `validateUse` / `useAction`
here — they must not reimplement use/lockout or invent mana.

## Contracts owned by ActionEngine (consumer of peer APIs)

- `packages/ActionEngine/src/contracts/characterEngineKnownActions.contract.test.ts`
  - CharacterEngine `learnKnownAction` / `listKnownActions` edge: learned catalog
    ids can be granted into ActionEngine and pass the known-action use gate;
    non-catalog ids fail closed.
- `packages/ActionEngine/src/contracts/combatEngineLockout.contract.test.ts`
  - After a successful `useAction`, CombatEngine `submitCombatAction` marks the
    turn Action used; a second combat Action and a second `useAction` fail while
    lockout is active. No mana.
- `packages/ActionEngine/src/contracts/meleeWeaponReach.contract.test.ts`
  - `meleeWeapon` reach comes only from caller-supplied Item/Combat
    `weaponReachFeet` inputs — not from the action definition.

## Contracts owned by other consumers

- `packages/ItemEngine/src/contracts/actionEngineCatalog.contract.test.ts`
  - Starting gear from ticket `036` refers to catalog ids (`ice_bolt`,
    `hamstring_strike`) instead of carrying parallel spell/class-action stats.
  - Asserts those ids resolve from the real `createSeedCatalog()` export.

## Expected future CharacterEngine-owned contracts

When additional CharacterEngine call sites land, add consumer-owned contract
tests that import the real `@weaver/action-engine` public API:

- `packages/CharacterEngine/src/actionCatalog.contract.test.ts`
  - Starting loadouts from ticket `026` grant catalog ids such as `ice_bolt`.
  - Level-up grants from ticket `025` validate ids through ActionEngine before
    recording them as known actions.

Those tests should assert the import path, exported seed/grant helpers, and the
action ids each consumer depends on. They should not mock ActionEngine's public
API or duplicate `range`, `effects`, or `cost` blobs in the consumer package.
