# EPIC: Oxlint function size cleanup

Fix the current oxlint function complexity and max-lines-per-function failures in LLMEngine, CharacterEngine, and RegionalEngine without disabling lint rules or changing runtime behavior.

## Acceptance criteria

- [x] `resolveProviderConfig` dispatch is split so oxlint complexity passes without disabling rules.
- [x] Oversized test `describe` callbacks in LLMEngine, CharacterEngine, and RegionalEngine are split into smaller groups.
- [x] `npm run lint` passes.
- [x] `npx vitest run packages/LLMEngine packages/CharacterEngine packages/RegionalEngine` passes.
