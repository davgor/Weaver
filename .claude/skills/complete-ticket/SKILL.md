---
name: complete-ticket
description: Implement one ticket, a range of tickets, or a whole epic from this repo's /board ticket board, identified by an id like "001.1", "1.1", "004.7", "13.9", a bare epic id like "004", or a range like "4.1 through 4.12". Use whenever the user says to complete/do/work on/implement/finish a ticket or epic by number (including just the bare number, e.g. "do 1.1", "complete 004.7", "complete epic 4", "finish 4.1 through 4.12"), asks what's left on a ticket/epic, or asks what to work on next / says to keep carving through the backlog without naming a specific id (pick from `board/IMPLEMENTATION-ORDER.md`, not ticket numbers). Moves ticket(s) through backlog -> in-progress -> done, implements each TDD-first per this repo's engineering standards (parallelizing across sub-agents for whole-epic runs where safe), runs lint/tests/build, and checks off acceptance criteria only once actually verified.
---

# Complete a board ticket

This repo tracks work as text-file tickets under `/board` (`backlog/`, `in-progress/`, `done/`). Each ticket is a small, atomic unit of work with checkable acceptance criteria. This skill implements one ticket end-to-end the way this project requires — it does not cut corners on tests, lint, or scope.

## 1. Resolve the ticket id and find the file

- **No specific id given** ("what's next", "keep going through the backlog", "pick something to work on"): do not guess from ticket numbers — epic ids are grouped by package/theme, not dependency order, so a higher-numbered epic is often a prerequisite for a lower-numbered one. Read `board/IMPLEMENTATION-ORDER.md` (regenerate first with `npm run board:order` if it looks stale relative to `/board`) and pick the earliest not-done ticket in the earliest wave that still has undone work.
- Normalize the id the user gave you: `1.1` -> `001.1`, `4.7` -> `004.7`, a bare epic number like `3` -> `003`. Zero-pad to 3 digits before the dot.
- Search `/board/backlog/`, `/board/in-progress/`, and `/board/done/` for a file starting with `<id>-` (sub-ticket) or matching `<id>-*.md` (epic).
- If the user named a bare epic id ("complete epic 4", "do 004"), an explicit range of its sub-tickets ("4.1 through 4.12", "4.1-4.24"), or otherwise clearly means the whole epic rather than one sub-ticket, this is **epic mode** — skip to **section 8** instead of treating it as a single ticket. Epic mode still applies every rule in sections 2-7 to each sub-ticket; it only changes how the work is scheduled (in parallel across sub-agents where safe) and when the expensive whole-repo checks run (once, at the end, not per sub-ticket).
- If the ticket is already in `/board/done/`, tell the user it's already done and stop — don't redo it without being asked.
- If it's in `/board/backlog/`, move it to `/board/in-progress/` with `git mv` before starting work.
- If you can't find a matching file, say so and ask for clarification rather than guessing.

## 2. Read context before writing any code

- Read the ticket file itself (Description + Acceptance Criteria).
- Read `README.md` at the repo root — it's the canonical summary of architecture, package boundaries, and the engineering process (TDD, oxlint strictness, security baseline, etc.).
- If the ticket references another ticket (e.g. "see ticket 004.22"), read that ticket too — sub-tickets often depend on types/functions another sub-ticket defines.
- Check whether prerequisite tickets this one depends on are actually done. If a hard dependency is missing, say so and ask whether to do the dependency first instead of improvising a stand-in.

## 3. Implement TDD-first

This repo's standing rule: tests are written before the implementation that satisfies them, for everything in `packages/*Engine` and agent/IPC orchestration logic. For each acceptance criterion that names a behavior:

1. Write the failing test(s) for it first.
2. Implement the minimum code to make it pass.
3. Refactor only within the ticket's scope — don't drift into adjacent tickets' work.

**Cross-package contract tests:** if the ticket makes package A call package B's published API (or changes that boundary), add or update consumer `*.contract.test.ts` that exercise the real provider — see [delivery-standards](../delivery-standards/SKILL.md) §2. Unit mocks of B's public API do not satisfy this.

**LLM boundary:** only NarrationEngine invents prose (validated against peer data). Only DMEngine orchestrates via API calls into other engines — no invented combat/world/item facts in DMEngine.

UI-only criteria (visual layout, manual interaction flows) don't need a test-first cycle unless the criterion itself says "tested" — but still implement them carefully against the criterion's exact wording.

Respect the standing engineering rules while you work:
- TypeScript strict mode, no `any` escapes used to dodge a type problem.
- oxlint strict rules apply (complexity <= 10, function length ~50 lines, params <= 4, nesting depth 3). **Never relax, override, or disable a lint rule to make your code pass — fix the code.** If a rule seems genuinely wrong for a specific case, stop and ask the user before touching the lint config.
- Deterministic engine packages stay free of Electron or LLM-provider imports.
- Electron security baseline (contextIsolation/sandbox on, narrow typed IPC, no generic exec/SQL channel) is never weakened by a ticket's implementation.
- No telemetry, no secrets committed, `.env` stays gitignored.

## 4. Verify before checking anything off

Run the project's checks and only proceed once they're clean:
- `npm test` (or the specific test file(s) for this ticket if the full suite isn't relevant/ready yet)
- `npm run lint`
- `npm run build` if the ticket plausibly affects build output (always run it for scaffold/tooling tickets; use judgment for narrow engine tickets, but err toward running it — prefer `npm run build:engines` when packages changed)
- `npm run deadcode` (always before done — ts-prune vs `.tsprune-ignore`; if export churn drifts the baseline, unexport dead symbols or run `npm run deadcode:refresh` after confirming findings are intentional). Also exercised by `.github/workflows/deadcode.yml` on PRs.

If something fails, fix it — don't check off a criterion that doesn't actually pass, and don't mark the ticket done with failing checks.

No body of work is complete until the actual PR-checks workflow has been run and is passing — not just the equivalent local commands. Run both required workflows in one shot:

```
npm run ci:act
```

This wraps `scripts/run-act.mjs`, which resolves the `act` binary (`ACT_BIN` env override → `act` on PATH → the WinGet install path), checks Docker is up first, and runs both `.github/workflows/pr-checks.yml` and `.github/workflows/deadcode.yml` with the correct flags (`--container-architecture linux/amd64 --pull=false`, correct `-P` platform mapping per workflow).

To isolate one workflow manually instead:

```
ACT="/c/Users/davgo/AppData/Local/Microsoft/WinGet/Packages/nektos.act_Microsoft.Winget.Source_8wekyb3d8bbwe/act.exe"
"$ACT" pull_request -W .github/workflows/pr-checks.yml -P windows-latest=catthehacker/ubuntu:act-latest --container-architecture linux/amd64 --pull=false
"$ACT" pull_request -W .github/workflows/deadcode.yml -P ubuntu-latest=catthehacker/ubuntu:act-latest --container-architecture linux/amd64 --pull=false
```

- `--pull=false` uses the already-cached runner image instead of re-checking Docker Hub on every run. Without it, `act` occasionally fails every job at "Set up job" with `Error response from daemon: authentication required` — a transient Docker Hub pull/rate-limit hiccup, not a real failure. If that happens, run `docker pull catthehacker/ubuntu:act-latest` once to refresh the image, then retry `npm run ci:act`.

- Confirm the output ends with `🏁 Job succeeded` for every job in the workflow (test, lint, build, and any others added later) — a job that errors or any job reporting `🏁 Job failed` means the work is not done yet, fix it and rerun.
- `npm run ci:act` checks Docker itself and exits with a clear message if it's not reachable. If Docker is not running, **pause and ask the user to start Docker Desktop**, then retry after they confirm. Do **not** fall back to local-only commands and call the ticket done — the real workflows must be exercised via `act`, with no exceptions.

**If the ticket touches a native Node module (anything with a compiled `.node` binary) or wires new code into Electron `main`/`preload` for the first time**, passing `npm test` is not sufficient proof it works — Vitest runs under plain system Node, but the real app runs under Electron's bundled Node, which has a different ABI. Before considering such a ticket done:

1. Rebuild native deps for Electron's ABI (whatever script the package documents, e.g. `rebuild:electron`).
2. Launch the real app (`npm run admin`, `npm run ai-ttrpg`, or a packaged build) and actually exercise the new code path inside it — not just confirm the window opens.
3. `npm test` afterward to confirm the Node-ABI rebuild/test round-trip still passes.

If rebuild/`npm test` fails because Electron or `electron-vite` still holds a `.node` file, follow delivery-standards: **kill the locking repo processes yourself** (do not ask the user to close the app), then retry.

Skip this step only for tickets that add no native module and don't touch `main`/`preload` (e.g. most pure engine logic, ticket-board/docs work) — say so rather than running it pointlessly.

## 5. Check off acceptance criteria and close out the ticket

- Edit the ticket file: change `- [ ]` to `- [x]` for each criterion you've actually verified (test passes, or you've manually confirmed the behavior per the criterion's wording). Don't check off something you didn't verify.
- If every criterion is checked, `git mv` the ticket file from `/board/in-progress/` to `/board/done/`.
- If the ticket is a sub-ticket (`XXXX.M`), check whether every other `XXXX.*` sub-ticket is already in `/board/done/`. If this was the last one, also move the parent epic file `XXXX-PACKAGE_NAME-Summary.md` to `/board/done/` (the epic file's job is just to index its sub-tickets, so it's done when they all are), then invoke the `collapse-epic` skill on that epic so its sub-ticket files get folded into the epic file instead of piling up individually.
- If only some criteria could be completed (e.g. genuinely blocked on something), leave the ticket in `/board/in-progress/`, leave the unmet boxes unchecked, and clearly tell the user what's blocking it instead of force-completing.

## 6. Spin off follow-up tickets for anything out of scope

While implementing, you'll sometimes notice real work that doesn't belong in *this* ticket — a shortcut taken for now that needs hardening later, a TODO that needs its own pass, a gap the ticket's acceptance criteria didn't anticipate. Don't silently let it slide, and don't scope-creep the current ticket to cover it either.

- Write a new sub-ticket file in `/board/backlog/` following the existing format (Description + checkable Acceptance Criteria), numbered as the next `XXXX.M-Summary.md` under whichever epic it logically belongs to (bump `M` past the highest existing sub-ticket for that epic; don't renumber existing ones).
- Reference the originating ticket in the new ticket's Description so the "why" isn't lost.
- Update that epic's index file (`XXXX-PACKAGE_NAME-Summary.md`) to include the new sub-ticket in its list and range.
- Only do this for genuinely real, scoped follow-up work — not vague "consider revisiting X someday" notes. If you're not sure it's worth a ticket, mention it in your report instead of creating one.

## 7. Report back

Summarize concisely: what was implemented, which files changed, what test/lint/build output confirmed it, and which ticket(s) moved to `done`. Call out any new follow-up ticket(s) you created per step 6, by id. Do not create a git commit unless the user explicitly asks for one — staging the `git mv` of ticket files is fine, but committing is a separate, explicit step per this project's git safety rules.

## 8. Epic mode: completing a whole epic in one shot

When the user means the whole epic ("complete epic 4", "do 4.1 through 4.12", "close out epic 5"), don't run this skill N times sequentially. Treat it as one job that still gives every sub-ticket the full rigor of sections 2-6, but schedules the work efficiently:

1. **Resolve the full scope up front.** Find the epic file and every backlog/in-progress sub-ticket under it (or just the named range, if the user gave one). Read all of them plus `README.md` before assigning any work — you need the whole set in view to spot cross-ticket dependencies, same as section 2 but for every sub-ticket at once.
2. **Move everything to in-progress first**, one batch of `git mv`s, same as a single ticket would.
3. **Map dependencies before splitting work.** Note which sub-tickets' acceptance criteria need a function/type another in-scope sub-ticket defines. Anything with a real dependency on another in-scope ticket must be implemented after it, not in parallel with it. Sub-tickets that touch disjoint files and have no such dependency can run concurrently.
4. **Fan out independent sub-tickets to sub-agents.** For each parallelizable group, send one `Agent` call per sub-ticket (or a small cluster of trivially related ones) in a *single message* so they run concurrently — never split work across agents without saying so to the user. Each agent's prompt must be self-contained:
   - The full text of the ticket(s) it owns (description + acceptance criteria) and any README excerpt it needs — don't make it re-derive ruleset details from scratch.
   - The exact files it owns to create/edit, so two agents never touch the same file.
   - The standing rules from section 3 (TDD-first, oxlint limits — complexity ≤10, ~50 lines/function, ≤4 params, depth ≤3 — no `any` escapes, no lint-relaxation, deterministic-engine import boundary, LLM package boundary).
   - An instruction to self-check by running only its own new test file(s) (e.g. `npx vitest run packages/CombatEngine/src/foo.test.ts`), and explicitly **not** to run the full suite, lint, build, or `act` — those are integration steps you run once, after every agent reports back, so parallel runs don't race each other against the same working tree.
   - A request to report back what it created/changed, its test output, and anything it couldn't verify or had to deviate on.
5. **Verify each sub-agent's work before trusting it** — skim the diff for scope creep, skipped TDD, or lint-shaped problems, per this project's "trust but verify" norm. Fix small issues yourself rather than re-dispatching an agent for them.
6. **Run the whole-repo checks once, after every sub-ticket in scope is implemented**, exactly as section 4 describes: `npm test`, `npm run lint`, `npm run typecheck`, `npm run deadcode`, `npm run build` if relevant, the native-module/Electron verification from section 4 if any sub-ticket touched a native module or `main`/`preload`, and the real `act`-driven `pr-checks.yml` + `deadcode.yml` runs confirming `🏁 Job succeeded` for every job. Fix integration fallout yourself.
7. **Check off criteria and close out per section 5**, for every sub-ticket, then close the epic file once every sub-ticket under it is done, then invoke the `collapse-epic` skill on this epic so its sub-ticket files get folded into the epic file.
8. **Report back per section 7, organized by sub-ticket**, and note which ran in parallel vs. sequentially and why — if the epic's sub-tickets formed one long dependency chain with no parallelizable work, say so and explain you ran it sequentially instead of forcing sub-agents where they wouldn't help.
