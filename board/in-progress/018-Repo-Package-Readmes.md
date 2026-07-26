# EPIC: Package READMEs for every workspace

Add a `README.md` under each `packages/*` folder so agents and humans can see role, boundaries, current API surface, and (where known) planned direction without relying only on the root README table.

## Acceptance criteria

- [x] Every package under `packages/` has a `README.md` (12 packages today; 13 once `CharacterEngine` is scaffolded per epic `021` — cover whatever set of `packages/*` folders actually exists when this ticket is done, not a hardcoded count)
- [x] Each README covers role, LLM/Electron boundary, and how to build/test that package
- [x] Scaffolded engines note current stub status; planned work references known epics where relevant
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` pr-checks + deadcode workflows pass — local gates re-verified under `080`; **`act` not run**: Docker is not available in this environment (`docker` missing). Re-run `npm run ci:act` before treating as fully CI-verified.
