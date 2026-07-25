# 015 — Dual Electron releases (AI TTRPG + AI ADMIN)

Ship both Electron apps on every green `main` deploy: setup/portable (and Mac) artifacts for **AI TTRPG** and **AI ADMIN** in the same GitHub Release, with synced version bumps and non-colliding updater metadata.

## Acceptance criteria

- [x] Display / electron-builder `productName` is **AI TTRPG** (game) and **AI ADMIN** (admin); window titles and branding constants match
- [x] Root `package` / `package:win` / `package:mac` package both `@weaver/electron-aittrpg` and `@weaver/electron-admin`
- [x] `bump-minor-version` syncs root + both Electron package.json files (+ lockfile entries); Deploy commits both
- [x] Deploy uploads both apps’ Win/Mac release artifacts; GitHub Release title is Weaver-scoped and includes both setup products; updater channels do not overwrite (`latest` vs `ai-admin`)
- [x] Release artifact sanitize/verify handles spaced names and dual metadata; unit tests cover bump + verify + branding; `npm test` / `lint` / `build` / `deadcode` / `act` pass
- [x] README documents dual packaging / deploy
