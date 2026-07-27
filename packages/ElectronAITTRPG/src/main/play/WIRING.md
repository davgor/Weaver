# Live play dependency wiring

Production Ask-DM / turn resolution must open the active campaign SQLite session and inject
bound engine stores. Unit and smoke tests keep in-memory fixtures.

## Production path

`createGameServices(campaignsRoot)` builds play handlers via `createLivePlayHandlerDeps`:

1. Each `play:submitAction` resolves deps with `createCampaignLivePlayDeps({ campaignId, characterId, campaignsRoot, textCompleter })`.
2. That factory calls `openCampaignSession` (or reuses `getActiveCampaignSession` for the same id).
3. `ResolveTurnDeps` then uses:
   - ItemEngine bound currency / inventory (`itemEngine.credit|debit|listInventory`)
   - NPCEngine `getNpc` for narration presence checks
   - Character/NPC location lists for `isKnownLocation` (not unconditional `true`)
   - CombatEngine `createJsonEncounterStore({ dataRoot })` under `{campaign}/data/combat/encounters/`
   - `persist` writing turn JSON under `{campaign}/data/turns/`
4. Character autosave remains via CharacterEngine `recordAutosaveSnapshot` in the turn service lifecycle hook (durable once the campaign fact store / autosave portability path is bound).

IPC handlers in `registerHandlers.ts` stay thin — they only call `turnService` / `askDmService`.

## Test path

- `createLiveResolveTurnDeps(completer)` still builds **in-memory** currency + `createMemoryEncounterStore` + permissive narration stubs for unit/smoke/contract tests that do not open SQLite.
- Playability smoke documents restart checks against the production factory / campaign DB fixtures (`createCampaignLivePlayDeps.test.ts`).

## Errors

Missing/blank `campaignId` or unreadable campaign DB raises `CampaignLivePlayError` with a clear message before turn routing runs.
