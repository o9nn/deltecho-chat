/**
 * @fileoverview Core Self module — persistent local intelligence for DTE
 *
 * Exports the three-layer cognitive stack:
 *   - CoreSelfEngine: Master orchestrator
 *   - IdentityMesh: Persistent identity with AAR model and ontogenetic stages
 *   - LucyInferenceDriver: Local GGUF model inference via llama.cpp
 *   - ReservoirBridge: TypeScript ESN implementation (EchoReservoir, CognitiveReadout, AARRelation)
 */

export {
  CoreSelfEngine,
  type CoreSelfConfig,
  type CoreSelfResponse,
  type CoreSelfStatus,
} from "./CoreSelfEngine.js";

export {
  IdentityMesh,
  OntogeneticStage,
  STAGE_THRESHOLDS,
  type IdentityMeshConfig,
  type IdentityMeshState,
  type IdentityAgentState,
  type IdentityArenaState,
  type IdentityRelationState,
  type IdentityAutognosisSignal,
  type IdentityGovernanceProposal,
} from "./IdentityMesh.js";

export {
  AutognosisAutogenesisCoupler,
  isCoupleGranted,
  deriveAutogenesisKind,
  autogenesisGoalId,
  encodeAutogenesisVector,
  l2Normalize,
  AUTOGENESIS_COUPLE_ENV,
  CONSENSUS_SLOT,
  ADOPTED_SLOT,
  DEFAULT_INPUT_DIM,
  DEFAULT_GOAL_CAP,
  type AutogenesisKind,
  type CoupleResult,
  type ReservoirAccessors,
  type IntentionalityAccessors,
} from "./AutognosisAutogenesisCoupler.js";

export {
  LucyInferenceDriver,
  type LucyDriverConfig,
  type ChatMessage,
  type InferenceResult,
  type InferenceMetrics,
} from "./LucyInferenceDriver.js";

export {
  EchoReservoir,
  CognitiveReadout,
  AARRelation,
  type ESNReservoirConfig,
  type ESNReservoirState,
  type ReadoutResult,
  type AARState,
} from "./ReservoirBridge.js";

export {
  OnlineReservoirLearner,
  type OnlineLearnerConfig,
  type FeedbackSignal,
  type LearningUpdate,
  type LearnerState,
} from "./OnlineReservoirLearner.js";
