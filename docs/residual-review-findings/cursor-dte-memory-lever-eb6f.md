# Residual Review Findings

Source: LFG `ce-code-review mode:agent` run `dte-lever-1` on `cursor/dte-memory-lever-eb6f` (local-aligned working tree, later committed as `41bbf32`).
Plan: `docs/plans/2026-08-21-001-feat-dte-memory-lever-plan.md`
PR: https://github.com/o9nn/deltecho-chat/pull/39

Tracker defer (non-interactive): `{ filed: [], failed: [], no_sink: [...] }` — `gh` is read-only in this environment; Linear was not used as a write sink.

## Applied in follow-up (`fix(review): harden memory lever apply and CLI`)

- P0 CLI unknown command could apply with `--approve`
- P0 `apply` without `--plan` blocked on stdin
- P1 merge survivors could also be prune candidates
- P1 negation tokens (`not` / `never` / `no longer`) were dropped or unused
- P1 CLI opened the store before the exclusive lock
- P1 library apply had no default in-memory restore
- P1 `reload()` cleared the in-process enabled flag
- Additional tests for tie-break, keyword reflections, unknown_id, snapshot throw, disabled mutations, invalid JSON

## Residual Review Findings

- **P1** `packages/core/src/memory/FileSystemStorage.ts:119` — `save` swallows write errors so apply can report success without restore. Pre-existing autonomy-pipeline contract; not changed because rethrow would alter every FileSystemStorage caller. [no_sink]
- **P1** `bin/dte-memory-lever.ts:205` — CLI entrypoint is still not spawned in Jest (`npx ts-node bin/dte-memory-lever.ts`). Library and `openPath` coverage expanded; process-level argv/lock tests remain. [no_sink]
- **P1** `packages/core/src/memory/FileSystemStorage.ts:117` — live RAG JSON is not written mode `0o600` (snapshots are). Changing default save mode is a storage-posture decision for all autonomy keys. [no_sink]
- **P2** Plan hash binds the plan object, not current store bytes; a reused `--plan` can overwrite newer text at the same ids. [no_sink]
- **P2** `wx` `.lock` with no stale-PID break: crash before unlink leaves apply locked until an operator deletes `.lock`. [no_sink]

Coverage note: independent cross-model adversarial peer was unavailable; local adversarial persona ran as fallback. `independence_verified: false` for that lens.
