# AGENTS.md

For general project overview, architecture, and the full command list, see `CLAUDE.md` and `RUN_INSTRUCTIONS.md`. This file only adds durable, non-obvious guidance for agents.

## Cursor Cloud specific instructions

This is a pnpm monorepo (Node >=20, pnpm 9.15.0). The Cloud Agent install script is `scripts/cloud-agent-install.sh` (frozen lockfile with `ELECTRON_SKIP_BINARY_DOWNLOAD=1`, CI-order workspace builds, `@deltecho/avatar`, then `pnpm build:browser`). Browser-only GitHub workflows (`ci.yml`, `ci22.yml`, `deploy-preview.yml`, `deploy-cloudflare.yml`, `test-edit-message.yml`) set the same skip so an Electron CDN 503 cannot fail installs that never launch Electron. The team environment is dashboard-managed: do not commit `.cursor/environment.json`, which would override that dashboard. Proposed dashboard `install` is the same command list inline so a promotable `main` checkout still builds avatar + browser before this script change merges. Proposed `start` is `USE_HTTP_IN_TEST=true WEB_PORT=3000 WEB_PASSWORD=cloud-dev pnpm start:webserver` (needs the install-time browser build; do not use `NODE_ENV=test`). The `propose-environment-json` schema accepts only `install` and `start`; named `terminals` (`browser-dev`, `orchestrator`) and port 3000 live here until a human adds them in the Environment panel and Saves. Leave `DELTECHO_AUTONOMY_STORAGE_PATH`, `DELTECHO_MEMORY_LEVER_APPLY`, and `DELTECHO_AUTOGENESIS_COUPLE` unset in the baseline environment.

### Build workspace deps before type-checking

`pnpm check` / `check:types` and the app targets rely on the internal TS packages being compiled first (they resolve each other's generated `dist/` type declarations via symlinks). The required order is: `deep-tree-echo-core` -> `@deltecho/sys6-triality` -> `@deltecho/dove9` -> `@deltecho/ipc` -> `@deltecho/cognitive` -> `deep-tree-echo-orchestrator` (see `.github/workflows/ci.yml`), then `@deltecho/avatar` and `pnpm build:browser` so Melody/Live2D assets are in the browser target. The update script does this on boot; if you change one of these packages, rebuild it (`pnpm --filter=<pkg> build`) so dependents see the new types.

### Standard checks/tests (already documented, listed here for convenience)

- Lint/types/format: `pnpm check`
- Unit tests: `pnpm test` (runs each workspace package's jest suite via `scripts/run-workspace-tests.cjs`)
- E2E: `pnpm build:browser` then install Playwright once with `npx playwright install chromium` (from `packages/e2e-tests`), then `CI=true pnpm --filter=e2e-tests e2e:ci`. The e2e runner auto-starts the browser web server itself.

### Running the app in the cloud VM

The default/production target is Electron (`pnpm dev`), which needs a display server (e.g. xvfb) — heavy for headless testing. Prefer the **browser target** for manual testing:

1. After install, `USE_HTTP_IN_TEST=true WEB_PORT=3000 WEB_PASSWORD=cloud-dev pnpm start:webserver`. Use `pnpm start:browser` only when you need to rebuild, then serve.
2. Open `http://localhost:3000`, and log in with `cloud-dev` (or the `WEB_PASSWORD` you chose)

`WEB_PASSWORD=cloud-dev` is a single-tenant Cloud Agent local gate, not a secret. Do not reuse this password or HTTP mode on a shared or internet-facing deploy. Proposed dashboard port 3000 assumes owner-only or Cursor-authenticated ingress.

Non-obvious caveats for the browser target:

- `USE_HTTP_IN_TEST=true` (or `CI=true`) makes the server listen over plain **HTTP** and skips the TLS cert requirement. Without it the server expects a cert under `packages/target-browser/data/certificate/` and exits.
- Do NOT use `NODE_ENV=test` to run the app for manual testing: in that mode the server auto-authenticates and serves a **test harness page (`test.html`)**, not the real app UI (`main.html`). Use `USE_HTTP_IN_TEST=true` with a `WEB_PASSWORD` instead to get the real UI.
- Login is gated by an exact match against `WEB_PASSWORD`; if `WEB_PASSWORD` is unset there is no valid password to log in with, so always set it when running for manual testing.
- The DeltaChat "core" is not a separate service — each target auto-spawns the prebuilt `@deltachat/stdio-rpc-server` binary over stdio. Creating a chatmail account (instant onboarding / "Create New Profile") requires outbound network to a chatmail server (default `nine.testrun.org`). Account data persists under `packages/target-browser/data/accounts`.

### Known app-level quirk (not an environment problem)

In the browser build's self-chat ("Saved Messages"), Cubism renders in the dedicated right-hand avatar strip. The Live2D Failed / Retry banner is contained to that strip (`contain: layout paint`) so it cannot cover conversation bubbles.

### Deep Tree Echo operations

These commands and env vars are the agent-facing ops surface for daemon composition. Do not copy January integration task lists (`docs/INTEGRATION_TASKS.md` and siblings); those packages already exist. Current plans: `docs/plans/2026-08-21-001-feat-dte-memory-lever-plan.md`, `docs/plans/2026-08-24-001-feat-desktop-proactive-messaging-plan.md`, `docs/plans/2026-08-24-002-feat-dte-orchestrate-learn-plan.md`, `docs/plans/2026-08-24-003-feat-cloud-env-dte-learn-plan.md`, `docs/plans/2026-08-29-001-feat-dte-autognosis-autogenesis-plan.md`.

- Build with `pnpm build:orchestrator`, then start with `DEEP_TREE_ECHO_ENABLE_DOVECOT=false DEEP_TREE_ECHO_ENABLE_DOUBLE_MEMBRANE=false pnpm start:orchestrator`. The package's `start`/CLI now run the bundled `dist/bin/daemon.mjs`; raw `dist/bin/daemon.js` still fails Node ESM directory imports and is **not** the supported entrypoint. Default Dovecot Milter binds `/var/run/deep-tree-echo/milter.sock` and Double Membrane requires its optional package, so both remain disabled in a baseline local run. For an IPC-only smoke test, also set `DEEP_TREE_ECHO_ENABLE_AUTONOMY=false`, disable DeltaChat, scheduler, webhooks, Dove9, AAR, and Sys6, and use `DEEP_TREE_ECHO_IPC_PATH` within a private directory; Electron reads the same optional endpoint without starting the daemon. Webhook default is 8080 (`WebhookServer` DEFAULT_CONFIG); `DEEP_TREE_ECHO_WEBHOOK_PORT` remains comment-only.
- Proposed dashboard terminal `orchestrator`, after the workspace build, is `DEEP_TREE_ECHO_ENABLE_DOVECOT=false DEEP_TREE_ECHO_ENABLE_DOUBLE_MEMBRANE=false pnpm start:orchestrator`. Proposed `browser-dev` is `USE_HTTP_IN_TEST=true WEB_PORT=3000 WEB_PASSWORD=cloud-dev pnpm start:browser`. Those named terminals appear only after dashboard Save.
- `pnpm memory:lever` runs `npx tsx bin/dte-memory-lever.ts` (do not wrap it in `ts-node`; that fails on this ESM tree with `ERR_UNKNOWN_FILE_EXTENSION`). Dry-run against a temp fixture: `pnpm memory:lever dream --storage-path <dir>` where `<dir>` already contains live `deepTreeEchoBotMemories.json`. Omitting `--storage-path` without `DELTECHO_AUTONOMY_STORAGE_PATH` fails as `missing_store`. Record counts, reason codes, and hash only; do not copy DreamPlan JSON (`survivorText`) into AGENTS.md, CHANGELOG, walkthrough artifacts, or committed logs.
- With `enableScheduler` (default), the daemon registers `memory-lever-dream` only when `DELTECHO_AUTONOMY_STORAGE_PATH` is a non-empty path to an existing filesystem RAG store. Unset or empty path skips registration; the daemon still starts.
- `pnpm start:bot` is the standalone DeltaChat bot (`npx tsx bin/deltecho-bot.ts`). It is not the orchestrator and is not started by `start:orchestrator`.
- `DELTECHO_AUTONOMY_STORAGE_PATH` must already contain live RAG key `deepTreeEchoBotMemories` (`deepTreeEchoBotMemories.json` on disk). Vector-only directories (`vectorMemoryStore_memories`) and desktop settings JSON are a different store; the scheduled lever does not open them and skips with `no_rag_keys`.
- Scheduled ticks default to dry-run. Apply is a standing process-local grant: set `DELTECHO_MEMORY_LEVER_APPLY` to exactly `1`, `true`, or `yes` (case-insensitive) in the orchestrator process environment. Any other value, including unset, stays dry-run.
- Interval default is 6 hours. Override with `DELTECHO_MEMORY_LEVER_INTERVAL_MS`. Values below 60 seconds clamp to 60 seconds.
- Library apply writes `*.json.bak-*` snapshots that contain full pre-apply memory text. This composition does not expire those snapshots.
- Dual proactive systems: renderer `ProactiveMessaging` (desktop UI, see the August 24 desktop plan) is independent of daemon `ProactiveLoop`. Loop attach is process liveness only; it does not send DeltaChat messages and does not construct `DeltaChatAutonomyBridge`.
- Dual consolidation paths: AutonomyPipeline LLM `runConsolidation` is unchanged. MemoryLever `dream`/`apply` is scheduled RAG hygiene on the filesystem store. Do not call MemoryLever from ProactiveLoop INTEGRATE.
- Frontend RAG (`deepTreeEchoBotMemories` in desktop settings JSON) is not the filesystem store the lever opens. Export/migration is later work.
- Autognosis ↔ autogenesis couple lives on Entelechy ticks (`backgroundTick` is the live driver; `processMessage` couples if called). After a successful CoreSelf start the daemon attaches that identity mesh; if CoreSelf failed, Entelechy still starts unattached.
- Unattached identity skips both directions with `identity_unattached` (no `integrateAutognosis`, no autogenesis reservoir step).
- Couple mutations stay off unless `DELTECHO_AUTOGENESIS_COUPLE` is exactly `1`, `true`, or `yes` (case-insensitive). Unset, empty, and any other value log `couple_disabled` and no-op both directions. Leave this unset in the baseline Cloud environment.
- Adopted kinds are a closed set: `edge-of-chaos`, `regulate`, `recover-pathology`. Identity goal id and intrinsic goal content are `autogenesis:<kind>`.
- `integrateAutognosis` runs when the current report has not just been coupled and the derived kind or health rounded to one decimal differs from the last integrated report. Repeating the same report object and timestamp is a full skip (`already_coupled`); a later emission still couples even if `Date.now()` reused the millisecond.
- This couple is independent of MemoryLever dream hygiene and of desktop `ProactiveMessaging`. Do not call the coupler from ProactiveLoop INTEGRATE.

## Learned User Preferences

- Keep `AutognosisAutogenesisCoupler` as a standalone helper; do not fold it into `ESNAutognosisReservoir` or `IdentityMesh`.
- Keep the `DELTECHO_AUTOGENESIS_COUPLE` grant parser separate from the MemoryLever apply grant parser.
- Do not rewrite ESN math or AAR votes, add an LLM goal generator, or wire the autognosis-autogenesis couple into MemoryLever apply, DeltaChat send, or Live2D.
- Do not replace Entelechy ambient keep-alive with the autogenesis feedback vector; both may run on the same tick.
- Treat instant (~0s) Cloudflare Workers Builds failures with empty GitHub logs as infra noise unless the diff is missing the `DeltEchoApp` export or touches wrangler, worker, or deploy files. A real post-merge failure on `deltecho-chat-preview` with GHA logs showing Cloudflare API 10074 is not infra noise: do not rename `DeltEchoContainer` to `DeltEchoApp`.

## Learned Workspace Facts

- Cloudflare Workers Builds for `deltecho-chat-preview` uses root `wrangler.jsonc`. Bind `DeltEchoContainer` there (v1 only) and keep exporting both `DeltEchoContainer` and `DeltEchoApp` from `packages/target-browser/cloudflare/worker.ts`. A v2 rename onto `DeltEchoApp` fails Cloudflare API 10074 because App is already depended on; dropping the App export fails 10064.
- GitHub Actions `Deploy to Cloudflare Containers` uses `packages/target-browser/wrangler.jsonc`. PRs deploy `--env preview` to `deltecho-chat-preview-preview` (v1 `DeltEchoApp`). Main deploys the default config onto git-connected `deltecho-chat-preview` and must match that live `DeltEchoContainer` namespace.
- Preview URLs (`*.d-d1f.workers.dev`) are behind Cloudflare Access first (`rzo.cloudflareaccess.com`, "Log in to All Workers") — Cloudflare account OAuth or email OTP, not `cloud-dev`. After Access, Delta Chat `login.html` uses Worker secret `WEB_PASSWORD` (`wrangler secret put WEB_PASSWORD`). Local Cloud Agent login remains `USE_HTTP_IN_TEST=true WEB_PORT=3000 WEB_PASSWORD=cloud-dev`. Do not put production passwords in this file.
- Entelechy autogenesis feedback steps `esnReservoir`; CoreSelf `EchoReservoir` is a separate reservoir and must stay separate.
