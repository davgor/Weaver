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

- [ ] Campaign open/create opens a single SQLite file per campaign and runs forward-only numbered migrations
- [ ] Migration runner is unit-tested (apply, idempotent re-open, reject unknown/old-dir downgrades as specified)
- [ ] Boundary documented: which tables live in the campaign bundle vs which remain in engine-local stores (World/Regional/Civ)
- [ ] Catalog seed hook exists (even if initial seed set is minimal) so creatures/ActionEngine actions can load on migrate
- [ ] Explicit: Electron apps call DMEngine (or a thin shared persistence module owned by this epic's package boundary) — renderer never talks SQL
- [ ] Sub-tickets listed above exist as `board/backlog/081.*` files; none implemented until separately completed
