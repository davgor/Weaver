# EPIC: Codify operational separation + make `act` CI a real, one-command gate

Ticket `078` (parameterized engine endpoints) turned up a live example of the pattern this repo wants everywhere: `main/index.ts` and `EndpointPanel.tsx` had to be split (pure `engineDispatch.ts` extracted from Electron glue; `EndpointRow.tsx` extracted from the list container) to be testable at all. That pattern — operational/glue code kept separate from pure, dependency-injected logic — was implicit in how the code turned out, not written down as a standard. Codify it, and close the gap where `act` CI was documented as required but was a multi-line manual command nobody could run in one shot.

**Why now:** we're about to implement epics `021`–`077` (the full engine build-out) before wiring them into the AI TTRPG UI and, eventually, a graphical client reusing the same engines. That reuse plan is exactly why operational separation matters beyond testability — game logic must never assume a particular UI, renderer, or transport. Locking this in now, before the big build-out starts, is cheaper than retrofitting it across dozens of tickets later.

**Depends on:** none (process/tooling epic).

## Scope

- Add `scripts/run-act.mjs` (+ TDD unit tests) wrapping both required `act` workflows behind `npm run ci:act`: resolves the `act` binary (`ACT_BIN` override → PATH → known WinGet path), checks Docker itself first, fails fast with a clear message if Docker isn't reachable instead of a cryptic `act`/Docker error.
- Document "Operational separation (glue vs. logic)" as a required subsection of TDD-first implementation in both `.claude/skills/delivery-standards/SKILL.md` and `.cursor/skills/delivery-standards/SKILL.md` (kept byte-identical), plus a condensed version in `.cursor/rules/delivery-standards.mdc`.
- Strengthen the `act` CI requirement's wording ("required, no exceptions") in the same files, plus `.cursor/rules/act-ci-after-local-tasks.mdc`, and point all of them at `npm run ci:act` as the standard invocation (manual two-command form kept as documented fallback for isolating one workflow).
- Update `complete-ticket` (both copies) to lead with `npm run ci:act` instead of the hardcoded manual `act.exe` invocation.

## Acceptance criteria

- [x] `scripts/run-act.mjs` exports pure `resolveActBinary`, `buildActArgs`, `isDockerAvailable` with unit tests (TDD: test written and confirmed failing against the not-yet-existing module before implementation); `main()` is the only untested part (pure Electron/process glue — consistent with the operational-separation rule this ticket also documents)
- [x] `npm run ci:act` exists at the root and is confirmed to fail fast with a clear "Docker is not running" message (verified live — Docker was off in this environment) rather than an opaque `act` error
- [x] `.claude/skills/delivery-standards/SKILL.md` and `.cursor/skills/delivery-standards/SKILL.md` are byte-identical and both document: the operational-separation principle (with the `engineDispatch.ts`/`EndpointRow.tsx` worked example), the strengthened "no exceptions" act-CI requirement, and `npm run ci:act` as the standard invocation
- [x] `.cursor/rules/delivery-standards.mdc` and `.cursor/rules/act-ci-after-local-tasks.mdc` carry the condensed versions of the same two changes
- [x] `.claude/skills/complete-ticket/SKILL.md` and `.cursor/skills/complete-ticket/SKILL.md` are byte-identical and lead with `npm run ci:act`, keeping the manual `act.exe` command only as a documented fallback for isolating one workflow
- [x] `npm test` (117/117), `npm run lint`, `npm run typecheck`, `npm run build`, `npm run deadcode` all pass
- [x] `npm run ci:act` itself passes (`pr-checks.yml` + `deadcode.yml` both `🏁 Job succeeded`)
