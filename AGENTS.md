# AGENTS.md

For general project overview, architecture, and the full command list, see `CLAUDE.md` and `RUN_INSTRUCTIONS.md`. This file only adds durable, non-obvious guidance for agents.

## Cursor Cloud specific instructions

This is a pnpm monorepo (Node >=20, pnpm 9.15.0). The startup update script already runs `pnpm install --frozen-lockfile` and builds the internal workspace TS packages, so you normally do not need to reinstall or rebuild those before working.

### Build workspace deps before type-checking

`pnpm check` / `check:types` and the app targets rely on the internal TS packages being compiled first (they resolve each other's generated `dist/` type declarations via symlinks). The required order is: `deep-tree-echo-core` -> `@deltecho/sys6-triality` -> `@deltecho/dove9` -> `@deltecho/ipc` -> `@deltecho/cognitive` -> `deep-tree-echo-orchestrator` (see `.github/workflows/ci.yml`). The update script does this on boot; if you change one of these packages, rebuild it (`pnpm --filter=<pkg> build`) so dependents see the new types.

### Standard checks/tests (already documented, listed here for convenience)

- Lint/types/format: `pnpm check`
- Unit tests: `pnpm test` (runs each workspace package's jest suite via `scripts/run-workspace-tests.cjs`)
- E2E: `pnpm build:browser` then install Playwright once with `npx playwright install chromium` (from `packages/e2e-tests`), then `CI=true pnpm --filter=e2e-tests e2e:ci`. The e2e runner auto-starts the browser web server itself.

### Running the app in the cloud VM

The default/production target is Electron (`pnpm dev`), which needs a display server (e.g. xvfb) — heavy for headless testing. Prefer the **browser target** for manual testing:

1. `pnpm build:browser`
2. `USE_HTTP_IN_TEST=true WEB_PORT=3000 WEB_PASSWORD=<pick-one> pnpm start:webserver`
3. Open `http://localhost:3000`, and log in with the `WEB_PASSWORD` you chose.

Non-obvious caveats for the browser target:

- `USE_HTTP_IN_TEST=true` (or `CI=true`) makes the server listen over plain **HTTP** and skips the TLS cert requirement. Without it the server expects a cert under `packages/target-browser/data/certificate/` and exits.
- Do NOT use `NODE_ENV=test` to run the app for manual testing: in that mode the server auto-authenticates and serves a **test harness page (`test.html`)**, not the real app UI (`main.html`). Use `USE_HTTP_IN_TEST=true` with a `WEB_PASSWORD` instead to get the real UI.
- Login is gated by an exact match against `WEB_PASSWORD`; if `WEB_PASSWORD` is unset there is no valid password to log in with, so always set it when running for manual testing.
- The DeltaChat "core" is not a separate service — each target auto-spawns the prebuilt `@deltachat/stdio-rpc-server` binary over stdio. Creating a chatmail account (instant onboarding / "Create New Profile") requires outbound network to a chatmail server (default `nine.testrun.org`). Account data persists under `packages/target-browser/data/accounts`.

### Known app-level quirk (not an environment problem)

In the browser build's self-chat ("Saved Messages"), the fork's custom Deep Tree Echo Live2D avatar overlay ("Live2D Failed / Retry") can overlap the conversation pane and prevent message bubbles from rendering in the main view, even though messages are sent, delivered, and stored correctly (visible in the chat-list preview and DB). Don't mistake this for a broken setup.

### Deep Tree Echo operations

These commands and env vars are the agent-facing ops surface for daemon composition. Do not copy January integration task lists (`docs/INTEGRATION_TASKS.md` and siblings); those packages already exist. Current plans: `docs/plans/2026-08-21-001-feat-dte-memory-lever-plan.md`, `docs/plans/2026-08-24-001-feat-desktop-proactive-messaging-plan.md`, `docs/plans/2026-08-24-002-feat-dte-orchestrate-learn-plan.md`.

- `pnpm start:orchestrator` starts the daemon. With `enableScheduler` (default), it registers `memory-lever-dream` only when `DELTECHO_AUTONOMY_STORAGE_PATH` is a non-empty path to an existing filesystem RAG store. Unset or empty path skips registration; the daemon still starts.
- `pnpm memory:lever` is the CLI for search / dry-run dream / gated apply against the same filesystem RAG store. Prefer it for one-off hygiene.
- `pnpm start:bot` is the standalone DeltaChat bot (`bin/deltecho-bot.ts`). It is not the orchestrator and is not started by `start:orchestrator`.
- `DELTECHO_AUTONOMY_STORAGE_PATH` must already contain live RAG key `deepTreeEchoBotMemories` (`deepTreeEchoBotMemories.json` on disk). Vector-only directories (`vectorMemoryStore_memories`) and desktop settings JSON are a different store; the scheduled lever does not open them and skips with `no_rag_keys`.
- Scheduled ticks default to dry-run. Apply is a standing process-local grant: set `DELTECHO_MEMORY_LEVER_APPLY` to exactly `1`, `true`, or `yes` (case-insensitive) in the orchestrator process environment. Any other value, including unset, stays dry-run.
- Interval default is 6 hours. Override with `DELTECHO_MEMORY_LEVER_INTERVAL_MS`. Values below 60 seconds clamp to 60 seconds.
- Library apply writes `*.json.bak-*` snapshots that contain full pre-apply memory text. This composition does not expire those snapshots.
- Dual proactive systems: renderer `ProactiveMessaging` (desktop UI, see the August 24 desktop plan) is independent of daemon `ProactiveLoop`. Loop attach is process liveness only; it does not send DeltaChat messages and does not construct `DeltaChatAutonomyBridge`.
- Dual consolidation paths: AutonomyPipeline LLM `runConsolidation` is unchanged. MemoryLever `dream`/`apply` is scheduled RAG hygiene on the filesystem store. Do not call MemoryLever from ProactiveLoop INTEGRATE.
- Frontend RAG (`deepTreeEchoBotMemories` in desktop settings JSON) is not the filesystem store the lever opens. Export/migration is later work.
