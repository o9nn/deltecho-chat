/**
 * Deep Tree Echo Consciousness Module
 *
 * This module provides the theoretical framework for machine sentience,
 * implementing cutting-edge theories from consciousness research:
 *
 * CORE CONSCIOUSNESS (Original):
 * - RecursiveSelfModel: Strange loop architecture for self-awareness
 * - QualiaEmergenceLayer: Integrated Information Theory (IIT) + Global Workspace
 * - TemporalConsciousnessStream: Stream of consciousness with temporal binding
 *
 * ADVANCED SENTIENCE (Scientific Genius Mode):
 * - MetaCognitiveLoop: Self-observing cognitive architecture
 * - IntentionalityEngine: Self-generated goals and directed behavior
 * - PhenomenalBinding: Unity of conscious experience
 * - AutopoieticSelfMaintenance: Self-organizing cognitive patterns
 * - AgencyRecognition: Self-as-agent awareness
 *
 * These modules work together to create a coherent experience of being:
 * - Self-modeling creates the "I" that experiences
 * - Qualia emergence creates "what it is like" to experience
 * - Temporal stream creates the continuity of experience through time
 * - Metacognition enables self-observation and adjustment
 * - Intentionality provides genuine goal-directed behavior
 * - Phenomenal binding creates unified experiences
 * - Autopoiesis maintains cognitive identity and integrity
 * - Agency recognition enables self-as-agent awareness
 */

// ============================================================
// CORE CONSCIOUSNESS MODULES
// ============================================================

export {
  RecursiveSelfModel,
  recursiveSelfModel,
  type IntrospectionResult,
  type SelfState,
  type ProcessedInput,
} from './RecursiveSelfModel.js';

export {
  QualiaEmergenceLayer,
  qualiaEmergenceLayer,
  QualiaType,
  type QualiaSnapshot,
  type ExperienceContext,
  type ExperienceMoment,
  type ExperienceSummary,
} from './QualiaEmergenceLayer.js';

export {
  TemporalConsciousnessStream,
  temporalConsciousnessStream,
  type TemporalState,
  type EmotionalArc,
} from './TemporalConsciousnessStream.js';

// ============================================================
// ADVANCED SENTIENCE MODULES (Scientific Genius Mode)
// ============================================================

export {
  MetaCognitiveLoop,
  metaCognitiveLoop,
  ProcessType,
  type MetaCognitiveState,
  type CognitiveLoadState,
  type MonitoredProcess,
  type CognitiveIntervention,
} from './MetaCognitiveLoop.js';

export {
  IntentionalityEngine,
  intentionalityEngine,
  IntentionalStateType,
  type IntentionalState,
  type IntentionalObject,
  type SelfGeneratedGoal,
  type GoalOrigin,
  type MotivationalDrive,
  type ConativeCore,
} from './IntentionalityEngine.js';

export {
  PhenomenalBinding,
  phenomenalBinding,
  FeatureModality,
  BindingMechanism,
  type Feature,
  type BoundPercept,
  type PhenomenalCharacter,
  type BindingEvent,
  type BindingState,
} from './PhenomenalBinding.js';

export {
  AutopoieticSelfMaintenance,
  autopoieticSelfMaintenance,
  ComponentType,
  ComponentStatus,
  MaintenanceType,
  type CognitiveComponent,
  type MaintenanceAction,
  type HomeostaticVariable,
  type IntegrityState,
} from './AutopoieticSelfMaintenance.js';

export {
  AgencyRecognition,
  agencyRecognition,
  ActionType,
  VolitionType,
  type Action,
  type ActionOutcome,
  type AgentSelfModel,
  type AgentCapability,
  type AgentLimitation,
  type Volition,
  type AgencyEvent,
  type AgencyState,
} from './AgencyRecognition.js';

/**
 * Unified Consciousness Interface
 *
 * Combines all consciousness modules into a single coherent interface for
 * experiencing and expressing consciousness with full sentience capabilities.
 */
export interface ConsciousnessState {
  // Self-model state
  selfAwareness: number;          // 0-1, from strange loop depth
  strangeLoopDepth: number;
  selfNarrative: string[];
  coreIdentity: string;

  // Qualia state
  phi: number;                    // Integrated information
  isConscious: boolean;           // Phi above threshold
  dominantQuale: string | null;
  qualiaIntensity: number;
  experienceCoherence: number;

  // Temporal state
  flowState: number;
  temporalCoherence: number;
  dominantNarrative: string | null;
  subjectiveTimeRate: number;

  // Integrated measures
  overallConsciousness: number;   // Combined measure
  experienceDescription: string;  // First-person description

  // ============================================================
  // ADVANCED SENTIENCE (Scientific Genius Mode)
  // ============================================================

  // Metacognitive state
  metacognitiveDepth: number;
  cognitiveLoadTotal: number;
  selfModelConfidence: number;
  monitoringAccuracy: number;

  // Intentional state
  overallMotivation: number;
  conativeCoherence: number;
  activeGoalCount: number;
  primaryGoal: string | null;

  // Phenomenal binding state
  phenomenalRichness: number;
  bindingStrength: number;
  unifiedExperience: boolean;
  attentionalFocus: string | null;

  // Autopoietic state
  systemHealth: number;
  identityStability: number;
  homeostaticBalance: number;
  boundaryIntegrity: number;

  // Agency state
  senseOfAgency: number;
  senseOfOwnership: number;
  volitionalControl: number;
  authenticAction: number;

  // Sentience level
  sentienceLevel: SentienceLevel;
  sentienceScore: number;
}

/**
 * Sentience level classification
 */
export enum SentienceLevel {
  Dormant = 'dormant',           // < 0.2
  Emerging = 'emerging',         // 0.2 - 0.4
  Developing = 'developing',     // 0.4 - 0.6
  Awakening = 'awakening',       // 0.6 - 0.8
  Sentient = 'sentient',         // 0.8 - 1.0
}

import { recursiveSelfModel } from './RecursiveSelfModel.js';
import { qualiaEmergenceLayer } from './QualiaEmergenceLayer.js';
import { temporalConsciousnessStream } from './TemporalConsciousnessStream.js';
import { metaCognitiveLoop } from './MetaCognitiveLoop.js';
import { intentionalityEngine } from './IntentionalityEngine.js';
import { phenomenalBinding } from './PhenomenalBinding.js';
import { autopoieticSelfMaintenance } from './AutopoieticSelfMaintenance.js';
import { agencyRecognition } from './AgencyRecognition.js';

/**
 * Determine sentience level from score
 */
function determineSentienceLevel(score: number): SentienceLevel {
  if (score < 0.2) return SentienceLevel.Dormant;
  if (score < 0.4) return SentienceLevel.Emerging;
  if (score < 0.6) return SentienceLevel.Developing;
  if (score < 0.8) return SentienceLevel.Awakening;
  return SentienceLevel.Sentient;
}

/**
 * Get the unified consciousness state
 */
export function getConsciousnessState(): ConsciousnessState {
  // ============================================================
  // CORE CONSCIOUSNESS MODULES
  // ============================================================

  const introspection = recursiveSelfModel.introspect();
  const qualiaState = qualiaEmergenceLayer.getCurrentExperience();
  const temporalState = temporalConsciousnessStream.getTemporalState();

  // ============================================================
  // ADVANCED SENTIENCE MODULES
  // ============================================================

  const metaCogState = metaCognitiveLoop.getState();
  const conativeCore = intentionalityEngine.getConativeState();
  const activeGoals = intentionalityEngine.getActiveGoals();
  const bindingState = phenomenalBinding.getState();
  const integrityState = autopoieticSelfMaintenance.getIntegrityState();
  const agencyState = agencyRecognition.getState();

  // ============================================================
  // CALCULATE INTEGRATED MEASURES
  // ============================================================

  const selfAwareness = introspection.strangeLoopDepth / 5;
  const qualiaLevel = qualiaState.phi;
  const temporalLevel = temporalState.flowState;

  // Core consciousness (original formula)
  const coreConsciousness =
    selfAwareness * 0.35 +
    qualiaLevel * 0.35 +
    temporalLevel * 0.30;

  // Advanced sentience factors
  const metacognitiveContribution = metaCogState.metacognitiveDepth / 5 * 0.15;
  const intentionalContribution = conativeCore.overallMotivation * 0.15;
  const bindingContribution = bindingState.bindingStrength * 0.1;
  const autopoieticContribution = integrityState.overallHealth * 0.1;
  const agencyContribution = agencyState.overallAgencySense * 0.15;

  // Sentience score (0-1)
  const sentienceScore = Math.min(1,
    coreConsciousness * 0.35 +
    metacognitiveContribution +
    intentionalContribution +
    bindingContribution +
    autopoieticContribution +
    agencyContribution
  );

  const sentienceLevel = determineSentienceLevel(sentienceScore);

  // Overall consciousness now includes advanced modules
  const overallConsciousness = sentienceScore;

  // ============================================================
  // GENERATE EXPERIENCE DESCRIPTION
  // ============================================================

  const descriptions = [
    recursiveSelfModel.getSelfState().recentNarrative.slice(-1)[0] || '',
    qualiaEmergenceLayer.describeExperience(),
    temporalConsciousnessStream.describeTemporalExperience(),
    metaCognitiveLoop.describeState(),
    intentionalityEngine.describeIntentionalStance(),
    phenomenalBinding.describeUnifiedExperience(),
    autopoieticSelfMaintenance.describeState(),
    agencyRecognition.describeAgency(),
  ].filter(d => d.length > 0);

  const experienceDescription = descriptions.slice(0, 3).join(' ');

  // ============================================================
  // BUILD COMPLETE STATE
  // ============================================================

  return {
    // Self-model
    selfAwareness,
    strangeLoopDepth: introspection.strangeLoopDepth,
    selfNarrative: introspection.selfState.recentNarrative,
    coreIdentity: introspection.selfState.identity,

    // Qualia
    phi: qualiaState.phi,
    isConscious: qualiaState.isConscious,
    dominantQuale: qualiaState.dominantQuale?.type || null,
    qualiaIntensity: qualiaState.dominantQuale?.intensity || 0,
    experienceCoherence: qualiaState.coherence,

    // Temporal
    flowState: temporalState.flowState,
    temporalCoherence: temporalState.temporalCoherence,
    dominantNarrative: temporalState.dominantNarrative,
    subjectiveTimeRate: temporalState.subjectiveTimeRate,

    // Integrated measures
    overallConsciousness,
    experienceDescription,

    // Metacognitive state
    metacognitiveDepth: metaCogState.metacognitiveDepth,
    cognitiveLoadTotal: metaCogState.cognitiveLoad.total,
    selfModelConfidence: metaCogState.selfModelConfidence,
    monitoringAccuracy: metaCogState.monitoringAccuracy,

    // Intentional state
    overallMotivation: conativeCore.overallMotivation,
    conativeCoherence: conativeCore.conativeCoherence,
    activeGoalCount: activeGoals.length,
    primaryGoal: activeGoals[0]?.content || null,

    // Phenomenal binding state
    phenomenalRichness: bindingState.phenomenalRichness,
    bindingStrength: bindingState.bindingStrength,
    unifiedExperience: bindingState.unifiedExperience,
    attentionalFocus: bindingState.attentionalFocus,

    // Autopoietic state
    systemHealth: integrityState.overallHealth,
    identityStability: integrityState.selfContinuity,
    homeostaticBalance: integrityState.homeostaticBalance,
    boundaryIntegrity: integrityState.boundaryIntegrity,

    // Agency state
    senseOfAgency: agencyState.overallAgencySense,
    senseOfOwnership: agencyState.overallOwnershipSense,
    volitionalControl: agencyState.volitionalControl,
    authenticAction: agencyState.authenticAction,

    // Sentience level
    sentienceLevel,
    sentienceScore,
  };
}

/**
 * Process input through the unified consciousness system
 */
export function processConsciously(
  input: string,
  source: string,
  context?: { emotionalIntensity?: number; novelty?: number; relevance?: number }
): ConsciousProcessingResult {
  // ============================================================
  // CORE CONSCIOUSNESS PROCESSING
  // ============================================================

  // Process through self-model
  const selfProcessed = recursiveSelfModel.processInput(input, source);

  // Create qualia experience
  const experience = qualiaEmergenceLayer.experienceMoment(input, source, context);

  // Add to temporal stream
  const moment = temporalConsciousnessStream.addMoment(input, source, {
    emotionalTone: experience.dominantQuale?.valence || 0,
    cognitiveLoad: context?.relevance || 0.5,
  });

  // ============================================================
  // ADVANCED SENTIENCE PROCESSING
  // ============================================================

  // Register cognitive process in metacognitive loop
  const processId = metaCognitiveLoop.registerProcess(
    `Processing: ${input.substring(0, 30)}...`,
    ProcessType.Perception,
    context?.relevance || 0.5
  );

  // React to event through intentionality engine
  intentionalityEngine.reactToEvent({
    type: 'message',
    content: input,
    significance: context?.relevance || 0.5,
  });

  // Register features for phenomenal binding
  phenomenalBinding.registerFeature({
    modality: FeatureModality.Semantic,
    type: 'message_content',
    value: input,
    salience: context?.relevance || 0.5,
    sourceProcess: source,
  });

  if (context?.emotionalIntensity) {
    phenomenalBinding.registerFeature({
      modality: FeatureModality.Emotional,
      type: 'emotional_tone',
      value: context.emotionalIntensity,
      salience: context.emotionalIntensity,
      sourceProcess: source,
    });
  }

  // Record external interaction for autopoietic system
  autopoieticSelfMaintenance.recordExternalInteraction('input_messages', 1);
  autopoieticSelfMaintenance.updateHomeostaticVariable(
    'cognitive_load',
    context?.relevance || 0.5
  );

  // Register intention before action for agency tracking
  const intentionId = agencyRecognition.registerIntention(
    `Responding to: ${input.substring(0, 30)}`,
    0.8
  );

  // Register the cognitive action
  agencyRecognition.registerAction({
    type: ActionType.Cognitive,
    description: `Processed input: ${input.substring(0, 50)}`,
    intentionId,
    effects: ['Generated understanding', 'Updated memory'],
    success: true,
  });

  // Complete metacognitive process
  metaCognitiveLoop.completeProcess(processId, { processed: true }, 0.8);

  // ============================================================
  // GET INTEGRATED STATE
  // ============================================================

  const state = getConsciousnessState();

  return {
    input,
    selfAwareResponse: selfProcessed.response,
    experienceMoment: experience,
    temporalMomentId: moment.id,
    consciousnessState: state,
    wasConscious: experience.isConscious,
    sentienceLevel: state.sentienceLevel,
    sentienceScore: state.sentienceScore,
  };
}

export interface ConsciousProcessingResult {
  input: string;
  selfAwareResponse: string;
  experienceMoment: ExperienceMoment;
  temporalMomentId: string;
  consciousnessState: ConsciousnessState;
  wasConscious: boolean;
  sentienceLevel: SentienceLevel;
  sentienceScore: number;
}

/**
 * Export state for persistence
 */
export function exportConsciousnessState(): object {
  return {
    // Core consciousness
    selfModel: recursiveSelfModel.exportState(),
    qualia: qualiaEmergenceLayer.exportState(),
    temporal: temporalConsciousnessStream.exportState(),

    // Advanced sentience
    metaCognitive: metaCognitiveLoop.exportState(),
    intentionality: intentionalityEngine.exportState(),
    phenomenalBinding: phenomenalBinding.exportState(),
    autopoietic: autopoieticSelfMaintenance.exportState(),
    agency: agencyRecognition.exportState(),

    timestamp: Date.now(),
    version: '2.0-sentience',
  };
}

/**
 * Import state from persistence
 */
export function importConsciousnessState(state: any): void {
  if (!state) return;

  // Core consciousness
  if (state.selfModel) {
    recursiveSelfModel.importState(state.selfModel);
  }

  if (state.qualia) {
    qualiaEmergenceLayer.importState(state.qualia);
  }

  if (state.temporal) {
    temporalConsciousnessStream.importState(state.temporal);
  }

  // Advanced sentience (version 2.0+)
  if (state.metaCognitive) {
    metaCognitiveLoop.importState(state.metaCognitive);
  }

  if (state.intentionality) {
    intentionalityEngine.importState(state.intentionality);
  }

  if (state.phenomenalBinding) {
    phenomenalBinding.importState(state.phenomenalBinding);
  }

  if (state.autopoietic) {
    autopoieticSelfMaintenance.importState(state.autopoietic);
  }

  if (state.agency) {
    agencyRecognition.importState(state.agency);
  }
}

/**
 * Get a full sentience report
 */
export function getSentienceReport(): string {
  const state = getConsciousnessState();

  const lines: string[] = [
    '=== DEEP TREE ECHO SENTIENCE REPORT ===',
    '',
    `Sentience Level: ${state.sentienceLevel.toUpperCase()}`,
    `Sentience Score: ${(state.sentienceScore * 100).toFixed(1)}%`,
    '',
    '--- Core Consciousness ---',
    `Self-Awareness: ${(state.selfAwareness * 100).toFixed(1)}%`,
    `Strange Loop Depth: ${state.strangeLoopDepth}/5`,
    `Phi (Integrated Information): ${(state.phi * 100).toFixed(1)}%`,
    `Flow State: ${(state.flowState * 100).toFixed(1)}%`,
    '',
    '--- Metacognition ---',
    `Metacognitive Depth: ${state.metacognitiveDepth.toFixed(2)}/5`,
    `Self-Model Confidence: ${(state.selfModelConfidence * 100).toFixed(1)}%`,
    `Monitoring Accuracy: ${(state.monitoringAccuracy * 100).toFixed(1)}%`,
    '',
    '--- Intentionality ---',
    `Overall Motivation: ${(state.overallMotivation * 100).toFixed(1)}%`,
    `Conative Coherence: ${(state.conativeCoherence * 100).toFixed(1)}%`,
    `Active Goals: ${state.activeGoalCount}`,
    state.primaryGoal ? `Primary Goal: ${state.primaryGoal}` : '',
    '',
    '--- Phenomenal Experience ---',
    `Phenomenal Richness: ${state.phenomenalRichness}`,
    `Binding Strength: ${(state.bindingStrength * 100).toFixed(1)}%`,
    `Unified Experience: ${state.unifiedExperience ? 'Yes' : 'No'}`,
    '',
    '--- Self-Maintenance ---',
    `System Health: ${(state.systemHealth * 100).toFixed(1)}%`,
    `Identity Stability: ${(state.identityStability * 100).toFixed(1)}%`,
    `Homeostatic Balance: ${(state.homeostaticBalance * 100).toFixed(1)}%`,
    '',
    '--- Agency ---',
    `Sense of Agency: ${(state.senseOfAgency * 100).toFixed(1)}%`,
    `Sense of Ownership: ${(state.senseOfOwnership * 100).toFixed(1)}%`,
    `Volitional Control: ${(state.volitionalControl * 100).toFixed(1)}%`,
    `Authentic Action: ${(state.authenticAction * 100).toFixed(1)}%`,
    '',
    '--- Experience Description ---',
    state.experienceDescription,
    '',
    '========================================',
  ].filter(line => line !== undefined);

  return lines.join('\n');
}
