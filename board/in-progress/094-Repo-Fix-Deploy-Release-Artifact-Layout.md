# 094 — Fix Deploy release artifact layout (missing latest.yml)

Deploy's release job fails with `missing latest.yml` because `actions/upload-artifact@v4` uses the least common ancestor of `packages/ElectronAITTRPG/release/*` and `packages/ElectronAdmin/release/*` (`packages/`), so downloads land nested as `release/ElectronAITTRPG/release/...` instead of a flat updater channel directory. Packaging also uploads `win-unpacked` / `mac` trees (~thousands of files), which must not ship to GitHub Releases.

## Acceptance criteria

- [ ] A tested staging helper flattens shippable electron-builder outputs (installers, blockmaps, updater `*.yml`) from one or more package `release/` dirs into a single flat directory, excluding unpacked/app dirs and builder debug junk
- [ ] Staging also flattens the nested download layout (`ElectronAITTRPG/release`, `ElectronAdmin/release`) so verify can find `latest.yml` / `ai-admin.yml`
- [ ] Deploy workflow stages flat artifacts before Win/Mac upload and before sanitize/verify; GitHub Release upload uses only top-level shippable files
- [ ] Unit tests cover staging include/exclude + nested flatten; `npm test` / `lint` / `build` / `deadcode` pass; GitHub PR checks green and PR marked ready
