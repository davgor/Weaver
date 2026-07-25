# EPIC: Parameterized engine endpoints, hooked into AI ADMIN for manual testing

Every `*Engine` package exposes `listEndpoints()` / `call(endpoint)` for AI ADMIN to exercise, and AI ADMIN already lists all 10 existing engines and calls their endpoints generically — but `EngineEndpoint.invoke` and `call()` take **no arguments**. Every endpoint that exists today (`health`, `describeRole`, LLMEngine's `getStatus`/`getModelSpec`/`resolveBackend`) is a zero-argument read; there is currently no way to invoke an endpoint with input. Every real API coming out of epics `021`–`068` (ability rolls, item creation, combat resolution, campaign generation, etc.) needs input parameters, so as those land, none of them could be exercised from AI ADMIN without this fixed first.

**Why now:** requested ahead of implementing the `021`–`068` epics specifically so each new API is testable in AI ADMIN the moment it's built, instead of retrofitting admin wiring once the full workflow is already done.

**Depends on:** none (infra epic; touches existing scaffolds only). **Feeds:** every future sub-ticket under `021`–`068` that adds a real (non-`health`) endpoint — those tickets should register the endpoint in `listEndpoints()` and rely on this plumbing, not reinvent it.

## Scope

- Widen `EngineEndpoint.invoke` from `() => Promise<unknown> | unknown` to `(payload?: unknown) => Promise<unknown> | unknown`, and `call(endpoint: string)` to `call(endpoint: string, payload?: unknown)`, across all 10 engine packages (`CombatEngine`, `WorldEngine`, `RegionalEngine`, `CivilizationEngine`, `NarrationEngine`, `ItemEngine`, `NPCEngine`, `EnemyEngine`, `DMEngine`, `LLMEngine`). Backward compatible — existing zero-arg `invoke` implementations still satisfy the widened type.
- Extract AI ADMIN's engine-catalog-building and call-dispatch logic out of `src/main/index.ts` (currently untested, entangled with `app`/`BrowserWindow`) into a pure, dependency-injected module so it's unit-testable without booting Electron.
- Thread a `payload` through the full chain: renderer input → preload bridge → `engines:call` IPC → dispatch → `engine.call(endpoint, payload)`.
- Add a payload input (JSON) to AI ADMIN's endpoint UI so a tester can supply arguments per endpoint call, and show what was sent alongside the result.

## Acceptance criteria

- [x] All 10 engine packages' `EngineEndpoint`/`call` types and implementations accept an optional `payload: unknown` and forward it to the matched endpoint's `invoke`; each package's existing tests plus a new payload-passthrough test pass
- [x] LLMEngine's `types.ts`/`createLlmEngine.ts` (its own copy of the pattern) is updated identically
- [x] `ElectronAdmin/src/main/engineDispatch.ts` (new) exports pure `buildCatalog(engines)` and `dispatchEngineCall(engines, engineId, endpoint, payload)` functions with unit tests using fake engine objects (no real `@weaver/*-engine` imports needed, no Electron boot required) — proving payload threads from dispatch call through to the fake engine's `call`
- [x] `main/index.ts` is refactored to use `engineDispatch.ts` and forwards a third `payload` argument through `ipcMain.handle('engines:call', ...)`
- [x] `preload/index.ts`, `shared/engineCatalog.ts` (`WeaverAdminApi.callEndpoint`), and `EngineCallResult` are updated so the renderer can pass a payload and see it echoed alongside the result
- [x] `EndpointPanel.tsx` gains a per-endpoint JSON payload input; invalid JSON is caught and shown inline without calling the endpoint; empty input sends `undefined` (implemented via an extracted `EndpointRow` component to stay under the oxlint 50-line/function limit)
- [x] `useAdminState.ts` / `AdminReadyView.tsx` thread the new `onRun(endpoint, payload?)` signature through without changing unrelated behavior
- [x] `npm test` (110/110), `npm run lint`, `npm run typecheck`, `npm run build`, `npm run deadcode` all pass
- [ ] `act` CI (`pr-checks.yml` + `deadcode.yml`) — **not run**: Docker was not running in this environment. Local gates above are all green; re-run `act` before treating this as fully CI-verified.
- [ ] Note for whoever implements `021` (CharacterEngine scaffold): once that package exists, it must be added to AI ADMIN's `engines` array (`main/index.ts`) and to `REQUIRED_ENGINE_IDS` in `ElectronAITTRPG/src/shared/engineHealth.ts` — both are hardcoded lists this ticket does not touch since the package doesn't exist yet
