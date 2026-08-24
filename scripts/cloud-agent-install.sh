#!/usr/bin/env bash
# Does not start servers. Build order matches CI so workspace packages
# resolve each other's generated dist/ types.
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
