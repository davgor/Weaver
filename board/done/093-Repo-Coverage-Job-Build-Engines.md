# EPIC: Coverage job builds engines + Electron postinstall skip

Description: Wave 5 CI failed because the `coverage` job ran `test:coverage` without `build:engines` (contract tests need package `dist/`), and ElectronAdmin/ElectronAITTRPG `postinstall` ignored `ELECTRON_SKIP_BINARY_DOWNLOAD`, racing Chromium extract on Windows lint installs. Fix both.

## Acceptance criteria

- [x] `.github/workflows/pr-checks.yml` coverage job runs `npm run build:engines` before `npm run test:coverage`
- [x] `scripts/coverage-gate.test.mjs` asserts the build-engines step exists
- [x] Electron package postinstall respects `ELECTRON_SKIP_BINARY_DOWNLOAD=1` via `scripts/electron-postinstall.mjs`
- [x] Unit test covers the skip path
