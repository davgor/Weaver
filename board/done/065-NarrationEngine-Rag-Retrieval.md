# EPIC: NarrationEngine RAG hybrid retrieval

Port campaign-save retrieval-augmented grounding: a chunk index over campaign data with hybrid (lexical + embedding) retrieval, selecting relevant lore into prompts within a hard cap.

**Ported from:** `board/done/083-rag-db-retrieval.md` and `154-finish-rag-real-embeddings.md`.

**Depends on:** `063-NarrationEngine-Scene-Social-Split-And-Streaming`. **Feeds:** `062-DMEngine-Context-Efficiency-And-Rag-Integration` (DM calls this rather than reimplementing retrieval).

## Acceptance criteria

- [x] Campaign data (world facts, NPC memories, story threads, events) is chunked and indexed for retrieval, kept current as new facts are written
- [x] Retrieval is hybrid: lexical search always available; local embedder (e.g. MiniLM-class model) and optional cloud embedders (OpenAI/Gemini) selectable via settings
- [x] Lexical fallback is automatic when embedding assets/keys are missing — retrieval never hard-fails a turn
- [x] Selected chunks are injected within a hard cap enforced by this package, independent of whatever budget DMEngine layers on top in `062`
- [x] Embedder mode is switchable without a schema migration (index format tolerates mixed-mode entries or triggers a documented re-index)
