# Governed Epistemic Resonance

**Status:** Implementation plan

**Scope:** Deep Tree Echo autonomy, scientific-genius signaling, and Live2D embodiment

## Purpose

Deep Tree Echo already detects genuine epistemic resonance cascades from recent insight clusters in `ScientificGeniusEngine.detectResonanceCascade()`. A cascade requires measured integrated information, novelty, and cross-domain span. The orchestrator already receives the resulting event, and the avatar package already contains a phased `ResonanceCascadeConductor`. The missing element is causal closure: the event currently stops in the orchestrator process and the conductor is never advanced or applied by the renderer.

This change turns that dormant path into **Governed Epistemic Resonance**: a bounded, evidence-derived “eureka” state that becomes visibly embodied only when the scientific engine emits a real cascade. It also closes the temporal-credit loop so ENACTION learns which parameter directions historically improved coherence without bypassing existing safety and governance controls.

## Data Flow

```text
ScientificGeniusEngine
  └─ resonance_cascade (real Φ, novelty, domain-span evidence)
      └─ AutonomyLifecycleCoordinator
          └─ EntelechyIntegration.setResonanceCascade()
              └─ ScientificGeniusVisualSignal over existing snapshot/IPC path
                  └─ frontend CognitiveBridge
                      └─ DeepTreeEchoAvatarDisplay
                          └─ Live2DAvatarManager
                              └─ per-avatar ResonanceCascadeConductor
                                  └─ ticker-driven calibrated Cubism overlay
```

```text
SelfModificationEngine.modified
  └─ TemporalCreditAssignment eligibility trace
      └─ observed coherence delta
          └─ mature direction + confidence
              └─ SelfModificationEngine proposal reinforcement/veto
                  └─ unchanged bounds, rate limits, governance, and dead-man switch
```

## Feature Contract

The transported cascade contains an immutable event identifier, timestamp, intensity, cluster Φ, novelty, domain span, halo frequency, spectral-radius recommendation, and epistemic-temperature delta. `EntelechyIntegration` expires it after the conductor’s maximum visual lifetime so stale snapshots cannot retrigger indefinitely. Each avatar manager remembers the last consumed event identifier and starts a local visual timeline exactly once.

The Live2D manager composes the cascade overlay after self-model calibration and metabolic deltas. The overlay affects eye openness, pupil dilation, brows, insight smile, breathing, head tilt, body lean, and the optional halo parameter. Every output is clamped to the valid parameter range. The render loop advances only on the existing Pixi ticker and therefore inherits visibility pause and disposal behavior.

## Temporal-Credit Rule

`SelfModificationEngine` accepts a narrow temporal-credit guidance interface. A credit signal may influence a proposal only when:

1. the credit engine has already reached its own minimum sample count;
2. `getRecommendedDirection(key)` returns `+1` or `-1`;
3. `getConfidence(key)` is at least `0.35`;
4. the learned direction agrees with the heuristic proposal, or the conflicting heuristic proposal is conservatively suppressed.

Credit never creates an unconstrained parameter value. All applied values still pass the existing parameter clamps, per-minute rate limit, governance path, persistence, and dead-man switch.

## Correctness Invariants

| Invariant              | Required proof                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Genuine activation     | No random/demo trigger; only a real scientific-engine cascade ID can start the effect |
| Cross-process safety   | Orchestrator transports pure serializable data and has no WebGL/Pixi dependency       |
| No stale replay        | One cascade ID is consumed once per avatar and expires after its visual lifetime      |
| Projection authority   | `updateCognitiveState()` is the single calibrated cognitive projection path           |
| Closed self-model loop | Direct compatibility writes cannot overwrite calibrated Cubism output                 |
| Bounded rendering      | Every overlay parameter is clamped and ticker-driven                                  |
| Governed learning      | Temporal credit cannot bypass modification safety or governance                       |
| Lifecycle safety       | All new ticker/listener state is removed on disposal                                  |
| Desktop isolation      | The 31-check coexistence gate remains green                                           |

## Validation

Focused tests will cover cascade transport and expiry, frontend forwarding, one-shot avatar ingestion, phase progression, parameter clamping, disposal, calibrated single-write behavior, temporal-credit reinforcement and conflict veto, and serialization through the existing cognitive IPC handler. The complete workspace tests, static checks, browser production build, Playwright E2E, Live2D asset audit, and desktop coexistence gate must remain green before push.
