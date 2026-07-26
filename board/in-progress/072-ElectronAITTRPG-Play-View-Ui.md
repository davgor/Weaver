# EPIC: ElectronAITTRPG play view UI

Build the core play screen: Scene/Social columns, combat chrome, Ask-the-DM, and the small feedback touches that made turns feel alive.

**Ported from:** the `playView` renderer module in AI-DND-Matrix's README, `board/done/010-core-play-loop-ui.md`, `018-in-campaign-four-column-ui.md`, `043-play-view-ux-refresh.md`, `117-incoming-text-highlight-glow.md`, `118-animated-d20-roll-overlay.md`, `030-narrative-text-emphasis-formatting.md`.

**Depends on:** `053-DMEngine-Turn-Routing`, `063-NarrationEngine-Scene-Social-Split-And-Streaming`, `048-CombatEngine-Encounter-Lifecycle`, `057-DMEngine-Ask-The-Dm`.

## Acceptance criteria

- [ ] Scene and Social render as independently-updating columns; Social supports streamed incoming text
- [ ] Combat chrome (turn order, HP, conditions) appears when a `CombatEngine` encounter is active and disappears when it resolves
- [ ] Ask-the-DM is reachable from session chrome and visually distinct from in-fiction Social/Scene content
- [ ] Incoming-text highlight glow and an animated d20-roll overlay give visible feedback for streamed text and check resolution respectively
- [ ] Narrative text emphasis (bold/italic-equivalent formatting) renders correctly from DM-authored prose
- [ ] A single free-text input box handles both exploration and combat actions — no separate combat-only input widget
- [ ] This package's consumption of DMEngine (`053`, `057`), NarrationEngine (`063`), and CombatEngine (`048`) is each covered by `*.contract.test.ts` here against their real published APIs
