# 005 — ElectronAITTRPG release app + `npm run ai-ttrpg`

Make `@weaver/electron-aittrpg` the shipped Electron product with the same release/auto-update pattern as AI-DND-Matrix (bump → package Win/Mac → GitHub Release with `latest.yml` → electron-updater), and boot it locally via `npm run ai-ttrpg` (ensure-dev bootstrap then electron-vite), matching Matrix's `npm run dev` ergonomics.

## Acceptance criteria

- [x] Root `npm run ai-ttrpg` runs ensure-dev then launches `@weaver/electron-aittrpg` (replaces `dev:aittrpg`)
- [x] Root `package` / `package:win` / `package:mac` and Deploy workflow package `packages/ElectronAITTRPG/release` as **AI-TTRPG**
- [x] `bump-minor-version` syncs root + `packages/ElectronAITTRPG` (+ lockfile); Deploy release title is `AI-TTRPG vX.Y.0`
- [x] Packaged app initializes electron-updater (Matrix-style check/poll + quit-and-install IPC); unit tests cover auto-update guards/scheduling
- [x] README documents `npm run ai-ttrpg` and AI-TTRPG as the released desktop app; `npm test` / `lint` / `build` / `deadcode` / `act` pass
