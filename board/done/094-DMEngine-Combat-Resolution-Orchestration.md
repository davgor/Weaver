# EPIC: DMEngine combat resolution orchestration

Wire the play combat branch so free-text combat turns call CombatEngine's real resolution APIs (`resolveAttack`, flee/surrender/non-lethal/execute) instead of only logging typed actions via `submitCombatAction`. ActionEngine legality applies when the combatant uses a known action.

**Why now:** Epics `048`–`050` and `084` shipped resolution math and lockout, but `resolveCombatBranch` still only calls `submitCombatAction` with `{ type: 'typed-action' }`. Play never applies hit/damage/crits or combat exits. Blocks death, XP, and loot loops.

**Depends on:** `053-DMEngine-Turn-Routing`, `048-CombatEngine-Encounter-Lifecycle`, `049-CombatEngine-Hit-Damage-Crit-Conditions`, `050-CombatEngine-Flee-Surrender-Nonlethal`, `084-ActionEngine-Use-Resolution-And-Lockout`.

**LLM boundary:** DMEngine selects which CombatEngine/ActionEngine API to call from routed intent; it does not invent attack rolls, damage, or dispositions. NarrationEngine narrates the resolved outcome.

## Acceptance criteria

- [x] Combat turns that attack resolve through CombatEngine `resolveAttack` (hit/damage/crit/conditions), not typed-action logging alone
- [x] Flee, surrender, non-lethal victory, and execute are reachable from routed combat intent and update encounter/disposition via CombatEngine APIs
- [x] Known-action combat uses ActionEngine use/lockout legality before resolution when an `actionId` is supplied
- [x] Combat branch resolution exposes enough facts (HP, conditions, outcome kind) for NarrationEngine and play chrome
- [x] Consumer `*.contract.test.ts` covers DMEngine → CombatEngine and DMEngine → ActionEngine published APIs
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready
