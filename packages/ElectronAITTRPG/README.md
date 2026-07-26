# ElectronAITTRPG (`@weaver/electron-aittrpg`)

**AI TTRPG** — releasable Electron game client for Weaver.

## Role

Product chrome and IPC only: windowing, preload bridges, React UI, packaging, and auto-update. Game rules and durable facts live in `*Engine` packages; this app calls those engines instead of implementing business logic.

## Product

| Field | Value |
|-------|--------|
| Display name | AI TTRPG |
| App id | `com.davgor.weaver.aittrpg` |
| Updater channel | `latest` |
| Artifacts | NSIS + portable (Win), DMG (Mac) |

Deeper rebuild notes (vision, stack, historical layout): [`docs/REBUILD_SPEC.md`](docs/REBUILD_SPEC.md). Playability smoke checklist: [`docs/runbooks/playability-smoke.md`](docs/runbooks/playability-smoke.md). Prefer live monorepo conventions in the root README when they diverge from older AI-DND-Matrix copy in that doc.

## Boundaries

- UI + IPC + packaging only
- Engine calls from main/shared code need consumer `*.contract.test.ts`
- Security baseline: `contextIsolation`, sandbox, narrow typed IPC

## Status (today)

Campaign create → onboard → hub → play → combat/death wiring is in place (Wave 10 play-path). See the playability smoke runbook for the §15 spine and automated scripted-provider coverage.

## Run & package

From repo root:

```bash
npm run ai-ttrpg          # ensure-dev bootstrap + this app
npm run package:win       # dual release includes this app
```

Package-local:

```bash
npm run dev
npm run build
npm run package:win
npm run package:mac
```

## Layout

| Path | Purpose |
|------|---------|
| `src/main/` | Electron main, auto-update, engine catalog/health |
| `src/preload/` | Narrow bridge to renderer |
| `src/renderer/` | React UI (titlebar, sidebar, startup, update banner) |
| `src/shared/` | Branding, game API types, engine health helpers |
| `build/` | Icons |
| `docs/REBUILD_SPEC.md` | Historical rebuild contract |
| `docs/runbooks/` | Playability smoke and operator checklists |

## Scripts (workspace)

Prefer root `npm test` / `npm run lint` / `npm run build` for verification. Package `typecheck` covers node + web tsconfigs.
