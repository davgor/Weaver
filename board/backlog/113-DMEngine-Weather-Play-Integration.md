# EPIC: Weather play integration

Invoke WeatherEngine on day advance, rest, and travel; include weather facts in narration/scene grounding and document optional combat environmental hooks.

**Why now:** WeatherEngine (`094`) can sample and mutate WorldEngine overlays, but the epic notes integration with DM day/travel, narration tone, and combat modifiers as future work. Live play does not call WeatherEngine.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`, `094-WeatherEngine-Climate-And-World-Mutations`, `101-DMEngine-Travel-Set-Character-Location`, `031-CharacterEngine-Time-And-Rest`.

**Out of scope:** Full combat environmental modifier rules (optional stub hook only unless small).

## Sub-tickets

| Id | Summary |
|----|---------|
| `113.1` | Weather sampling on day advance + long rest |
| `113.2` | Weather field apply/clear on regional travel |
| `113.3` | Narration + Ask-DM context includes weather at PC location |
| `113.4` | Optional combat environmental modifier hook (document or minimal implementation) |

## Acceptance criteria

- [ ] Campaign day advance triggers weather overlay update for PC's current region (deterministic from seed + day)
- [ ] Long rest does not silently skip weather tick policy (document behavior)
- [ ] Travel into a new region applies/clears weather overlays per WeatherEngine API
- [ ] Scene/Social context includes condition + severity at PC cell/region
- [ ] Contract test: WeatherEngine → WorldEngine overlay round-trip visible in narration peer facts
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 113.1 — Day/rest weather tick

**Parent:** `113-DMEngine-Weather-Play-Integration`. **Depends on:** `107`, `094`.

#### Acceptance criteria

- [ ] DMEngine turn routing calls weather apply on day-advancing intents
- [ ] Unit tests deterministic across same seed/day

### 113.2 — Travel weather

**Parent:** `113-DMEngine-Weather-Play-Integration`. **Depends on:** `113.1`, `101`.

#### Acceptance criteria

- [ ] Travel intent updates weather for destination region
- [ ] Clear policy when leaving region documented

### 113.3 — Narration grounding

**Parent:** `113-DMEngine-Weather-Play-Integration`. **Depends on:** `113.1`.

#### Acceptance criteria

- [ ] `assembleAgentContext` (or narration peers) includes `GetWeatherAt` result
- [ ] Tone guards may reference weather keywords (no new LLM invention)

### 113.4 — Combat hook (optional)

**Parent:** `113-DMEngine-Weather-Play-Integration`. **Depends on:** `113.1`.

#### Acceptance criteria

- [ ] Document extension point for CombatEngine environmental modifiers OR implement one modifier (e.g. severe storm → ranged disadvantage flag) with test
