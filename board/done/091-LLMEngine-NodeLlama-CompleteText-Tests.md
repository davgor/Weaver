# EPIC: LLMEngine nodeLlamaRuntime completeText tests

Description: Align `nodeLlamaRuntime.test.ts` with the published `completeText({ prompt, context?, maxTokens? })` API after chat-style `complete({ messages })` was removed from the local runtime. Unblocks the full suite on main/Wave 5.

## Acceptance criteria

- [x] Tests call `runtime.completeText` with `prompt` / optional `context` / `maxTokens`
- [x] `npx vitest run packages/LLMEngine/src/nodeLlamaRuntime.test.ts` passes
