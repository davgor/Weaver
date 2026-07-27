# EPIC: Live Settings LLM for campaign create + play

Wire campaign create and play (and onboarding) to the Settings-applied text client so a configured provider invents campaign prose and play narration — not the scripted contract completers. Keep scripted completers for unit/contract/smoke tests only.

**Why now:** REBUILD_SPEC §15 requires create → onboard → hub → play with a configured provider. Settings (098) and onboarding already exercise real LLM clients; create/play still hardcode scripted completers (`campaignCreate/WIRING.md`, `play/registerHandlers.ts`). Board backlog was empty after 104.

**Depends on:** `098-ElectronAITTRPG-Local-Llm-Settings-And-Intro`, `052-DMEngine-Campaign-Generation-Pipeline`, `053-DMEngine-Turn-Routing`, `069-ElectronAITTRPG-Campaign-Creation-And-Review-Ui`, `067-LLMEngine-Multi-Cloud-Provider-Adapters`.

**Out of scope:** Live RAG retrieval in turns (Phase J); quest offer UX; rest/live-population stubs; inactive-PC proxy hub UI.

## Sub-tickets

| Id | Summary |
|----|---------|
| `105.1` | Settings-backed `TextCompleter` adapter (unit-tested, no Electron) |
| `105.2` | Share one `SettingsRuntime` across settings / create / play / onboarding bootstrap |
| `105.3` | Campaign create live path uses Settings completer; docs/WIRING updated |
| `105.4` | Play turn + Ask-DM live path uses Settings completer |

## Acceptance criteria

- [x] Shared adapter maps `SettingsRuntime.getActiveTextClient()` (with clear fallback/error policy) to NarrationEngine `TextCompleter`
- [x] Production bootstrap constructs one Settings runtime and passes the same completer into campaign create, play, and onboarding
- [x] Default `createLiveGenerationDeps()` / play live deps no longer silently ship scripted prose for production wiring
- [x] Unit/contract/smoke tests still inject scripted completers and stay deterministic
- [x] `WIRING.md` documents the live Settings path as the production default
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 105.1 — Settings-backed TextCompleter adapter

Extract a pure, unit-tested adapter that turns SettingsRuntime’s active LLM client into a NarrationEngine/DMEngine `TextCompleter`.

**Parent:** `105-ElectronAITTRPG-Live-Settings-Llm-Create-Play`. **Depends on:** none within epic.

#### Acceptance criteria

- [x] Module under `packages/ElectronAITTRPG/src/main/settings/` (or shared main helper) exports `createSettingsBackedTextCompleter`
- [x] When an active client exists, `completeText` delegates to it and maps `text` + `backend`
- [x] When no active client exists, documented fallback creates a default client via injected factory (or fails with a clear error) — behavior covered by tests
- [x] Unit tests do not boot Electron; oxlint complexity/line limits respected

### 105.2 — Shared SettingsRuntime bootstrap

Construct one SettingsRuntime (and store) at app bootstrap and inject it into settings handlers plus create/play/onboarding live deps.

**Parent:** `105-ElectronAITTRPG-Live-Settings-Llm-Create-Play`. **Depends on:** `105.1`.

#### Acceptance criteria

- [x] `registerGameHandlers` / game-services factory owns a single `SettingsRuntime` instance
- [x] `registerSettingsHandlers` accepts that runtime (no second private live runtime for production)
- [x] Onboarding live ports use the shared settings-backed completer instead of a private `createTextCompletionClient()` cache
- [x] Glue stays thin; new logic lives in tested modules

### 105.3 — Campaign create uses Settings completer

Production campaign generation uses the shared Settings-backed TextCompleter.

**Parent:** `105-ElectronAITTRPG-Live-Settings-Llm-Create-Play`. **Depends on:** `105.1`, `105.2`.

#### Acceptance criteria

- [x] `createLiveGenerationPort` / game-services wiring passes Settings-backed completer into `createLiveGenerationDeps`
- [x] Contract/unit tests that need deterministic labeled blocks still pass an explicit scripted completer
- [x] `campaignCreate/WIRING.md` states Settings completer is the production default (not optional)

### 105.4 — Play + Ask-DM use Settings completer

Production play turn routing, narration, and Ask-DM use the shared Settings-backed TextCompleter.

**Parent:** `105-ElectronAITTRPG-Live-Settings-Llm-Create-Play`. **Depends on:** `105.1`, `105.2`.

#### Acceptance criteria

- [x] `createLivePlayHandlerDeps` / bootstrap injects Settings-backed completer for route, narration.llm, and Ask-DM
- [x] Playability smoke and turn/Ask-DM contract tests continue to inject scripted completers
- [x] No production path silently returns fixed scripted scene prose when Settings has an active client
