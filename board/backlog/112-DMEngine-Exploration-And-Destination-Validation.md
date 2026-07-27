# EPIC: Exploration and destination validation

Replace permissive travel/destination acceptance with a deterministic resolver over WorldEngine, RegionalEngine, CivilizationEngine, and DungeonEngine facts. Support dungeon instance entry as a travel destination.

**Why now:** `101` sets CharacterEngine location from DM travel intent but deferred pathfinding, fog-of-war, and geography validation. Live play accepts any destination id. DungeonEngine exists (`086`) but travel into instances is not wired.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`, `101-DMEngine-Travel-Set-Character-Location`, `086-DungeonEngine-Instanced-Map-Store`, `096-CharacterEngine-Location-Ownership`, `103-NPCEngine-Location-Ownership`.

**Out of scope:** Full fog-of-war rendering UI; A* pathfinding (optional sub-ticket if scoped small); arbitrary coordinate free-roam.

## Sub-tickets

| Id | Summary |
|----|---------|
| `112.1` | Destination catalog: regions, settlements, places, dungeon entrances |
| `112.2` | Travel intent validation + reject unknown destinations |
| `112.3` | Dungeon instance entry/exit travel hooks |
| `112.4` | Play UI travel affordance (list known destinations or parsed intent feedback) |

## Acceptance criteria

- [ ] DMEngine exposes a tested `resolveDestination(campaignId, destinationId)` (or equivalent) consulting peer engine APIs
- [ ] Travel intent rejects unknown ids with a clear player-facing error path
- [ ] Entering a dungeon instance updates CharacterEngine location to dungeon-scoped id
- [ ] Exiting a dungeon restores overworld location per documented policy
- [ ] Narration peers receive validated location labels for grounding
- [ ] Contract tests cover region → settlement → dungeon entrance chain
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 112.1 — Destination catalog resolver

**Parent:** `112-DMEngine-Exploration-And-Destination-Validation`. **Depends on:** `107`.

#### Acceptance criteria

- [ ] Resolver returns kind + display label + peer ids for known destinations
- [ ] Unknown id returns structured `notFound`

### 112.2 — Travel validation in turn routing

**Parent:** `112-DMEngine-Exploration-And-Destination-Validation`. **Depends on:** `112.1`, `101`.

#### Acceptance criteria

- [ ] `resolveTravelIntent` validates before `setCharacterLocation`
- [ ] Live play deps use resolver — not `() => true`

### 112.3 — Dungeon entry/exit

**Parent:** `112-DMEngine-Exploration-And-Destination-Validation`. **Depends on:** `112.2`, `086`.

#### Acceptance criteria

- [ ] Travel to dungeon entrance id transitions location into instance scope
- [ ] Exit travel intent documented and tested

### 112.4 — Play UI destination feedback

**Parent:** `112-DMEngine-Exploration-And-Destination-Validation`. **Depends on:** `112.2`.

#### Acceptance criteria

- [ ] Play view surfaces travel rejection reason (unknown destination, unreachable)
- [ ] Optional: hub/play shows current location label from resolver
