# EPIC: DMEngine campaign persistence & forward migrations

Own the **one SQLite file per campaign** product persistence spine from `REBUILD_SPEC`: open/create campaign DB, forward-only numbered migrations on open, and a clear boundary between campaign-bundle tables vs per-engine stores (World/Regional/Civilization already plan their own SQLite). DMEngine coordinates campaign lifecycle; it does not invent world/combat facts.

**Ported from:** `REBUILD_SPEC` §6 Persistence model (one file per campaign, migrate-on-open, core tables / catalog seeds).

**Depends on:** none for the migration runner scaffolding; campaign table consumers land with later DM/character/NPC epics. **Feeds:** `052-DMEngine-Campaign-Generation-Pipeline`, `059-DMEngine-Campaign-Portability`, ElectronAITTRPG campaign open/create UI (`069`/`071`).

**LLM boundary:** persistence only — no prose invention, no combat/world fact invention. Migrations may seed deterministic catalogs (creatures/actions) later; LLM does not write schema.

## Sub-tickets

| Id | Summary |
|----|---------|
| `081.1` | Migration runner + campaign open/create (forward-only, idempotent re-open) |
| `081.2` | Campaign-vs-engine-store boundary doc + initial schema stub tables |
| `081.3` | Catalog seed hook on migrate (minimal seed set) |
| `081.4` | Electron/DM call-path wiring notes + unit tests for open/migrate gate |

## Acceptance criteria

- [x] Campaign open/create opens a single SQLite file per campaign and runs forward-only numbered migrations
- [x] Migration runner is unit-tested (apply, idempotent re-open, reject unknown/old-dir downgrades as specified)
- [x] Boundary documented: which tables live in the campaign bundle vs which remain in engine-local stores (World/Regional/Civ)
- [x] Catalog seed hook exists (even if initial seed set is minimal) so creatures/ActionEngine actions can load on migrate
- [x] Explicit: Electron apps call DMEngine (or a thin shared persistence module owned by this epic's package boundary) — renderer never talks SQL
- [x] Sub-tickets listed above exist as `board/backlog/081.*` files; none implemented until separately completed

## Sub-tickets

### 081.1 081.1 — Migration runner + campaign open/create

Forward-only numbered migrations on campaign SQLite open/create; idempotent re-open.

**Parent:** `081-DMEngine-Campaign-Persistence-And-Migrations`.

#### Acceptance criteria

- [x] Open/create applies pending migrations in order
- [x] Re-open of an up-to-date DB is a no-op (unit-tested)
- [x] Downgrade / unknown version policy is explicit and tested

### 081.2 081.2 — Campaign-vs-engine-store boundary + schema stubs

Document and stub which tables live in the campaign bundle vs World/Regional/Civ engine-local stores.

**Parent:** `081-DMEngine-Campaign-Persistence-And-Migrations`. **Depends on:** `081.1`.

#### Acceptance criteria

- [x] Boundary is documented in package README / epic notes
- [x] Initial campaign-bundle schema stubs migrate cleanly
- [x] No world-cell ownership duplicated into the campaign DB in this ticket

### 081.3 081.3 — Catalog seed hook on migrate

Hook so creatures/ActionEngine actions (and similar catalogs) can seed on migrate; initial seed set may be minimal.

**Parent:** `081-DMEngine-Campaign-Persistence-And-Migrations`. **Depends on:** `081.1`.

#### Acceptance criteria

- [x] Migrate path invokes a catalog seed hook
- [x] Hook is unit-tested with a minimal seed fixture
- [x] Deterministic seeds only — no LLM involvement

### 081.4 081.4 — Electron/DM call-path wiring notes + open/migrate tests

Ensure renderer never talks SQL; DMEngine (or the persistence module owned here) is the call path.

**Parent:** `081-DMEngine-Campaign-Persistence-And-Migrations`. **Depends on:** `081.2`, `081.3`.

#### Acceptance criteria

- [x] Call-path documented: Electron → DMEngine/persistence API → SQLite
- [x] Unit tests cover open/migrate gate without booting Electron
- [x] No raw SQL IPC channel introduced

