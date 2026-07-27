# EPIC: REBUILD_SPEC and README reconciliation

Reconcile `REBUILD_SPEC` and package READMEs with the monorepo reality after epics `001`–`105`: remove or restore missing domain SPEC references, update stale board links, and document where living contracts now live (package READMEs, tests, campaign persistence boundary).

**Why now:** REBUILD_SPEC lists many `src/**/SPEC.md` paths that do not exist in the Weaver tree. Several package READMEs still point at `board/backlog` tickets now in `done/`, which misleads future gap analysis.

**Depends on:** none (documentation-only; may run parallel to `106`).

**Feeds:** all future agents picking work from `/board`.

## Sub-tickets

| Id | Summary |
|----|---------|
| `117.1` | Audit REBUILD_SPEC vs packages/* — gap list + update plan |
| `117.2` | Update or remove missing domain SPEC references |
| `117.3` | Refresh package README board links and persistence boundaries |
| `117.4` | Add board/README pointer to Phase 2 backlog epics `106`–`116` themes |

## Acceptance criteria

- [x] REBUILD_SPEC §3 layout and SPEC links reflect actual repo paths OR explicitly defer to package READMEs with a maintained index
- [x] No package README links to non-existent backlog tickets without a "done" note
- [x] Persistence model section references `106` campaign-store work as the production path (post-`081` stubs)
- [x] `docs/terminology` and REBUILD_SPEC cross-links still valid
- [x] `npm run terminology:check` passes if spec paths change
- [x] Sub-tickets verified; no code behavior change required unless doc drift hid a real bug (file separate ticket if so)

## Sub-tickets

### 117.1 — Spec audit

**Parent:** `117-Repo-Rebuild-Spec-And-Readme-Reconciliation`. **Depends on:** none.

#### Acceptance criteria

- [x] Checklist of every REBUILD_SPEC SPEC path: exists / obsolete / replaced-by-README
- [x] Output captured in epic notes or `docs/` index file

### 117.2 — REBUILD_SPEC update

**Parent:** `117-Repo-Rebuild-Spec-And-Readme-Reconciliation`. **Depends on:** `117.1`.

#### Acceptance criteria

- [x] Broken links fixed or removed with replacement pointer
- [x] Phase J (RAG) and persistence sections note backlog epics `106`/`111`

### 117.3 — Package README refresh

**Parent:** `117-Repo-Rebuild-Spec-And-Readme-Reconciliation`. **Depends on:** `117.1`.

#### Acceptance criteria

- [x] CombatEngine, ItemEngine, EnemyEngine, DMEngine, others: backlog links → done or removed
- [x] Each engine README states campaign-store vs engine-local SQLite boundary where relevant

### 117.4 — Board index note

**Parent:** `117-Repo-Rebuild-Spec-And-Readme-Reconciliation`. **Depends on:** `117.2`.

#### Acceptance criteria

- [x] `board/README.md` or IMPLEMENTATION-ORDER intro mentions Phase 2 production-hardening theme (optional short paragraph)
