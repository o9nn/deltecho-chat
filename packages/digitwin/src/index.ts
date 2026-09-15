/**
 * @deltecho/digitwin — Digital Twin of Deep Tree Echo as DAO-AGI
 *
 * Composition: vorticog ⊗ cogsim-pml ⊗ virtual-endocrine-system
 *
 * Provides a shadow simulation of DTE's cognitive architecture:
 * - CogSim-PML process model of the cognitive pipeline
 * - Virtual Endocrine System (10 glands, 16 hormones, 10 modes)
 * - DAO consensus with ESN Autognosis feedback
 * - What-if scenario testing
 * - Orchestrator bridge for live system mirroring
 */

// Core simulation engine
export {
  CognitiveProcessModel,
  type CognitiveEntity,
  type CognitiveEntityType,
  type StageVisit,
  type HormoneSnapshot,
  type StageConfig,
  type StageStats,
  type CognitiveProcessConfig,
} from "./cognitive-process-model";

// Virtual Endocrine System
export {
  VirtualEndocrineSystem,
  Hormone,
  Gland,
  CognitiveMode,
  type HormoneState,
  type ValenceSignature,
  type EndocrineEvent,
} from "./virtual-endocrine-system";

// DAO-ESN Autognosis
export {
  DAOESNAutognosis,
  type ReservoirConfig,
  type ReservoirState,
  type AutognosisReport,
  type AutognosisPathology,
  type GovernanceAdjustment,
  type DAOProposal,
  type Vote,
  type ConsensusResult,
} from "./dao-esn-autognosis";

// Orchestrator Bridge
export {
  DigitwinOrchestratorBridge,
  type DigitwinBridgeConfig,
  type WhatIfScenario,
  type ScenarioResult,
  type DigitwinSnapshot,
} from "./digitwin-orchestrator-bridge";
