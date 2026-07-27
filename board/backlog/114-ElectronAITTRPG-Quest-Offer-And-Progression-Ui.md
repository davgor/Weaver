# EPIC: Quest offer and progression UI

Location-gated quest offers, accept/decline UX, and validated event-driven quest progression — building on QuestEngine seeding (`097`) and DMEngine quest orchestration (`056`/`102`/`104`).

**Why now:** World quests seed at campaign gen and DMEngine can update CharacterEngine quest logs, but prior epics deferred location-gated offers, offer UX, auto-completion from free-text, and full RPG quest scripting.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`, `097-QuestEngine-World-Quest-Seeding`, `103-NPCEngine-Location-Ownership`, `056-DMEngine-Quest-Proposal-And-Tracking`.

**Soft peer (enhances later):** `112-DMEngine-Exploration-And-Destination-Validation` (dungeon-scoped offer gating).

**Out of scope:** Full visual-novel quest scripting language; replacing CharacterEngine per-PC quest log ownership.

## Sub-tickets

| Id | Summary |
|----|---------|
| `114.1` | Location-gated offer evaluation (PC + NPC locations vs quest template) |
| `114.2` | Quest offer/accept/decline IPC + play UI panel |
| `114.3` | Validated progression triggers (item acquired, NPC defeated, destination reached) |
| `114.4` | Hub/journal quest status display sync |

## Acceptance criteria

- [ ] Quest offers appear only when gating rules pass (location, faction, prior quest state)
- [ ] Player can accept or decline offers; decline is durable and does not re-offer unless policy says so
- [ ] Accepted quests progress via validated engine events — not raw LLM free-text alone
- [ ] Completion/failure updates CharacterEngine quest log and QuestEngine world quest status consistently
- [ ] Play UI shows active/completed/failed quests; hub or journal reflects same data after restart
- [ ] Contract tests cover offer → accept → progress → complete chain
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 114.1 — Location-gated offers

**Parent:** `114-ElectronAITTRPG-Quest-Offer-And-Progression-Ui`. **Depends on:** `107`, `103`.

#### Acceptance criteria

- [ ] DMEngine evaluates quest template gates against PC/NPC locations
- [ ] Unit tests for at-location vs away, wrong region, dungeon scope

### 114.2 — Offer UX

**Parent:** `114-ElectronAITTRPG-Quest-Offer-And-Progression-Ui`. **Depends on:** `114.1`.

#### Acceptance criteria

- [ ] Play view panel or inline prompt for pending offers
- [ ] Accept/decline IPC endpoints thin; logic in tested service module

### 114.3 — Progression triggers

**Parent:** `114-ElectronAITTRPG-Quest-Offer-And-Progression-Ui`. **Depends on:** `114.2`.

#### Acceptance criteria

- [ ] At least three trigger types wired (reach destination, acquire item, defeat enemy id)
- [ ] Turn persist hook evaluates triggers after validated mutations

### 114.4 — Journal/hub sync

**Parent:** `114-ElectronAITTRPG-Quest-Offer-And-Progression-Ui`. **Depends on:** `114.3`, `109`.

#### Acceptance criteria

- [ ] Character sheet / hub quest list reads CharacterEngine quest log from durable store
- [ ] No stale demo quest entries in production
