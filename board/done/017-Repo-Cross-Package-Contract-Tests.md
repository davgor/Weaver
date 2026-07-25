# EPIC: Cross-package contract tests in delivery standards

Packages are isolated; their published APIs are the only safe integration surface. Delivery standards must require contract tests whenever one package calls another package's API, so peer-boundary breakages fail in CI instead of at runtime.

## Acceptance criteria

- [x] `.cursor/skills/delivery-standards/SKILL.md` and `.claude/skills/delivery-standards/SKILL.md` document the contract-test rule (kept in sync)
- [x] `.cursor/rules/delivery-standards.mdc` summarizes the contract-test requirement
- [x] `complete-ticket` skill mentions contract tests when work crosses package APIs
- [x] README agent section notes cross-package contract tests
- [x] Quick checklist in delivery-standards includes a contract-test item
