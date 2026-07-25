# 007 — README AI package conventions

Document for AI agents working on this repo: packages named `Electron*` are releasable UI shells (no business logic); game/rules logic lives in the `*Engine` packages. Expand the README with naming conventions and a short role description for each package.

## Acceptance criteria

- [x] README includes an AI-oriented section stating the `Electron*` = UI-only / releasable Electron app convention and that business logic belongs in engine packages
- [x] README details the role of each current package (`CombatEngine`, `WorldEngine`, `NarrationEngine`, `ItemEngine`, `NPCEngine`, `EnemyEngine`, `DMEngine`, `ElectronAdmin`, `ElectronAITTRPG`)
- [x] Packages table / naming matches the live tree (`ElectronAdmin`, not stale `ElectronEngine`)
