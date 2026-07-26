# EPIC: Package READMEs for every workspace

Add a `README.md` under each `packages/*` folder so agents and humans can see role, boundaries, current API surface, and (where known) planned direction without relying only on the root README table.

## Acceptance criteria

- [x] Every package under `packages/` has a `README.md` (12 packages today; 13 once `CharacterEngine` is scaffolded per epic `021` — cover whatever set of `packages/*` folders actually exists when this ticket is done, not a hardcoded count)
- [x] Each README covers role, LLM/Electron boundary, and how to build/test that package
- [x] Scaffolded engines note current stub status; planned work references known epics where relevant
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` pr-checks + deadcode workflows pass — verified via local gates + `npm run ci:act` (`pr-checks.yml` + `deadcode.yml` both `🏁 Job succeeded`).
