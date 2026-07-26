# EPIC: Board epic seed cleanup (deps, carve, MVP gaps)

Pre-implementation board hygiene from the seeded-epic review: fix false/soft dependencies that break `board:order`, harden the Depends-on parser, carve Wave 1 foundation epics into real `XXXX.M` sub-tickets, close stale package-README hygiene, and add missing MVP epics called out by `REBUILD_SPEC` (campaign persistence + spell Action lockout).

**Depends on:** none. **Feeds:** safe Wave 1+ parallel implementation.

## Acceptance criteria

- [x] `parseDependsOn` treats a Depends span that starts with `none` as no dependencies (failing unit test first); `021` no longer falsely depends on `012`
- [x] Formal deps fixed: `026` → `036`, `030` → `044`; `019` has an explicit `**Depends on:**` line; `026` Feeds no longer claims it feeds its catalog provider
- [x] Wave 1 foundations carved into backlog `XXXX.M` files: `012.1`–`012.7`, `019.1`–`019.5`, `021.*`, `032.*`; remaining `013.*` / `016.*` table rows materialized as files
- [x] New backlog epics exist for campaign SQLite/migrations (`081`); original CombatEngine spell/lockout slice was superseded by ActionEngine reshape (`085` → epics `082`–`084`)
- [x] `018` package-README criteria verified against existing `packages/*/README.md` files (content criteria checked; `act` left outstanding — Docker unavailable)
- [x] `npm run board:order` regenerated; `021` appears in Wave 1; `npm test` (129) / `lint` / `build` / `deadcode` pass for script/board changes
- [ ] `npm run ci:act` (`pr-checks.yml` + `deadcode.yml`) — **blocked**: Docker is not installed/reachable in this environment (`docker` missing). Start Docker and re-run before treating as fully CI-verified.
