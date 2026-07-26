---
name: delivery-standards
description: >-
  Enforces TDD-first implementation, cross-package contract tests, lint/unit-test/build
  verification, and /board ticket or epic updates for all code work in Weaver. Use for
  every feature, bug fix, refactor, or follow-up unless the user explicitly
  asks for a read-only answer with no code changes.
---

# Delivery standards (all implementation work)

## Standing rules

Any work you do going forward needs to have the lint, unit test, and build confirming, everything needs to be written TDD style, and you either need to create a ticket, or update an epic if it relates.

Read `README.md` for architecture boundaries. For board tickets already in scope, also follow [complete-ticket](../complete-ticket/SKILL.md).

## 1. Board tracking (before or as you start)

Every implementation task must be traceable on `/board`:

**ALWAYS write the ticket yourself. Never ask the user** whether to create one, which id to use, or whether to skip tracking — including for tiny CI/type fixes. Pick the next free `XXXX` (highest under `board/` + 1) and name epics `XXXX-PACKAGE_NAME-Summary.md` unless the user already named an id.

| Situation | Action |
|-----------|--------|
| User named a ticket/epic id | Use [complete-ticket](../complete-ticket/SKILL.md): move to `in-progress`, check off criteria when verified |
| Work extends an existing epic | Add or update a sub-ticket under that epic (`XXXX.M`), update the epic index file, move to `in-progress` when starting |
| Standalone bug/feature/refactor | Create a new epic or sub-ticket in `/board/backlog/` (move to `in-progress` when starting) with Description + checkable Acceptance Criteria |
| Exploratory spike with no code | Ticket optional; say so in the report |

**Epic / ticket filenames:**

| Kind | Pattern | Example |
|------|---------|---------|
| Epic | `XXXX-PACKAGE_NAME-Summary.md` | `004-ElectronAITTRPG-Game-UI.md` |
| Sub-ticket | `XXXX.M-Summary.md` | `004.1-Scaffold-Package.md` |

- `XXXX` — next free id (highest under `board/` + 1, zero-padded to 3 digits)
- `PACKAGE_NAME` — `packages/` folder name, or `Repo` for monorepo / cross-cutting work
- `Summary` — short hyphenated title

**Ticket body format** (match existing files):

```markdown
# EPIC: Short title   (or # 048.1 — Sub-ticket title)

Description paragraph: what, why, dependencies.

## Acceptance criteria

- [ ] Observable behavior with verification method
- [ ] Tests / runbook step named explicitly where relevant
```

Do not check off criteria or move tickets to `done/` until section 3 passes.

## 2. TDD-first implementation

For engine packages under `packages/` (`CombatEngine`, `ActionEngine`, `WorldEngine`, `RegionalEngine`, `CivilizationEngine`, `DungeonEngine`, `WeatherEngine`, `CharacterEngine`, `ItemEngine`, `NPCEngine`, `EnemyEngine`, `NarrationEngine`, `DMEngine`, `LLMEngine`), Electron IPC/admin logic, and any logic with testable behavior:

1. **Red** — write failing test(s) for the acceptance criterion or bug repro
2. **Green** — minimum code to pass
3. **Refactor** — only within scope; no drive-by changes

**LLM boundary:** **LLMEngine** owns local model runtime/install (UI prompts download). Only **NarrationEngine** invents story prose (validated against peer engine data). Only **DMEngine** orchestrates the LLM against other engines via API calls — it must not invent combat/world/item facts itself. Deterministic packages must remain LLM-free.

UI-only criteria: test-first when the criterion says "tested" or when extracting pure logic is natural; otherwise implement to the criterion and cover with component/logic tests when cheap.

### Operational separation (glue vs. logic) — required

Every package — and every Electron process within it — keeps two layers strictly apart:

- **Operational/glue layer**: Electron `main`/`preload` bootstrap, `ipcMain`/`ipcRenderer` wiring, window creation, React containers that assemble other components. This layer only wires things together; it should have so little branching logic that it needs no unit tests of its own.
- **Logic layer**: business rules, data transforms, validation, orchestration decisions. Lives in separately importable, dependency-injected modules with their own unit tests that run without booting Electron, a database, or any real peer package.

If a criterion needs testing but the file doing it also owns Electron/React wiring, **extract the logic out first** — don't skip the test because "it's just glue," and don't leave logic tangled into the wiring because splitting it feels like overhead. oxlint's complexity/line-count limits (below) exist partly to force this split: if a function is too long because it mixes wiring and logic, separate them — never raise the limit instead.

Why this matters beyond testability: Weaver's engines are meant to outlive any single client. The plan is for the same deterministic engines (WorldEngine, CombatEngine, NPCEngine, etc.) to eventually back more than one presentation layer — the text-based AI TTRPG now, a graphical client later — which only works if game logic never assumes a particular UI, renderer, or transport.

**Worked example:** `ElectronAdmin/src/main/engineDispatch.ts` (pure `buildCatalog` / `dispatchEngineCall`, unit-tested with fake engines, no Electron boot needed) extracted from `main/index.ts` (now just wiring); `EndpointRow.tsx` extracted from `EndpointPanel.tsx` once the combined component mixed per-row input state with list layout.

### Cross-package contract tests (required)

Packages are isolated. The only supported integration surface is each package's **published public API** (`package.json` `exports` / typed entrypoints). Whenever package **A** calls package **B**'s API (engine→engine, Electron→engine, or any other workspace dependency):

1. **Establish contract tests in the consumer (A)** — TDD-first alongside the call site. Name them `*.contract.test.ts` (colocate with the caller or under `src/contracts/`).
2. **Exercise the real provider (B)** through B's published exports. Do **not** mock B's public API in contract tests; mocks belong in A's unit tests of its own logic. Prefer in-memory / temp fixtures so contracts stay fast and deterministic.
3. **Pin what A relies on**, not B's full unit surface:
   - Import path and exported symbols A uses
   - Input/output shapes and error cases A depends on
   - Observable behavior A assumes (e.g. "after ExpandWorld, FillRegions with that expansionId covers the new AABB")
4. **Update contracts when the boundary changes** — new cross-package call, changed usage, or provider public-API change that consumers use. If you change B's public API, run (and fix) every consumer's contract tests; add missing contracts before claiming done.
5. **Electron apps** that call engines from main/preload/shared code follow the same rule for each engine API they invoke.

Unit tests still own each package's internals. Contract tests own the peer boundary so isolation does not hide broken integrations.

Standing code rules (never waive):

- TypeScript strict; no `any` to dodge types
- oxlint strict (`npm run lint`) — **fix code, never relax rules** (complexity ≤10, ~50 lines/function, ≤4 params, depth ≤3)
- Deterministic engines have no Electron or LLM-provider imports
- Electron security baseline unchanged (contextIsolation, sandbox, narrow IPC)
- Operational separation: Electron/UI wiring stays thin; logic lives in tested, dependency-injected modules (see above)
- Cross-package calls have consumer `*.contract.test.ts` coverage (see above)
- Minimize diff scope; match surrounding conventions

## 3. Verification gate (required before done)

Run and fix until clean. **Do not report completion with failing checks.**

```bash
npm test
npm run lint
npm run build
npm run deadcode
```

Also run `npm run typecheck` when types/TS config changed or build errors are ambiguous. Prefer `npm run build:engines` before Electron packaging when engine packages changed.

**Deadcode (`npm run deadcode`):** compares `ts-prune` output to `.tsprune-ignore` (also CI via `.github/workflows/deadcode.yml`). After intentional export moves/deletes, prefer unexporting truly unused symbols; if the ignore baseline drifts on known intentional exports, refresh with `npm run deadcode:refresh` and keep the diff reviewable. Do not skip this gate.

**Remote CI gate (required after local gates):** a ticket is not done until the real GitHub Actions workflows (`pr-checks` + `deadcode`) have passed — not just the equivalent local commands.

- **Cloud agents / Cursor Cloud (this account's standing preference):** do **not** run `act` / `npm run ci:act`. Push a draft PR, wait until GitHub PR checks are green, then **mark the PR ready for review** (`gh pr ready`). See `.cursor/rules/act-ci-after-local-tasks.mdc`.
- **Desktop/local with Docker:** run `npm run ci:act`, which wraps both `.github/workflows/pr-checks.yml` and `.github/workflows/deadcode.yml` (see `scripts/run-act.mjs`; manual two-command form in [complete-ticket](../complete-ticket/SKILL.md)). Confirm every job ends with `🏁 Job succeeded`. If Docker is unreachable on desktop, pause and ask the user to start Docker Desktop — do not silently skip. Cloud sessions must use the PR-check path above instead of asking for Docker.

**Targeted tests during iteration** are fine (`npx vitest run path/to/foo.test.ts`), but **finish with full `npm test`** unless the user scoped a subset.

**Native modules / Electron** (any compiled `.node` binary, new `main`/`preload` wiring): see complete-ticket §4 — `npm test` alone is not enough; exercise the path in the real app after rebuilding for Electron's ABI.

**If a native-module rebuild fails** because the dev app holds the `.node` file (`EBUSY` / `EPERM`, or `NODE_MODULE_VERSION` mismatch while Electron is running): **do not ask the user to close the app.** Kill the locking processes yourself, then retry `npm test` / rebuild.

On Windows (PowerShell), stop this repo’s Electron / `electron-vite` children, e.g.:

```powershell
Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match [regex]::Escape((Get-Location).Path) -and
    ($_.Name -match 'electron|node' -or $_.CommandLine -match 'electron-vite')
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
```

Then re-run `npm test`. Mention briefly in the report that the dev app was stopped to unlock the native module. Only ask the user if kill fails after a retry (e.g. permissions) or they explicitly said not to stop a running session.

## 4. Close out

- Check off verified acceptance criteria (`- [x]`)
- `git mv` ticket to `/board/done/` when all criteria met
- Summarize: what changed, test/lint/build output, ticket ids touched
- Do **not** commit unless the user explicitly asks

## Quick checklist

Copy and track:

```
Delivery:
- [ ] Ticket/epic created or updated on /board
- [ ] Failing test(s) written first (where applicable)
- [ ] Cross-package API calls have consumer *.contract.test.ts (or N/A)
- [ ] Operational separation: logic extracted from Electron/UI wiring, unit-tested without booting Electron
- [ ] Implementation complete
- [ ] npm test — pass
- [ ] npm run lint — pass
- [ ] npm run build — pass
- [ ] npm run deadcode — pass
- [ ] Remote CI: cloud → GitHub PR checks green + PR marked ready; desktop → npm run ci:act
- [ ] Acceptance criteria checked off only when verified
```
