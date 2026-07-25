# 008 — Copy REBUILD_SPEC into ElectronAITTRPG

Bring the AI-DND-Matrix rebuild specification into the Weaver AI-TTRPG Electron package so agents and humans have the product contract in-tree.

## Acceptance criteria

- [x] `packages/ElectronAITTRPG/docs/REBUILD_SPEC.md` exists and matches the source `AI DND Matrix/docs/REBUILD_SPEC.md`
- [x] Local verification gates pass (`npm test`, `npm run lint`, `npm run build`, `npm run deadcode`)
- [x] `act` CI for `pr-checks.yml` and `deadcode.yml` succeeds
