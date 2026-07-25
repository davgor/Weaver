# Ticket board

Work is tracked as markdown tickets under this folder — same process as AI-TTRPG.

| Column | Meaning |
|--------|---------|
| `backlog/` | Not started |
| `in-progress/` | Actively being implemented |
| `done/` | All acceptance criteria verified and checked off |

## Ticket format

```markdown
# EPIC: Short title

Description: what, why, dependencies.

## Acceptance criteria

- [ ] Observable behavior with a verification method
```

### Filenames

| Kind | Pattern | Example |
|------|---------|---------|
| Epic (parent) | `XXXX-PACKAGE_NAME-Summary.md` | `004-ElectronAITTRPG-Game-UI.md` |
| Sub-ticket | `XXXX.M-Summary.md` | `004.1-Scaffold-Package.md` |

- `XXXX` — zero-padded epic id (3 digits), e.g. `004`
- `PACKAGE_NAME` — the `packages/` folder name (`ElectronAITTRPG`, `CombatEngine`, …), or `Repo` for monorepo / cross-cutting work
- `Summary` — short hyphenated title (`Game-UI`, `Epic-Filename-Standards`)

The parent epic indexes its sub-tickets.

## Picking what to work on next

**Epic ids are grouped by package/theme, not by dependency order.** Working through `backlog/` in numeric order will eventually hand you a ticket that depends on one with a *higher* number that doesn’t exist yet — this happens 12+ times in the current backlog (e.g. `025` needs `026`; `052` needs `060` and `063`). Never assume ticket N+1 is safe just because ticket N was.

Before picking a ticket without an id already named for you, read [`IMPLEMENTATION-ORDER.md`](IMPLEMENTATION-ORDER.md) and pick from the earliest wave that still has undone work — everything in a wave has no unmet dependency on anything else still pending. Regenerate it with `npm run board:order` after adding new epics or editing any `**Depends on:**` line; it is generated output, not hand-maintained.

If a ticket’s stated dependency isn’t actually done yet (stale `IMPLEMENTATION-ORDER.md`, or a dependency someone forgot to update), stop and say so rather than improvising a stand-in for the missing piece — see `complete-ticket` §2.

## Agent workflow

- **Always** create/update a ticket for implementation work (never ask whether to skip).
- Use the `complete-ticket` skill when the user names an id.
- Use `collapse-epic` when an epic’s last sub-ticket lands in `done/`.
- Delivery standards (TDD, operational separation, cross-package contract tests, lint/test/build/deadcode, `act` CI via `npm run ci:act`) live in `.cursor/skills/delivery-standards/` and `.claude/skills/delivery-standards/` — keep both in sync.

Next free id: highest `XXXX` under `board/` + 1 (zero-padded to 3 digits).
