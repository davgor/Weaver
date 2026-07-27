# 127 — ElectronAIVN oxlint play test splits

Split oversized `describe` callbacks in ElectronAIVN play-loop unit/contract tests so oxlint `max-lines-per-function` stays under 50, and drop unused imports. Production code unchanged.

## Acceptance criteria

- [x] `playService.test.ts`, `vnAssetService.test.ts`, `restorePlaySnapshot.test.ts`, and `narrationEngine.vnImage.contract.test.ts` each use one `it` per `describe` (helpers remain at file bottom)
- [x] Unused imports removed from `vnAssetService.test.ts` (`vi`, `GenerateVnBackgroundDeps`, `GenerateVnSpriteDeps`)
- [x] Named vitest files pass
- [x] Named oxlint paths report no errors for the four test files
