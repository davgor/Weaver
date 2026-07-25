# 010 — Fix electron-updater ESM import so ai-ttrpg boots

`npm run ai-ttrpg` crashes on main-process load: `import { autoUpdater } from 'electron-updater'` fails under Node ESM because `electron-updater` is CommonJS and only exposes `autoUpdater` on the default export (not as a static named export).

## Acceptance criteria

- [x] Main process loads `autoUpdater` via CJS-compatible import (default export), covered by a unit test for the interop resolver
- [x] `npm run ai-ttrpg` starts Electron without the `Named export 'autoUpdater' not found` SyntaxError
- [x] `npm test` / `lint` / `build` / `deadcode` / `act` pass
