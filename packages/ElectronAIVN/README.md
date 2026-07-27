# ElectronAIVN (`@weaver/electron-aivn`)

**AI Visual Novel** — Electron game client for Weaver’s Tell-a-Story → visual-novel play workflow.

## Role

Product chrome and IPC only: windowing, preload bridges, React UI. Story generation, play loop, and persistence live in engine packages (`DMEngine`, `NarrationEngine`, etc.); this app calls those engines instead of implementing business logic.

## Product

| Field | Value |
|-------|--------|
| Display name | AI Visual Novel |
| App id | `com.davgor.weaver.aivn` |
| Root script | `npm run aivn` |

## Boundaries

- UI + IPC only
- Engine calls from main/shared code need consumer `*.contract.test.ts`
- Security baseline: `contextIsolation`, sandbox, narrow typed IPC (`window.aivn`)
- Shared chrome comes from `@weaver/electron-ui` (loading screen, titlebar)

## Status (today)

Empty branded shell with engine catalog health stub. “Tell a story” is a disabled placeholder until epic `122`. Local LLM first-run is epic `120`.

## Icons

`build/icon.png` / `build/icon.ico` (and the in-app brand mark under `src/renderer/src/assets/`) are **placeholders** copied from the AI TTRPG mark until dedicated AIVN artwork lands. Paths are documented in `src/shared/appIconPaths.ts`.

## Run

From repo root:

```bash
npm run aivn
```

That command bootstraps via `scripts/ensure-dev.mjs` (install / Electron binary / engines / migrate), builds `@weaver/electron-ui` if needed, then launches this app.

Package-local:

```bash
npm run dev
npm run build
```

## Layout

| Path | Purpose |
|------|---------|
| `src/main/` | Electron main, engine catalog/health |
| `src/preload/` | Narrow `window.aivn` bridge |
| `src/renderer/` | React UI (ElectronUi titlebar/loading + empty home) |
| `src/shared/` | Branding, API types, engine health helpers |
| `build/` | Icon placeholders |
