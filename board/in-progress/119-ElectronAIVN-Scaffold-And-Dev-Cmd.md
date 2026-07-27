# EPIC: ElectronAIVN scaffold + `npm run aivn`

Stand up `packages/ElectronAIVN` (`@weaver/electron-aivn`) as the **AI Visual Novel** Electron game client. Empty product shell that depends on Weaver engines and `@weaver/electron-ui`, with root `npm run aivn` ergonomics matching `ai-ttrpg` / `admin`.

**Why now:** Product home for the Tell-a-Story → VN play workflow. Engines already exist; this package is chrome + IPC only.

**Depends on:** `118-ElectronUi-Shared-Game-Chrome`. **Feeds:** `120`–`125` AIVN feature epics.

**Out of scope:** Story generation, play loop, persistence schema, release packaging (follow-on if needed), image generation.

## Sub-tickets

| Id | Summary |
|----|---------|
| `119.1` | Package scaffold (electron-vite main/preload/renderer) |
| `119.2` | Branding + empty shell using ElectronUi chrome |
| `119.3` | Root `npm run aivn` + README / package-table wiring |
| `119.4` | Engine catalog health stub (no play logic yet) |

## Acceptance criteria

- [x] `packages/ElectronAIVN` exists as `@weaver/electron-aivn` with electron-vite main/preload/renderer layout
- [x] Product display name is `AI Visual Novel`; in-app shell uses `@weaver/electron-ui` loading/titlebar primitives
- [x] Package depends on Weaver engine workspaces + `@weaver/electron-ui` (no business rules in this package)
- [x] Root `npm run aivn` runs ensure-dev then launches the app (parity with `ai-ttrpg`)
- [x] Root README package table documents the new client vs AI TTRPG / Admin
- [ ] Unit tests cover branding constants; `npm test` / `lint` / `build` / `deadcode` pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 119.1 — Package scaffold

**Parent:** `119-ElectronAIVN-Scaffold-And-Dev-Cmd`. **Depends on:** `118`.

#### Acceptance criteria

- [x] Workspace package builds; contextIsolation + sandbox baseline matches ElectronAITTRPG
- [x] Typed preload bridge stub exists (`window.aivn` or equivalent)

### 119.2 — Branding + empty shell

**Parent:** `119-ElectronAIVN-Scaffold-And-Dev-Cmd`. **Depends on:** `119.1`, `118.2`, `118.3`.

#### Acceptance criteria

- [x] App shows branded empty home with a disabled or placeholder "Tell a story" affordance (wired in `122`)
- [x] Icons / brand mark present under `build/` (can start as placeholders documented in README)

### 119.3 — Root script + docs

**Parent:** `119-ElectronAIVN-Scaffold-And-Dev-Cmd`. **Depends on:** `119.1`.

#### Acceptance criteria

- [x] `preaivn` / `aivn` scripts in root `package.json`
- [x] README documents how to run AI Visual Novel locally

### 119.4 — Engine catalog stub

**Parent:** `119-ElectronAIVN-Scaffold-And-Dev-Cmd`. **Depends on:** `119.1`.

#### Acceptance criteria

- [x] Main process can report engine package presence/health without invoking story pipelines
- [x] Contract or unit test covers catalog shape (same pattern as ElectronAITTRPG engine catalog)
