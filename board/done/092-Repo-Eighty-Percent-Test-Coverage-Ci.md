# EPIC: Enforce 80% test coverage in CI

Add a Vitest coverage gate (lines/functions/branches/statements ≥ 80%) and a GitHub Actions job so PRs fail when coverage drops. Bring the suite up so the monorepo already clears the threshold.

## Acceptance criteria

- [x] Root Vitest config enables V8 coverage with 80% thresholds for lines, functions, branches, and statements
- [x] `npm run test:coverage` (or equivalent) fails when any threshold is unmet
- [x] `.github/workflows/pr-checks.yml` runs the coverage gate on PRs / main pushes
- [x] Unit tests lock the coverage script, Vitest thresholds, and CI workflow step
- [x] Current repo passes the 80% gate (add tests where needed; exclude only non-testable glue if required and document why)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [x] Cloud gate: GitHub PR checks (`pr-checks` + `deadcode`) pass and PR marked ready (replaces local `ci:act` in cloud sessions)
