# DeltEcho → AIRI local presentation broker

This **opt-in, local-only** broker connects the already-running DeltEcho daemon's read-only `cognitive:get_state` named pipe to the [AIRI fork stage receiver](https://github.com/drzo/airi/pull/1). It opens AIRI as a popup from a loopback page, checks the selected model's actual ZIP SHA-256 at both ends, and forwards only short-lived eye/head/body presentation cues. It does not transfer chat text, write to the core-self, provision accounts, authorize AIRI, or load a custom DTE character.

## Preconditions

1. An **already-running** DeltEcho daemon, accessible via `DEEP_TREE_ECHO_IPC_PATH` or the default `\\.\pipe\deltecho-deep-tree-echo` on Windows. No daemon is started by this broker.
2. Its Entelechy visual signal must carry an initialized canonical core-self with 64-character ledger head and state digest. An `origin: entelechy` marker alone is not proof; the broker obtains it only through the existing request-ID-matched local IPC reader. This is a local-process trust boundary, **not cryptographic attestation**.
3. The AIRI fork's opt-in bridge must run on the **same machine's** explicit `http://127.0.0.1:<port>/` or `http://localhost:<port>/` stage origin. The popup supplies `dteBridge=1`, `dteModelId=miara` and `dteParentOrigin=<exact broker origin>` to activate the actual `Model.vue` receiver; the model ID is independently checked against the broker's capability-protected configuration. The public AIRI site cannot receive these cues. AIRI's account/provider onboarding and selected model import are separate steps.
4. Use the existing, validated **generic Miara** model ZIP for the pilot. It is not newly authored DTE artwork; review its usage rights before redistribution. The broker hashes actual ZIP bytes, never trusts a sender-supplied hash.

## Build and test from source

```bash
pnpm install --frozen-lockfile
pnpm --filter @deltecho/airi-broker check:types
pnpm --filter @deltecho/airi-broker test
```

The build bundles the existing DTE cognitive projector, the bounded cue adapter, and the read-only named-pipe client. `dist/broker.mjs`, `dist/client.js`, and `dist/index.html` can run with portable Node 20+ without the monorepo. CI22 makes the type and Node IPC tests a required check. A separate local Chromium smoke verifies the broker popup against the AIRI fork's real Eventa stage receiver.

## Windows pilot

Extract the private pilot archive into a dedicated directory in the Manus workspace, **not** the dirty `C:\ddd\deltecho-chat\source` checkout. Run:

```powershell
.\launch.ps1 -StageUrl 'http://127.0.0.1:5173/' -Port 8765
```

The launcher runs in the foreground and prints a one-time localhost URL with a 256-bit capability in its **fragment**. Open it privately and click **Open AIRI stage**. Import the same generic Miara ZIP in AIRI. A nonmatching AIRI model ID or archive hash never receives cues. `-ModelId miara` is the default Windows pilot label; a future reviewed generic model can pass another validated ID with `-ModelId` while keeping its archive hash as the binding. The token fragment is removed from browser history on load and is required in a header for all broker API calls. Never paste the URL into public chat, a bug report, or remote browser.

`GET /api/cue` polls the daemon only after a valid capability, exact Host/Origin, matching model digest, and stage-selected model ID. The 500 ms poll uses an expiring 2.8 s lease. The adapter allows only bounded eye/head/body axes; AIRI owns mouth, speech, motion, and expression. Model switch, hidden broker tab, popup close, daemon loss, failed proof, request error, or manual **Release and close** revokes the cue. Stop the foreground process with Ctrl+C. No always-on service or global setting is installed.

## Verification limits

The source/IPC and Chromium fixture tests establish the transport, digest and revocation semantics. A real Miara ZIP separately rendered in the fork's Pixi/Cubism runtime with a short-lived synthetic gesture. **A live DeltEcho daemon → AIRI stage pairing is not certified** until both apps run on one authorized device with the generic ZIP imported and the active core-self proof present. The broker must remain fail-closed if those preconditions are absent. Actual GPU/FPS, long-session leaks, and future artist-authored DTE appearances require separate measurements and provenance review.
