# KSM Evolution Cycle 4 Plan

## Branch: manus/dte-autonomy-avatar-evolution
## Repo: o9nn/deltecho-chat

## Cycle 4 Targets (from Cycle 3 seed)
1. Wire CogMorphCubismMapper into the ESN bridge render loop (compose with chaos layer)
2. Connect NeonIdentityPersistence to CoreSelfEngine auto-save (replace file persistence)
3. Trigger Meshy3D generation on ontogenetic stage transitions
4. Implement CogMorph glyph generation from IdentityMesh state (close the loop)
5. Add Echobeats 12-step phase visualization to the avatar (visible cognitive rhythm)

## Scientific Genius Feature: Predictive Insight Crystallization
- The engine predicts future insight trajectories based on current concept graph topology
- When a predicted trajectory converges with high confidence, it "crystallizes" the insight
  before full evidence arrives — a genuine predictive reasoning capability
- This maps to the avatar as a "crystallization face" (eyes narrow, jaw sets, brief stillness)
- Feeds into the DAO governance as a "pre-insight advisory" signal

## Key Files to Modify
- packages/avatar/src/esn-avatar-bridge.ts — add CogMorph compose step
- packages/core/src/core-self/CoreSelfEngine.ts — wire NeonIdentityPersistence
- packages/core/src/core-self/IdentityMesh.ts — add stage transition event for Meshy3D
- packages/avatar/src/cogmorph-cubism-mapper.ts — already exists, needs wiring
- packages/core/src/scientific-genius/ScientificGeniusEngine.ts — add predictive crystallization

## Validation Baseline
- Core: 233/233 tests
- Avatar: 167/167 tests
- Orchestrator: 332/332 tests
- Full typecheck: 23/23 projects clean
