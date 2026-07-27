# EPIC: ElectronAIVN LLM first-run + boot

Wire AI Visual Novel’s startup so new users pick CPU or GPU local LLM, download/install via LLMEngine, and headlessly launch the runtime — same Matrix / AI TTRPG path. Returning users see the Matrix-style loading animation while the selected LLM boots, with copy **“AI Visual Novel powered by Weaver”**.

**Ported from:** AI-DND-Matrix settingsIntro local LLM wizard (`runLocalLlmFirstRunSetup`, `SettingsIntroAskBackend`, GPU/CPU radios `020.28`), headless llama.cpp lifecycle (`src/main/llamacpp/lifecycle.ts`, `020` epic family), Weaver `098` / `011` LLMEngine install + `ElectronAITTRPG` LoadingScreen / settingsIntro.

**Depends on:** `119-ElectronAIVN-Scaffold-And-Dev-Cmd`, `118-ElectronUi-Shared-Game-Chrome`, `011-LLMEngine-Local-Qwen-Runtime`, `098-ElectronAITTRPG-Local-Llm-Settings-And-Intro` (pattern reference; do not couple AIVN runtime to AITTRPG package code).

**Out of scope:** Cloud provider onboarding (local-first for V1); image-provider first-run; story play.

## Sub-tickets

| Id | Summary |
|----|---------|
| `120.1` | First-run gate: GPU vs CPU choice → install → ready |
| `120.2` | Headless local runtime launch on boot (returning user) |
| `120.3` | Branded boot loading screen (“AI Visual Novel powered by Weaver”) |
| `120.4` | Electron → LLMEngine contract tests for status/install/boot |

## Acceptance criteria

- [x] New user cannot reach “Tell a story” until local model is installed and a backend (Vulkan GPU or CPU) is selected
- [x] First-run UI uses `@weaver/electron-ui` intro + install chrome; main process calls LLMEngine `getStatus` / `install` only
- [x] Returning user boot starts selected LLM headlessly alongside the branded loading screen (Matrix-parity animation via ElectronUi)
- [x] Backend preference persists across restarts
- [x] Consumer `*.contract.test.ts` covers ElectronAIVN → LLMEngine status/install APIs
- [x] Gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 120.1 — First-run GPU/CPU + install

**Parent:** `120-ElectronAIVN-Llm-First-Run-And-Boot`. **Depends on:** `119`, `118.4`, `118.5`.

#### Acceptance criteria

- [x] Intro flow offers explicit GPU (Vulkan) vs CPU choice before/with install
- [x] Progress events surface in UI; dismiss only when status is ready
- [x] Unit tests cover gate evaluation (not installed / installing / ready)

### 120.2 — Headless runtime launch

**Parent:** `120-ElectronAIVN-Llm-First-Run-And-Boot`. **Depends on:** `120.1`.

#### Acceptance criteria

- [x] On app start for returning users, main begins LLM runtime bring-up without a blocking settings visit
- [x] Failure path shows recoverable error on loading screen (retry / open settings)

### 120.3 — Branded loading screen

**Parent:** `120-ElectronAIVN-Llm-First-Run-And-Boot`. **Depends on:** `120.2`, `118.2`.

#### Acceptance criteria

- [x] Boot UI title/stage copy includes “AI Visual Novel powered by Weaver”
- [x] Progress reflects LLM boot stages (not a fake indeterminate-only spinner)

### 120.4 — LLMEngine contract tests

**Parent:** `120-ElectronAIVN-Llm-First-Run-And-Boot`. **Depends on:** `120.1`.

#### Acceptance criteria

- [x] `*.contract.test.ts` pins `getStatus` / `install` against real `@weaver/llm-engine` exports (no live multi-GB download)
