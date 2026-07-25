# 006 — Rename ElectronEngine → ElectronAdmin

Rename `packages/ElectronEngine` (`@weaver/electron-engine`) to `packages/ElectronAdmin` (`@weaver/electron-admin`) and position it as the Weaver admin panel for reviewing app metrics, LLM metrics, exercising test functions/endpoints, and related DEV tooling. The AI-TTRPG game client remains `ElectronAITTRPG`.

## Acceptance criteria

- [x] Package lives at `packages/ElectronAdmin` with npm name `@weaver/electron-admin`; no remaining `ElectronEngine` / `electron-engine` package references in source, scripts, CI, or README
- [x] Root `npm run dev` launches `@weaver/electron-admin`; ensure-dev defaults to `packages/ElectronAdmin`
- [x] Admin UI/docs copy describes the panel’s role (app metrics, LLM metrics, test functions / endpoint exercise)
- [x] Unit tests updated for the rename; `npm test` / `lint` / `build` / `deadcode` / `act` pass
