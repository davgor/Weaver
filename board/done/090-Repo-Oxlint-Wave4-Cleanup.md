# EPIC: Oxlint max-lines cleanup (Wave 4)

Split oversized functions/tests and remove unused imports so oxlint passes without disabling rules after Wave 4 epic implementations.

## Acceptance criteria

- [x] Oversized `describe`/component/`buildEndpoints` callbacks across DMEngine, CharacterEngine, NPCEngine, LLMEngine, and ElectronAITTRPG are ≤50 lines via extracted helpers (no rule disables)
- [x] Unused `demoSheetLoadRequest` import removed from `demoSeed.ts`
- [x] `npm run lint` exits 0
- [x] Package vitest suites for touched packages pass
- [x] Cloud gate: GitHub PR checks (`pr-checks` + `deadcode`) pass; PR marked ready (replaces local `act` for cloud sessions)
