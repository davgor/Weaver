# EPIC: LLM agent skills and ticket board

Port the AI-TTRPG agent workflow into Weaver so implementation work is always ticket-tracked and gated the same way (delivery-standards, complete-ticket, collapse-epic, act CI, oxlint strictness).

## Acceptance criteria

- [x] `.cursor/rules/` includes `delivery-standards.mdc` and `act-ci-after-local-tasks.mdc` (alwaysApply)
- [x] `.cursor/skills/` and `.claude/skills/` each have `delivery-standards`, `complete-ticket`, `collapse-epic` (kept in sync; Weaver package/LLM boundaries adapted)
- [x] `.oxlintrc.json` mirrors AI-TTRPG strict limits (complexity 10, 50 lines/fn, 4 params, depth 3)
- [x] `/board` exists with `backlog/`, `in-progress/`, `done/`, and a README describing the process
- [x] README documents the board + agent skills
