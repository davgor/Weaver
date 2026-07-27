# 128 — Raise peerPersistence contract timeout for Windows CI

`packages/DMEngine/src/campaignGen/contracts/peerPersistence.contract.test.ts` intermittently fails on Windows CI shard 2 with `Test timed out in 30000ms` after heavy world/civ bootstrap tests in the same shard. Locally and on lighter CI runs it finishes in ~1–4s; under Windows shard load it can exceed the 30s cap.

## Acceptance criteria

- [ ] `peerPersistence.contract.test.ts` timeout raised above Windows CI worst-case observed (~35s)
- [ ] Nearby heavy DMEngine peer/campaign contract tests at the same 30s cliff get matching headroom (`peerPipeline`, `draftPersistence`)
- [ ] Named test still passes locally
- [ ] PR CI `test (2)` (or full checks) green
