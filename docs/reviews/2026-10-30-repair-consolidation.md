# Repair PR consolidation — 30 October 2026

Baseline: merged `main` at `bf0aaafb3cc8a4ce292a31b94063f60f39a581bc`, including [PR #92](https://github.com/o9nn/deltecho-chat/pull/92). This branch extracts remaining useful changes rather than merging the older branches wholesale.

## Consolidated behavior

- **Truthful reflection and vision errors from #97.** Missing reflection configuration, all-provider failure and blank integrated reflection reject instead of returning canned reflection. Vision failure propagates; an image prefix is never sent to a text-only fallback as fabricated visual understanding. Current missing/whitespace completion validation remains. The real configured general-provider fallback after specialized parallel failure is preserved and tested.
- **Real memory graph dependencies and recovery.** The frontend directly declares `3d-force-graph`, `three` and `three-spritetext`, loads their genuine implementations, uses the real SpriteText API, and imports its recovery styles. Failure clears the spinner, exposes an accessible alert/retry, and cancels stale loads. Graph construction/animation/cleanup use the installed engine rather than a static substitute. Lockfile changes are limited to the required dependency closure.
- **Release prerequisites.** Electron, Browser, Tauri and package builds compile type dependencies, avatar and orchestrator in order. Only Browser release installation skips the unused Electron download; Electron/Tauri packaging downloads remain enabled. The manually-disabled legacy `ci.yml` also gains its missing avatar prerequisite, without being enabled or dispatched.
- **Quiet, honest version metadata.** Tagged and tagless checkouts use `git describe --tags --always`; detached checkouts are normal. Explicit version refs and reproducible timestamps remain supported. A non-Git source archive without a declared ref reports `unknown` with one useful warning, never a fabricated SHA.
- **Behavioral Sass coverage.** The same extracted Sass plugin is used by the frontend build and a real esbuild fixture. Plain SCSS becomes global CSS, module SCSS remains scoped, and invalid Sass fails. This replaces brittle source-text matching.

No neural/ESN calculations, DAO voting, canonical identity, autonomy mutation grant, provider integration architecture, Worker, Wrangler, namespace or deployment payload is changed.

## Per-PR disposition

Closure happens only after the replacement PR is open and its normal CI passes. Each closed thread receives the baseline, replacement and coverage links; source branches are preserved.

| PR                                                   | Coverage and disposition                                                                                                                                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#73](https://github.com/o9nn/deltecho-chat/pull/73) | Main already covers browser-only Electron skip, TSX CLI entrypoints and browser/install dependency order. Retire after replacement validation.                                                                             |
| [#75](https://github.com/o9nn/deltecho-chat/pull/75) | Main covers CLI/install ordering; remaining graph recovery and Browser release skip/order are consolidated here.                                                                                                           |
| [#76](https://github.com/o9nn/deltecho-chat/pull/76) | Remaining graph dependency/recovery, Browser release skip and legacy-CI avatar ordering are consolidated here.                                                                                                             |
| [#77](https://github.com/o9nn/deltecho-chat/pull/77) | Plain/global SCSS already works on main; the genuine build fixture now protects it.                                                                                                                                        |
| [#78](https://github.com/o9nn/deltecho-chat/pull/78) | Release type/renderer prerequisites and legacy-CI avatar parity are consolidated here.                                                                                                                                     |
| [#79](https://github.com/o9nn/deltecho-chat/pull/79) | Release prerequisites and Browser-only Electron skip are consolidated here.                                                                                                                                                |
| [#80](https://github.com/o9nn/deltecho-chat/pull/80) | Graph recovery/dependencies, release prerequisites, legacy-CI avatar parity and behavioral Sass coverage are consolidated here.                                                                                            |
| [#81](https://github.com/o9nn/deltecho-chat/pull/81) | Main already compiles plain and module SCSS correctly; the shared-plugin fixture protects both.                                                                                                                            |
| [#82](https://github.com/o9nn/deltecho-chat/pull/82) | SCSS functionality is present and now tested behaviorally; its implementation-text assertion is not adopted.                                                                                                               |
| [#83](https://github.com/o9nn/deltecho-chat/pull/83) | Non-Cloudflare graph/release/version/Sass residuals are consolidated. **Keep open**: its `deploy-cloudflare.yml` avatar prerequisite remains deferred while Cloudflare implementation is paused.                           |
| [#84](https://github.com/o9nn/deltecho-chat/pull/84) | Main independently covers SCSS, browser build/install ordering and stronger provider validation; no paused deployment changes are ported.                                                                                  |
| [#85](https://github.com/o9nn/deltecho-chat/pull/85) | Its remaining useful Sass regression is replaced by the real esbuild fixture, not copied as source regex.                                                                                                                  |
| [#86](https://github.com/o9nn/deltecho-chat/pull/86) | Main covers SCSS/build order; tagless version behavior and real Git fixtures are consolidated here.                                                                                                                        |
| [#87](https://github.com/o9nn/deltecho-chat/pull/87) | Graph and version repairs are consolidated. Its Cloudflare-specific gate assertion remains deferred with retained #83; this branch does not claim that assertion is implemented.                                           |
| [#88](https://github.com/o9nn/deltecho-chat/pull/88) | Main covers SCSS; quieter genuine tagged/tagless/detached version handling is consolidated here.                                                                                                                           |
| [#89](https://github.com/o9nn/deltecho-chat/pull/89) | Plain SCSS behavior is already on main and now guarded by the actual shared esbuild/Sass plugin.                                                                                                                           |
| [#96](https://github.com/o9nn/deltecho-chat/pull/96) | Main already rejects missing configuration and missing/blank completion. Do not adopt this PR's removal of legitimate configured-general-provider fallback. That live provider path remains tested here.                   |
| [#97](https://github.com/o9nn/deltecho-chat/pull/97) | Remaining reflection and vision failure paths are extracted with regression tests. Current stronger provider validation and genuine configured-provider fallback are preserved instead of replacing the service wholesale. |
| [#91](https://github.com/o9nn/deltecho-chat/pull/91) | Distinct avatar authoring work, not a duplicate repair. **Keep open; request provenance changes** as detailed in the [separate review](2026-10-30-pr91-provenance.md). No source art or rig from it is imported.           |

## Explicitly not adopted

- Setting every browser workflow's display ref to a full `github.sha` is an optional policy change, not needed for quiet tagless version gathering. Existing tag/describe/branch semantics are preserved.
- Cloudflare-specific deployment parity and the proposed Cloudflare gate assertion remain deferred under #83. No deployment workflow is dispatched by this work. Existing repository automation may still run on the replacement PR.
- No old broad lockfile, source-regex Sass assertion, canned LLM output, dummy graph, static replacement physics, or fabricated asset rights approval is copied.

## Validation contract

Required local gates: root `pnpm check`, full `pnpm test`, Browser build/E2E, rebuilt Electron/daemon targets, targeted reflection/provider/vision tests, graph lifecycle tests, real esbuild/Sass fixtures and real temporary-Git fixtures. A separate local graph-library smoke renders genuine force physics, SpriteText and scene rotation with explicitly synthetic test data. Its headless software WebGL result is not evidence of hardware performance or a full-app graph session.

Required remote gate before retirement: replacement-PR CI22 checks/types/unit tests/browser E2E. The GitHub PR head and reviewed source heads must still match. Keep failed, changed or uncovered source heads open; never delete their branches.

## Completed local evidence

The final source tree passed `pnpm check` and the frozen lockfile gate. Full workspace Jest results: **2,010 passed, 2 skipped, 0 failed**. Electron and Browser builds passed. Browser E2E: **44 passed, 26 skipped**. Cubism interchange: **10 passed**. The actual asset gate found **4 manifests and 71 non-empty resources**, totaling **41,945,889 bytes**; structural resource health is not a license or deformation approval.

Focused guards passed: graph dependency-load/initializer failure → Retry → success, real constructor/scene rotation/disposal and unmount cancellation (**4 tests**); genuine esbuild/Sass behavior (**2 tests**); release ordering/scoped download rules (**11 tests**); real tagged/tagless/detached/archive Git fixtures (**7 tests**). A separate genuine graph-library smoke reported no browser page errors, changing force-simulation node positions, scene rotation and zero canvases after disposal, using synthetic data in software WebGL.

During validation, bot heads #79, #82 and #85 moved. Their refreshed source was re-reviewed against the pinned main and this consolidation: #79 `f4a159204d44a1e18858f324c0df87f13bb6154a`, #82 `3e9f10e29acf3b59fe06389b5f2f4bf8711a2613`, #85 `b9febcd068c3d3f0a38b810092d2c775fe6906ee`. Their useful residuals remain covered; brittle source-regex tests are intentionally replaced by the actual shared-plugin fixture. Closure still requires normal replacement-PR CI and exact source-head matches at execution time.
