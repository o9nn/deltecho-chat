#!/usr/bin/env bash
# Does not start servers. CI-order workspace packages first, then avatar
# and the browser target so Melody/Live2D assets are ready for start:webserver.
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
pnpm --filter=@deltecho/avatar build
pnpm build:browser
