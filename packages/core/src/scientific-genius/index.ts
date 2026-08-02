/**
 * Scientific Genius Module for Deep Tree Echo
 *
 * Provides advanced scientific reasoning capabilities through a multi-theoretic
 * approach combining:
 *
 * - Free Energy Principle (Friston): Minimizes prediction error
 * - Integrated Information Theory (Tononi): Measures Φ for explanatory power
 * - Global Workspace Theory (Baars): Broadcasts insights for integration
 * - Autopoiesis (Maturana & Varela): Self-maintains knowledge structures
 * - Strange Loops (Hofstadter): Enables self-referential reasoning
 * - Entelechy (Aristotle): Full self-realization through emergence
 *
 * Usage:
 * ```typescript
 * import { scientificGeniusEngine, ScientificDomain } from '@deltecho/core';
 *
 * // Enter genius mode for enhanced reasoning
 * scientificGeniusEngine.enterGeniusMode();
 *
 * // Process a scientific query
 * const insights = await scientificGeniusEngine.processScientificQuery(
 *   "What is the relationship between consciousness and information?",
 *   ScientificDomain.CognitiveScience
 * );
 *
 * // Get the current state
 * const state = scientificGeniusEngine.getState();
 * console.log(scientificGeniusEngine.describeState());
 * ```
 */

export {
  ScientificGeniusEngine,
  scientificGeniusEngine,
  ScientificDomain,
  ReasoningMode,
  type ScientificConcept,
  type Hypothesis,
  type Evidence,
  type Prediction,
  type ScientificInsight,
  type GlobalWorkspaceState,
  type StrangeLoopState,
  type ScientificGeniusConfig,
  type HypothesisEvaluationEvent,
  type EpistemicResonanceCascade,
  type PredictiveInsightCrystal,
} from "./ScientificGeniusEngine.js";

export {
  RelevanceGeniusIntegration,
  relevanceGeniusIntegration,
  type RelevanceGuidedInquiry,
  type FrameProblemSolution,
  type IntegrationConfig,
} from "./RelevanceGeniusIntegration.js";

export {
  EntelechyEmergenceEngine,
  entelechyEngine,
  EmergenceLevel,
  type EmergentPattern,
  type EntelechyState,
  type EntelechyConfig,
} from "./EntelechyEmergenceEngine.js";

export {
  EpistemicImmuneSystem,
  epistemicImmuneSystem,
  ThreatClass,
  ImmuneResponse,
  type EpistemicThreat,
  type Antibody,
  type MemoryCell,
  type InflammationState,
  type ImmuneSystemState,
  type QuarantineEntry,
  type EpistemicImmuneConfig,
} from "./EpistemicImmuneSystem.js";

export {
  ConceptualMetabolism,
  conceptualMetabolism,
  MetabolicReaction,
  MetabolicPhase,
  DEFAULT_METABOLISM_CONFIG,
  type KnowledgeUnit,
  type MetabolicEvent,
  type MetabolicState,
  type ConceptualMetabolismConfig,
} from "./ConceptualMetabolism.js";
