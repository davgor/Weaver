# EPIC: Epic filename standards (`XXXX-PACKAGE_NAME-Summary`)

Update board epic naming so parent epic files use `XXXX-PACKAGE_NAME-Summary.md` instead of `NNN-slug.md`. Keep Cursor and Claude skills plus `board/README.md` in sync, and rename existing `board/done/` epics to the new pattern.

## Acceptance criteria

- [x] `board/README.md` and delivery-standards (`.cursor` + `.claude`) document epic files as `XXXX-PACKAGE_NAME-Summary.md` (`Repo` for cross-cutting work)
- [x] `complete-ticket` and `collapse-epic` skills (both copies) match the new epic filename pattern
- [x] Existing `board/done/` epic files are renamed to `XXXX-PACKAGE_NAME-Summary.md`
- [ ] This ticket itself uses the new filename pattern; `npm test` / `lint` / `build` / `deadcode` / `act` still pass (docs/skills only)
