# EPIC: Live RAG and context integration

Wire DMEngine context assembly and NarrationEngine RAG retrieval into production live turns, Ask-DM, and NPC Social paths so agent calls re-ground from durable facts + capped retrieval — not chat history alone (REBUILD_SPEC §1–§2, §15 Phase J).

**Why now:** Primitives exist (`assembleAgentContext`, `tokenBudget`, `ragIndex`) but `105` explicitly left live RAG out of scope. Live play deps do not invoke context/RAG paths.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`, `062-DMEngine-Context-Efficiency-And-Rag-Integration`, `065-NarrationEngine-Rag-Retrieval`.

**Feeds:** `116-DMEngine-Live-Population-Production` (naming/flavor grounding).

## Sub-tickets

| Id | Summary |
|----|---------|
| `111.1` | Persist + index campaign facts for RAG (journal, events, NPC memories, world summary) |
| `111.2` | Settings embedder selection + lexical fallback wiring |
| `111.3` | Turn routing + Ask-DM context assembly with token budget |
| `111.4` | NPC Social streaming context includes RAG hits + isolation guards |

## Acceptance criteria

- [ ] Campaign fact indexer runs on turn persist / relevant mutations (document trigger set)
- [ ] Settings exposes embedder choice (local MiniLM + optional cloud) per REBUILD_SPEC
- [ ] Live turn routing calls `assembleAgentContext` with real peers + RAG retrieval
- [ ] Ask-DM uses the same grounding path (not a separate stub facts object)
- [ ] NPC Social path respects memory isolation — RAG hits filtered per NPC (`038`)
- [ ] Unit tests use scripted embedder/fixtures; no network in CI
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 111.1 — Durable RAG index

**Parent:** `111-DMEngine-Live-Rag-And-Context-Integration`. **Depends on:** `106`.

#### Acceptance criteria

- [ ] Index rows stored in campaign DB or documented sidecar with campaign id key
- [ ] Re-index on import/portability documented

### 111.2 — Embedder settings wiring

**Parent:** `111-DMEngine-Live-Rag-And-Context-Integration`. **Depends on:** `111.1`, `098`.

#### Acceptance criteria

- [ ] Settings runtime selects embedder; lexical fallback when local model unavailable
- [ ] Test double injectable for CI

### 111.3 — Turn + Ask-DM grounding

**Parent:** `111-DMEngine-Live-Rag-And-Context-Integration`. **Depends on:** `107`, `111.2`.

#### Acceptance criteria

- [ ] `createLiveResolveTurnDeps` passes context assembler into route/narration
- [ ] Token budget caps documented and tested

### 111.4 — Social RAG + isolation

**Parent:** `111-DMEngine-Live-Rag-And-Context-Integration`. **Depends on:** `111.3`.

#### Acceptance criteria

- [ ] Contract test: NPC A context never includes NPC B private memories
