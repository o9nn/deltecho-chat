# Native motion and numerical autognosis — 14 November 2026

## Scope and review base

This is an incremental, review-only evolution of `o9nn/deltecho-chat`, based on open, unmerged PR #102 at `e182bc52df3e97d0f584ba8d7e66028bb6ca92ff`. It does not imply that PR #101 or #102 is merged into main. The November branch is `manus/scientific-motion-autognosis-nov14`; no earlier PR is merged by this cycle.

Deep Tree Echo retains its DAO-like governance, actual ESN dynamics, online RLS learner and canonical core-self authority. These are architectural components, not a demonstrated AGI classification. This work does not replace neural computation with a deterministic gesture engine, manufacture successful experiments, grant capabilities or accept identity changes.

Cloudflare implementation remains paused. No deployment workflow is changed or dispatched. Purism PR #99/#100, independent desktop-widget artifacts and rights-gated character authoring PR #91 are outside this branch.

## Confirmed weaknesses and repairs

### Numeric evidence at the real learning boundary

The previous learner validated dimensions but admitted non-finite reservoir values, target values and reward. A dimension-correct `Float64Array.of(NaN)` could corrupt its actual weight, covariance and momentum arrays, count the update as successful and contaminate error telemetry used alongside scientific signals in ENACTION. The existing live-readout adapter rejected poisoned weights, preserving active readout; that did not restore the learner itself.

An explicitly configured persistence path could serialize non-finite values to JSON `null`. Raw restore coerced these to zero before returning failure, mutating the learner despite a failed restore. This was reproduced through the public configured capability, not claimed as default boot behavior: persistence is disabled by default and orchestrator startup did not invoke restore.

Repair admission and checkpoint boundaries in place. Invalid data must be rejected before state mutation; failed import/restore must leave the current learner unchanged. Accepted finite RLS computation, forgetting, learning-rate and momentum behavior remain genuine. Validation is not consent, peer quorum or scientific truth. No guessed freshness threshold is introduced for legitimate saved reservoir-state observations.

### One clock for real Cubism motion and layout

Normal model updates already honor the explicit private application ticker. There is no verified shared-ticker bypass in that path. The defect was separate: layout priming invoked `internalModel.update(16, performance.now())`, whereas ordinary rendering uses the model's accumulated delta and elapsed-time clock. Initial and queued layout work could therefore advance real physics/motion outside the normal render owner and mix clock domains.

Keep the real native automator, motion, expression and physics evaluation. Remove layout-side native stepping and measure bounds after an ordinary render, with model-generation ownership checks. Apply visibility policy before starting the private ticker. Do not modify Pixi's global shared ticker or install a surrogate animation model. The software-only frame cap and explicit resolution preferences remain unchanged.

## Scientific Genius addition: native callback cadence probe

The existing collapsed scientific embodiment lens gains a separate **Native Cubism callback cadence** instrument. It is fed exclusively by actual `beforeModelUpdate` callbacks, after physics and before the mesh update. Its 120-interval bounded window reports mean/minimum/maximum callback intervals and historical callback count. Snapshot reads do not create events. Visibility transitions clear the interval window so minimized gaps do not become active-cadence samples; disposal clears the model lifetime.

The instrument is local, read-only and has no acquisition timer. It uses the lens's existing opt-in refresh. It does not change target-pair sampling, calibrated parameters, RLS, reservoir dynamics, DAO votes, experiment scheduling, capability grants or canonical identity. Historical callback count may continue under manual presentation or absent daemon authority; it describes runtime operation, not accepted cognitive evidence. The UI retains its manual-expression suppression of scientific target-pair observations.

Missing, invalid or reversed monotonic time yields unavailable timing, not fabricated zero error or a nominal performance score. Native callbacks are **not display FPS, render latency, motion settling time, parameter accuracy or scientific truth**. The separate latest target-write/readback clock keeps its original meaning.

## KSM center-strengthening analysis

Use the 61-definition grammar as a diagnosis map, not a numerical consciousness score:

| Coordinate                       | Concrete weakness                                                        | Structure-preserving transformation                                       | Required evidence                                                            |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Local Control Distinction — 35   | Non-finite feedback was admitted as a successful learned update          | Distinguish admissible numeric evidence from rejection before mutation    | Real RLS parity and rejection/no-mutation tests                              |
| Local Control Closure — 39       | A failed checkpoint restore could alter the current learner              | Validate the full candidate before atomic installation                    | Failed restore leaves weights, covariance, momentum and statistics unchanged |
| Local Process Conjunction — 30   | Layout and animation advanced Cubism on mixed clocks                     | Keep layout downstream of the native render owner                         | Forwarded real update arguments remain in the model elapsed domain           |
| Local Process Closure — 32       | Initial hidden-state policy was not applied before ticker startup        | Bind model motion, render and layout work to private visibility lifecycle | Initial-hidden fixtures and actual OS minimize/restore                       |
| Global Temporal Distinction — 49 | No independent instrument distinguished callback cadence from target age | Add a bounded descriptive native-only window                              | Actual callback acquisition; invalid-clock abstention; no inferred FPS       |

The operational cycle is: observe the existing whole; locate these weak centers; preserve actual ESN/DAO/Cubism implementations; define the smallest boundaries; repair numeric admission; repair checkpoint closure; unify native layout timing; add a read-only instrument; verify equations and lifecycle; run the real application; run complete repository/CI validation; publish a review branch without merging. No unsupported “life”, autonomy-level or coherence-improvement score is assigned.

## Foundation and AIRI reuse

The reviewed foundation remains `EchoCog/deltechor` at `d3e7cb536390699b1a8e874c1044c2807da68c69`. The user forks `drzo/airi` (`63b9755416d9b1de5998e66adb195514fb8e79ed`) and `o9nn/moeru-ai` (`da49e97174253649ecaf74ad5ed2196b2a131c84`) are unchanged. Upstream AIRI reached `91eb562e3edfc624d1150985cdc6ffe7617e8ab7`; complete tree comparison found no changed paths under `packages/stage-ui-live2d/` since the prior pinned review.

Reuse existing implementations rather than migrate wholesale: AIRI's abandoned-load and resource teardown patterns; DTE's explicit ticker and native parameter boundary; the actual RLS/readout adapter and precommit guards. Keep fork-specific receiver/mouth ownership. Future scoped work can repair the fork's missing post-await model ownership check and evaluate admitted task-grounded learning targets. Reward-derived output nudges, prompt/trait scaffolds and foundation health proxies are not trained neural inference or scientific validation.

## Validation record

Baseline full repository check passed at the previous PR head. All final local commands completed with exit code 0:

| Verification                                                                  | Result                                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Real learner, readout, feedback, checkpoint and scientific-join focused tests | 5 suites / 135 tests passed                                                |
| Native renderer lifecycle/API-ordering regressions                            | 1 suite / 45 tests passed                                                  |
| Cadence/manager/observation-window focused regressions                        | 4 suites / 47 tests passed                                                 |
| Scientific lens and React lifecycle regressions                               | 2 suites / 13 tests passed                                                 |
| Core, standalone orchestrator and Electron builds                             | Passed                                                                     |
| Full repository type/lint/format/coexistence checks                           | Passed; existing interchange checks include 10 passing Python tests        |
| Complete workspace Jest run                                                   | 152 suites passed, 2 skipped; 2,222 tests passed, 2 skipped; zero failures |
| Browser build                                                                 | Passed                                                                     |
| Existing CI browser E2E                                                       | 44 passed, 26 deliberately skipped; zero failures                          |
| Independent final boundary review                                             | No blocking defect found in inspected boundaries                           |

The actual current-source Electron application rendered the existing native Cubism avatar in a 347 × 762 canvas using SwiftShader. Its private ticker matched the genuine model automator; the existing software maxFPS configuration remained 30, not a claim that 30 display frames per second were achieved. A forwarded native update probe captured 51 genuine updates with arguments equal to the model's own elapsed/delta domain and one update per captured ticker dispatch. Actual native vertices changed. The opted-in lens displayed a populated 120-interval window. UI reload retained one staged model, and manual expression ownership and daemon-authority revocation passed. All outbound/account integrations were disabled in the private daemon; no chats were sent or remote account registration accepted.

The first Playwright-attached minimize attempt reported the document visible despite native Electron and OS minimized state; it is not counted as success. A fresh raw-protocol-only run, without page lifecycle emulation or changes to application preferences, observed real `document.visibilityState === "hidden"`, an iconic OS window, stopped private ticker and an unchanged callback count of 4 and model elapsed time of 456.897857098386 ms throughout the settled 1.4-second hidden interval. Restoration returned visible state, restarted the ticker and advanced the callback count to 8 with a new three-interval cadence window. This is a direct cloud X11 minimize/restore observation, not a synthetic visibility event, a zero-CPU measurement or Windows validation.

No screenshot or static test result is offered as Windows/hardware performance evidence. Character art, source/export rights and native rig assets were not changed; the existing DTE-styled rig is not a newly rights-approved original DTE model. Numeric-safe checkpoint admission is not crash/IO-atomic file replacement or a covariance PSD proof. Valid restore retains arrays and stored error summary, but does not reconstruct exact original moving-error history. Verification processes were stopped and the independent persistent local profile retained. Exact-head GitHub CI is checked after the authorized push; no merge or deployment is performed by this cycle.

## References

- [Review dependency PR #102](https://github.com/o9nn/deltecho-chat/pull/102)
- [Pinned deltechor foundation](https://github.com/EchoCog/deltechor/commit/d3e7cb536390699b1a8e874c1044c2807da68c69)
- [Pinned AIRI native model lifecycle](https://github.com/moeru-ai/airi/blob/91eb562e3edfc624d1150985cdc6ffe7617e8ab7/packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue)
- [User AIRI receiver](https://github.com/drzo/airi/blob/63b9755416d9b1de5998e66adb195514fb8e79ed/packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue)
- [Actual learner at the review base](https://github.com/o9nn/deltecho-chat/blob/e182bc52df3e97d0f584ba8d7e66028bb6ca92ff/packages/core/src/core-self/OnlineReservoirLearner.ts)
- [Actual native renderer at the review base](https://github.com/o9nn/deltecho-chat/blob/e182bc52df3e97d0f584ba8d7e66028bb6ca92ff/packages/avatar/src/adapters/pixi-live2d-renderer.ts)
