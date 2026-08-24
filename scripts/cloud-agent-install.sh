#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap: lockfile install plus internal TS packages
# in CI order. Does not start servers. See AGENTS.md and
# docs/plans/2026-08-24-003-feat-cloud-env-dte-learn-plan.md.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

pnpm install --frozen-lockfile
pnpm --filter=deep-tree-echo-core build
pnpm --filter=@deltecho/sys6-triality build
pnpm --filter=@deltecho/dove9 build
pnpm --filter=@deltecho/ipc build
pnpm --filter=@deltecho/cognitive build
pnpm --filter=deep-tree-echo-orchestrator build
