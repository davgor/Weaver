# EPIC: ElectronAITTRPG campaign hub UI

Build the multi-character Campaign Hub: the screen you land on when reopening a campaign that already has a completed character, instead of jumping straight into play.

**Ported from:** the `campaignHub` renderer module in AI-DND-Matrix's README, `board/done/038-campaign-hub-multi-character-shared-world.md`.

**Depends on:** `058-DMEngine-Shared-Time-And-Hub-Recap`, `030-CharacterEngine-Companions-And-Inactive-Proxy`.

## Acceptance criteria

- [x] Hub shows a world preview plus a cast rail listing every player character in the campaign, with entry points to play as any of them
- [x] Session recap (from `058`) is displayed per character on hub entry
- [x] "Add another character" from the hub launches the same onboarding wizard (`070`) rather than a divergent flow
- [x] Hub, not raw play, is the landing screen whenever the campaign has ≥1 character at `complete` onboarding phase
- [x] This package's consumption of DMEngine (`058`) and CharacterEngine (`030`) is each covered by `*.contract.test.ts` here against their real published APIs
