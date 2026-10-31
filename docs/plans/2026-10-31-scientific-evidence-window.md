# Deep Tree Echo: scientific evidence window and lifecycle repairs

## Scope and architecture

This iteration starts from `o9nn/deltecho-chat` main commit `be6d4d0e83546a65e4f360e6aa31b3ea91981068`, after PR #98 merged. Deep Tree Echo is treated as a governed DAO-like cognitive system with ESN autognosis, not as a demonstrated AGI capability. Its core-self identity ledger, grants, votes, reservoir calculations, and learned avatar calibration remain unchanged.

The main architectural weakness was not a missing simulated capability. Two real control/lifecycle paths were disconnected: DAO/ESN scoring depended on optional scientific insight presence, and asynchronous avatar loading did not preserve per-invocation ownership. A focused observe → diagnose → repair → verify cycle addresses those paths and adds qualified scientific instrumentation.

PR #99's optional Purism runtime and PR #100's programmable template compiler remain separate, open work. Neither is silently merged into this main-based iteration; the actual desktop verification uses the current main Cubism backend and existing model. Original DTE character authoring/export approval remains a separate provenance task. Cloudflare implementation stays paused; no deployment code, configuration or workflows are changed.

## Repair: DAO/ESN coherence is independent of optional scientific insights

`AutonomyLifecycleCoordinator.computeCoherence()` formerly returned base coherence before reading DAO consensus or ESN autognosis when Scientific Genius was absent or its insight buffer was empty. This made real lifecycle feedback unavailable during startup and insight-free operation.

The repair always reaches the existing weighted DAO/ESN blend and resonance check. The existing Scientific Genius adjustment is conditional on a wired engine with actual recent insights. The numeric formula and weights are preserved: no reservoir, neural readout, vote or identity computation is substituted.

Typed regressions cover unwired science, wired-but-empty science, populated scientific feedback, and absent integration's existing neutral fallback. The live DAO/ESN fixture produces `0.9082` rather than the former base-only `0.694`. These are regression-fixture values, not measurements of AGI or a deployed DAO's performance.

## Repair: asynchronous avatar resource ownership

The avatar manager previously stored shared canvas/renderer fields across awaits and used a reusable disposed flag. A subsequent initialize could reset that flag, allowing an older continuation to operate on the newer renderer and publish stale callbacks.

Each initialize now captures a generation token plus invocation-local canvas, renderer and model info. Ownership is checked after every asynchronous step; stale completions and failures clean only their own resources. Only the winning generation publishes resources or attaches native observers. This cancels stale continuations, not the network request itself.

The React wrapper also owns an effect-local manager and controller. It checks mount state after the lazy import and model load, disposes only that effect's manager, and cannot clear or publish into a newer effect's refs. Deferred-promise regressions cover stale success/failure, unmount during load, current failure cleanup, and model replacement.

## Scientific Genius feature: an empirical evidence window

The existing Scientific Embodiment Lens gains a **Scientific Evidence Window**, summarizing actual requested-versus-observed Cubism parameters at the native before-model-update boundary. It is local and read-only, with no timer, storage, service, autonomous action or model-provider dependency.

For each parameter with a genuine finite native range, the signed normalized residual is:

```text
e = (observed - requested) / (nativeMaximum - nativeMinimum)
```

A bounded window retains at most 32 sample vectors, with at most 512 input rows per sample. It reports signed mean error (bias), population standard deviation (variability), and RMS error using stable Welford accumulation. For the same window, `RMS² = bias² + variability²`.

Unknown ranges and invalid/nonfinite values are excluded, never scored as perfect zero-error evidence. Duplicate valid IDs reject the sample; changing measured IDs or native ranges resets incomparable history. Values outside a rig span are not clamped to conceal large errors. Snapshots are detached copies. Manual presentation locks, initialized core-self authority loss, disposal/reinitialization and wholly unusable samples reset the window, without resetting learned calibration.

A single observation does not establish repeatability; the UI explicitly withholds a repeat-variability interpretation until observations repeat. These statistics describe execution residuals across changing expression targets. They do **not** establish causal calibration improvement, scientific hypothesis validity, independence, a controlled experiment, or human-visible facial quality. Native Cubism parameter state is not a rasterized-pixel measurement.

## Validation status

The complete local pipeline finished successfully on 31 October 2026. Commands use `pnpm@9.15.0`.

| Gate                                      | Actual result                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                              | Passed workspace types, lint, formatting and configured release/asset gates. Lint reported 0 errors and 99 warnings.                        |
| `pnpm test`                               | 2,036 Jest tests passed across 145 passing suites and 13 package summaries; 2 tests in 2 suites were skipped. No failing test was reported. |
| Avatar and daemon product build           | Avatar TypeScript build, `build:orchestrator` and standalone daemon bundle passed.                                                          |
| `pnpm build:electron`                     | Passed; this rebuilt application was the one opened for native verification.                                                                |
| `pnpm build:browser`                      | Passed. This is a local build, not a resumed Cloudflare deployment.                                                                         |
| `CI=1 pnpm --filter=e2e-tests e2e:ci`     | 44 passed, 26 skipped, 6.9 minutes. Skips remain skips, not evidence of working optional integrations.                                      |
| Cubism/AIRI interchange contract          | 10 Python tests passed, including invalid/foreign/unsafe asset rejection.                                                                   |
| AIRI localhost broker                     | Typecheck passed; 6 Node tests passed with no skipped or failing tests.                                                                     |
| Final native-window/lifecycle regressions | 2 suites, 16 tests passed after the bounded-row addition and test formatting fixes.                                                         |
| Real isolated Electron application        | Native evidence, manual-lock reset and daemon-stop revocation assertions passed.                                                            |

The first complete check run stopped on formatting in the two lifecycle test files. Those files were formatted; the subsequent complete check/test/build/E2E run passed. Generated Electron bundles, browser test databases and Playwright reports are excluded from the source commit.

### Direct Electron evidence

Verification used the retained isolated `DC_TEST_DIR` profile and local Saved Messages, the actual existing DTE Cubism model, and a credential-free private daemon with local cognition enabled and outbound/account services disabled. The actual canvas was 347 × 762 pixels. Native readback measured 11 of 12 requested parameters; `ParamBodyAngleY` was unavailable and was excluded rather than assigned a zero error. The probe captured at least two accepted window observations; the final screenshot, taken slightly later, visibly shows four observations and the qualified bias/variability/RMS panel.

Selecting `JOY_01_BroadSmile` set the manual presentation lock and cleared the evidence window. Stopping the socket-owning daemon revoked initialized core-self projection, Scientific Genius and ESN fields and metabolic evidence, while the manual expression stayed locked. No predictive crystal was observed or fabricated. After verification the Electron process was stopped and the private socket removed; the isolated profile was preserved.

These are actual Linux Electron observations using a reported `WebKit WebGL` backend. They are not Windows hardware measurements, matched before/after performance benchmarks, pixel-fidelity verification, or proof of scientific correctness. The residuals vary with expression targets and are diagnostic leads only. The evidence window does not change DAO votes, canonical identity, neural reservoir/readout computation or learned calibration.

GitHub PR checks are a separate gate and must be reported from the new PR's actual run after push; local success does not predeclare CI success. No merge or Cloudflare implementation/deployment change is authorized by this record.

## Source and verification references

- Repository and foundation: <https://github.com/o9nn/deltecho-chat>, <https://github.com/EchoCog/deltechor>.
- Autonomy path: `packages/orchestrator/src/autonomy-lifecycle.ts` and its typed lifecycle regressions.
- Real avatar ownership: `packages/avatar/src/adapters/live2d-avatar.ts`, `packages/frontend/src/components/AICompanionHub/Live2DAvatar.tsx`.
- Evidence mathematics: `packages/avatar/src/embodiment-evidence-window.ts` and its independent qualification/statistics tests.
- UI: `ScientificEmbodimentLens.tsx` and its evidence/lock/single-sample regressions.

No private mail, outbound chat, remote registration, external model endpoint, adult presentation setting or canonical authority was changed for this verification. Windows hardware, matched before/after GPU performance, a new original character rig and naturally occurring predictive-crystal claims are outside the observed scope.
