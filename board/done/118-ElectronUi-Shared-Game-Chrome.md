# EPIC: Shared Electron game UI package

Stand up `packages/ElectronUi` (`@weaver/electron-ui`) as the shared presentation chrome for Weaver Electron games. Port/adapt the reusable shell from [AI-DND-Matrix](https://github.com/davgor/AI-DND-Matrix) (startup loading animation, frameless titlebar primitives, theme tokens, local-LLM first-run/settings chrome) so `ElectronAITTRPG` and the new `ElectronAIVN` client do not fork two copies of the same UI.

**Why now:** A second game client (`ElectronAIVN`) needs the same boot/loading and LLM install UX already proven in Matrix / AI TTRPG. Extracting shared chrome before AIVN scaffolding avoids a third divergent copy.

**Ported from:** AI-DND-Matrix `src/renderer/src/settingsIntro/*`, `src/renderer/src/settings/LlamaLocalSection*`, startup loading (`board/done/015-startup-loading-screen.md`), titlebar/brand chrome (`103-fix-packaged-titlebar-brand-icon.md`), GPU/CPU backend radios (`020.28-gpu-cpu-runtime-backend-radios.md`), plus Weaver `ElectronAITTRPG` `LoadingScreen` / `SettingsIntroOverlay` / `LocalModelSection` as the in-repo baseline to consolidate.

**Depends on:** none (foundation). **Feeds:** `119-ElectronAIVN-Scaffold-And-Dev-Cmd`, `120-ElectronAIVN-Llm-First-Run-And-Boot`; optional later adoption by `ElectronAITTRPG`.

**Out of scope:** Game-specific play layouts (TTRPG four-column play, VN stage); packaging/release of either game; image-generation UI.

## Sub-tickets

| Id | Summary |
|----|---------|
| `118.1` | Package scaffold + theme/token exports |
| `118.2` | Startup loading screen (brandable stage label + progress) |
| `118.3` | Frameless titlebar / window-control primitives |
| `118.4` | Local LLM install + GPU/CPU backend choice chrome |
| `118.5` | First-run settings-intro wizard shell (content slots only) |

## Acceptance criteria

- [x] `packages/ElectronUi` exists as `@weaver/electron-ui` with build/test/typecheck scripts matching other workspace packages
- [x] Exports cover: theme CSS variables, `LoadingScreen` (brandable title/stage/progress), titlebar primitives, local-model install panel with explicit GPU (Vulkan) vs CPU choice, and a first-run intro shell that accepts slotted steps
- [x] Package is renderer-safe (no Electron main imports); consumers wire IPC themselves
- [x] Unit/happy-dom tests cover loading progress states and backend-choice selection helpers
- [x] Root README package table documents `@weaver/electron-ui`; `npm test` / `lint` / `build` / `deadcode` pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 118.1 — Package scaffold + theme tokens

**Parent:** `118-ElectronUi-Shared-Game-Chrome`. **Depends on:** none.

#### Acceptance criteria

- [x] Workspace package `@weaver/electron-ui` builds and is importable by Electron renderer packages
- [x] Shared CSS variables / base theme file exported; no game-specific brand copy hard-coded as the only theme

### 118.2 — Startup loading screen

**Parent:** `118-ElectronUi-Shared-Game-Chrome`. **Depends on:** `118.1`.

#### Acceptance criteria

- [x] Loading screen accepts brand title, stage label, status text, progress %, and failure message props
- [x] Visual language matches Matrix / AI TTRPG loading animation (ported, not reinvented)
- [x] Happy-dom test covers booting / ready / failed presentations

### 118.3 — Titlebar primitives

**Parent:** `118-ElectronUi-Shared-Game-Chrome`. **Depends on:** `118.1`.

#### Acceptance criteria

- [x] Frameless titlebar + window control button set exported as presentational components
- [x] Drag-region / no-drag class helpers documented for Electron consumers

### 118.4 — Local LLM install chrome

**Parent:** `118-ElectronUi-Shared-Game-Chrome`. **Depends on:** `118.1`.

#### Acceptance criteria

- [x] Panel shows install status, progress, and explicit GPU vs CPU backend selection (mirrors Matrix `020.28` radios / Weaver LocalModelSection)
- [x] Callbacks only — no direct LLMEngine import from this package
- [x] Tests cover disabled states while installing and backend toggle selection

### 118.5 — First-run intro shell

**Parent:** `118-ElectronUi-Shared-Game-Chrome`. **Depends on:** `118.2`, `118.4`.

#### Acceptance criteria

- [x] Modal/shell hosts stepped first-run content via slots/props (LLM choice → install progress → dismiss)
- [x] No game-product strings required inside ElectronUi; consumers supply copy
