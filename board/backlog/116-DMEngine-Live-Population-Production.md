# EPIC: Live population production

Productionize DMEngine live population: narration-backed names/flavor, durable minting of places/NPCs/items, and play-loop invocation — replacing generic stub residents from the `054` slice.

**Why now:** `resolvePlaceProposal` mints generic human/neutral/steady residents. `105` deferred rest/live-population stubs. Population mutations must persist and survive restart per REBUILD_SPEC world consistency.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`, `054-DMEngine-World-Mutations-And-Live-Population`, `111-DMEngine-Live-Rag-And-Context-Integration`, `037-NPCEngine-Construction-And-Identity`, `016-CivilizationEngine-Settlement-Placement`.

**Out of scope:** Real-time MMO-scale simulation; procedural city growth beyond documented live-place rules.

## Sub-tickets

| Id | Summary |
|----|---------|
| `116.1` | Durable live-place / live-NPC mint records |
| `116.2` | Narration-backed naming + flavor (validated against peer facts) |
| `116.3` | Play turn invocation for population intents (visit new place, meet resident) |
| `116.4` | RAG index updates for minted population facts |

## Acceptance criteria

- [ ] Minted places/NPCs/items persist in campaign SQLite and appear in later turns after restart
- [ ] NPC construction uses NPCEngine APIs with narration-supplied display names only after validation
- [ ] Live population intents callable from production turn routing (not Admin-only)
- [ ] Generic stub resident path removed from production wiring
- [ ] Minted facts indexed for RAG (`111`) on persist
- [ ] Contract tests: propose place → mint → travel → narration sees new NPC
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 116.1 — Durable mint store

**Parent:** `116-DMEngine-Live-Population-Production`. **Depends on:** `106`.

#### Acceptance criteria

- [ ] Schema for live-place proposals and minted entity ids
- [ ] Idempotent mint (same proposal does not duplicate)

### 116.2 — Narration naming pipeline

**Parent:** `116-DMEngine-Live-Population-Production`. **Depends on:** `116.1`, `111`.

#### Acceptance criteria

- [ ] Name/flavor invented via NarrationEngine with peer validation
- [ ] Fallback deterministic name when LLM unavailable (document policy)

### 116.3 — Play invocation

**Parent:** `116-DMEngine-Live-Population-Production`. **Depends on:** `116.2`, `107`.

#### Acceptance criteria

- [ ] Turn routing branch calls live population resolver
- [ ] Civilization/NPC engines receive constructed records

### 116.4 — RAG indexing

**Parent:** `116-DMEngine-Live-Population-Production`. **Depends on:** `116.3`, `111`.

#### Acceptance criteria

- [ ] New NPC/place facts appear in retrieval hits on subsequent turns
