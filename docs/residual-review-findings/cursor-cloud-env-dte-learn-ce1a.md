# Residual Review Findings

Source: LFG step 4 `ce-code-review mode:agent` on `docs/plans/2026-08-24-003-feat-cloud-env-dte-learn-plan.md`
Run: `/tmp/compound-engineering-1000/ce-code-review/20260824-222040-cdea0b73`
Branch: `cursor/cloud-env-dte-learn-ce1a`
PR: https://github.com/o9nn/deltecho-chat/pull/45
Tracker: no writable sink this session (`gh` is read-only; no confirmed project Linear project)

Applied in step 5: AGENTS.md + plan CLI alignment to `npx tsx` orchestrator and memory-lever invocations (`fix(review): align Cloud CLI guidance with working tsx invocations`).

## Residual Review Findings

- P2 `CHANGELOG.md:7` — Missing CHANGELOG for daemon env toggles. Defer failed: no writable tracker. Operators running the daemon entrypoint will not see `DEEP_TREE_ECHO_ENABLE_DOUBLE_MEMBRANE` / `AAR` / `SYS6` in release notes.
- P3 `AGENTS.md:11` — Stale “update script” label after the install script was named. Defer failed: no writable tracker.
- P2 `packages/orchestrator/src/bin/daemon.ts:53` — Daemon env flags lack automated tests (`buildConfig`/`envBool` not exported). Not applied: non-mechanical extract + new public test surface.
- P2 `AGENTS.md:7` — `propose-environment-json` cannot carry named terminals or port 3000. Owner: human. Dashboard Save remains a manual gate.
- P1 residual (partially applied) `packages/orchestrator/package.json:23` — `start` remains `node dist/bin/daemon.js`. AGENTS.md now demotes that path; changing the published start script was not applied (behavior/contract change).

## Settled-decision flags from implementation

- R4 / KTD2: proposed dashboard `install` is a guarded wrapper (script if present, else inline CI-order builds) because `scripts/cloud-agent-install.sh` is absent on `main`. Proceeded-and-flagged so the draft build stays promotable.
- R4 terminals/ports: MCP `propose-environment-json` accepts only `install`/`start`. Terminals live in AGENTS.md until a human adds them in the Environment panel.

## Source run context

Reviewers: correctness, project-standards, testing, agent-native.
Adversarial peer: not selected (`<50` executable lines; no auth/payments/persistence writes).
Lite roster: not used (markdown + conditional personas).
