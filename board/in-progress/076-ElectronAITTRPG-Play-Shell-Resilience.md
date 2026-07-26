# EPIC: ElectronAITTRPG play-shell resilience

Port the error boundary and turn-failure recovery that keeps a single bad turn from crashing the whole play shell.

**Ported from:** `board/done/136-play-shell-resilience-error-boundary.md`.

**Depends on:** `072-ElectronAITTRPG-Play-View-Ui`, `053-DMEngine-Turn-Routing`.

## Acceptance criteria

- [ ] An error boundary wraps the play view so a rendering or turn-processing exception shows a recoverable error state instead of a blank/crashed window
- [ ] A failed turn (provider timeout, malformed response, engine rejection) leaves campaign state unmutated and lets the player retry the same input
- [ ] Recovery UI clearly distinguishes "your last action didn't go through, try again" from "something is wrong with the app"
- [ ] A regression test simulates a provider failure mid-turn and asserts no partial/corrupt state is persisted
- [ ] This package's consumption of DMEngine (`053`) is covered by a `*.contract.test.ts` here against DMEngine's real published API
