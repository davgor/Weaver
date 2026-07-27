# 129 — Raise Vitest timeouts for Windows world/sqlite CI flakes

Coverage job failed on `packages/WeatherEngine/src/worldEngine.weather.contract.test.ts` with `Test timed out in 30000ms` (~42s wall). The sibling `weatherField.test.ts` already documents that Windows CI + better-sqlite3 world bootstrap can exceed 60s and uses a 120s timeout. Global `testTimeout` was still 30s, so world-creating tests without an explicit override keep flaking under coverage/full-suite load (same class as ticket 128).

## Acceptance criteria

- [ ] Global Vitest `testTimeout` raised to cover documented Windows world-bootstrap worst case (match `weatherField` 120s headroom)
- [ ] `worldEngine.weather.contract.test.ts` gets an explicit 120s timeout
- [ ] Weather contract + field tests pass locally
- [ ] PR coverage (and checks) green
