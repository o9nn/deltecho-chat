# Residual Review Findings

Source: LFG review of `cursor/dte-orchestrate-learn-1eef` against plan `docs/plans/2026-08-24-002-feat-dte-orchestrate-learn-plan.md`.
Review run: `/tmp/ce-code-review/dte-orchestrate-learn`.
PR: https://github.com/o9nn/deltecho-chat/pull/44
Tracker: no_sink (`gh` is read-only in this environment; no project issue tracker was writable).

## Residual Review Findings

- P1 `packages/orchestrator/src/memory-lever-schedule.ts:129` — Stale tick apply can overwrite a concurrent CLI apply because dream runs before the wx lock. Conflicting later work: hold lock for the mutate path and re-dream inside it. Deferred: plan KTD9 locks apply, not the full dream; widening the critical section is a follow-up.
- P1 `packages/orchestrator/src/orchestrator.ts:443` — AutonomyPipeline `FileSystemStorage` may mkdir `DELTECHO_AUTONOMY_STORAGE_PATH` on daemon start. Pre-existing pipeline default (`createIfMissing`); this slice's tick still skips `missing_store` without creating RAG JSON.
- P1 `packages/orchestrator/src/memory-lever-schedule.ts:104` — Crash after lock create and before unlink leaves a sticky `.lock`. Plan already deferred stale-PID break.
- P1 `packages/orchestrator/src/scheduler/task-scheduler.ts` — A timed-out handler can keep running after the scheduler marks the task failed. This slice now passes an explicit timeout (`max(10m, interval)`); rewriting `executeTask` is out of scope.
- P2 `packages/orchestrator/src/orchestrator.ts:489` — No agent-readable last-tick / grant / registration surface on SYSTEM_STATUS. Manual; do not invent MCP.
- P2 `packages/orchestrator/src/memory-lever-schedule.ts:73` — Filesystem lever store stays isolated from desktop settings JSON. Advisory; plan stop condition forbids unifying stores.
- P3 `packages/orchestrator/src/memory-lever-schedule.ts:67` — Numeric `0` / negative interval env falls back to 6 hours instead of clamping to 60s. Anchor 50; R10 wording is ambiguous for zero.

## Applied in this PR

- CLI-style `*.json.bak-*` snapshots (0o600) plus restore-on-apply-failure.
- Explicit schedule timeout.
- Stronger AE3/AE4/R8/R10/handler tests.
