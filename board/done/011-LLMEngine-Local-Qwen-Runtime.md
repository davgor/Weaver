# EPIC: LLMEngine local Qwen2.5 runtime controller

Add `packages/LLMEngine` (`@weaver/llm-engine`) as the sole controller for local LLM interactions. Fixed model: **Qwen2.5 7B Instruct (Q4_K_M)**. Prefer **Vulkan GPU**, fall back to **CPU**. Expose install status/lifecycle APIs so Electron UI packages can prompt download without owning inference logic.

## Acceptance criteria

- [x] `packages/LLMEngine` exists as `@weaver/llm-engine` with the same package/scripts shape as other engines
- [x] Model catalog is fixed to Qwen2.5 7B Instruct Q4_K_M (filename + Hugging Face source URL)
- [x] Backend resolution prefers `vulkan`, falls back to `cpu` (unit-tested with a probe fake)
- [x] Install lifecycle: `getStatus` / `install` with progress events; missing model reports `not_installed` (no real multi-GB download in unit tests)
- [x] Chat/completion API goes through an injectable runtime port; refuses to complete when model is not installed
- [x] Wired into root `build:engines`, README package table / LLM boundary, and ElectronAdmin + ElectronAITTRPG engine catalogs
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` for `pr-checks.yml` + `deadcode.yml` pass
