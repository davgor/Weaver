# EPIC: Monorepo scaffold and CI parity

Stand up Weaver as an npm-workspaces TypeScript monorepo with the eight engine packages, Electron DEV admin panel, and a CI/release pipeline mirrored from AI-TTRPG (sharded Vitest, security audit, deadcode, auto-revert, deploy-on-green).

## Acceptance criteria

- [x] `packages/` contains CombatEngine, WorldEngine, NarrationEngine, ItemEngine, NPCEngine, EnemyEngine, DMEngine, ElectronEngine with `@weaver/*` package names
- [x] Root scripts: `test`, `lint`, `typecheck`, `build` / `build:engines`, `deadcode`, `dev`, `package:win` / `package:mac`
- [x] Vitest covers each engine API surface plus CI helper scripts
- [x] GitHub Actions: `pr-checks.yml`, `deploy.yml`, `security-audit.yml`, `deadcode.yml`, `auto-revert.yml`
- [x] Electron DEV admin can list engines and call endpoints
- [x] `npm test`, `npm run lint`, `npm run typecheck`, `npm run deadcode`, and Electron build succeed locally
