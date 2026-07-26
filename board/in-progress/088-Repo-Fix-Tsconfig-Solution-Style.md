# EPIC: Fix solution-style tsconfig IDE errors

Root `tsconfig.json` uses `"include": []`, which surfaces TS18003 ("No inputs were found") in the IDE. Electron Admin / AI TTRPG solution `tsconfig.json` files reference node/web projects that lack `"composite": true`, which the language service flags on those configs.

## Acceptance criteria

- [x] Root `tsconfig.json` is solution-style (`files: []`, no empty `include`) and parses with zero config diagnostics
- [x] Electron Admin and AI TTRPG referenced node/web tsconfigs set `composite: true` (and do not use `noEmit` with composite)
- [x] A unit test locks the root + Electron tsconfig shape so these IDE errors cannot regress
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `npm run typecheck` pass for the touched surface (DungeonEngine WIP excluded from scope if still broken independently)
