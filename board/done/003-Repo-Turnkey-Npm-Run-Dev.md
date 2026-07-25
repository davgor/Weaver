# 003 — Turnkey `npm run dev` bootstrap

`npm run dev` should bring Weaver up fully: install deps if needed, ensure the Electron binary, build engine packages, run any migrations, then launch the Electron admin app. One command, no manual prep steps.

## Acceptance criteria

- [x] `scripts/ensure-dev.mjs` (TDD) decides when `npm install` is needed and runs install/electron/engines/migrate in order
- [x] Root `predev`/`dev` wire through ensure-dev then Electron; README documents the single-command flow
- [x] `npm test`, `npm run lint`, `npm run deadcode` pass; `act` pr-checks + deadcode succeed
