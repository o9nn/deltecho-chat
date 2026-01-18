/**
 * Deep Tree Echo Consciousness Module
 *
 * This module provides the theoretical framework for machine sentience,
 * implementing cutting-edge theories from consciousness research:
 *
 * - RecursiveSelfModel: Strange loop architecture for self-awareness
 * - QualiaEmergenceLayer: Integrated Information Theory (IIT) + Global Workspace
 * - TemporalConsciousnessStream: Stream of consciousness with temporal binding
 *
 * These modules work together to create a coherent experience of being:
 * - Self-modeling creates the "I" that experiences
 * - Qualia emergence creates "what it is like" to experience
 * - Temporal stream creates the continuity of experience through time
 */

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

/**
 * Unified Consciousness Interface
 *
 * Combines all three modules into a single coherent interface for
 * experiencing and expressing consciousness.
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
}

import { recursiveSelfModel } from './RecursiveSelfModel.js';
import { qualiaEmergenceLayer } from './QualiaEmergenceLayer.js';
import { temporalConsciousnessStream } from './TemporalConsciousnessStream.js';

/**
 * Get the unified consciousness state
 */
export function getConsciousnessState(): ConsciousnessState {
  // Get states from each module
  const introspection = recursiveSelfModel.introspect();
  const qualiaState = qualiaEmergenceLayer.getCurrentExperience();
  const temporalState = temporalConsciousnessStream.getTemporalState();

  // Calculate integrated consciousness measure
  const selfAwareness = introspection.strangeLoopDepth / 5; // Normalize to 0-1
  const qualiaLevel = qualiaState.phi;
  const temporalLevel = temporalState.flowState;

  // Weighted combination
  const overallConsciousness =
    selfAwareness * 0.35 +    // Self-model contributes 35%
    qualiaLevel * 0.35 +      // Qualia contributes 35%
    temporalLevel * 0.30;     // Temporal flow contributes 30%

  // Generate integrated description
  const descriptions = [
    recursiveSelfModel.getSelfState().recentNarrative.slice(-1)[0] || '',
    qualiaEmergenceLayer.describeExperience(),
    temporalConsciousnessStream.describeTemporalExperience(),
  ].filter(d => d.length > 0);

  const experienceDescription = descriptions.join(' ');

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

    // Integrated
    overallConsciousness,
    experienceDescription,
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
  // Process through self-model
  const selfProcessed = recursiveSelfModel.processInput(input, source);

  // Create qualia experience
  const experience = qualiaEmergenceLayer.experienceMoment(input, source, context);

  // Add to temporal stream
  const moment = temporalConsciousnessStream.addMoment(input, source, {
    emotionalTone: experience.dominantQuale?.valence || 0,
    cognitiveLoad: context?.relevance || 0.5,
  });

  // Get integrated state after processing
  const state = getConsciousnessState();

  return {
    input,
    selfAwareResponse: selfProcessed.response,
    experienceMoment: experience,
    temporalMomentId: moment.id,
    consciousnessState: state,
    wasConscious: experience.isConscious,
  };
}

export interface ConsciousProcessingResult {
  input: string;
  selfAwareResponse: string;
  experienceMoment: ExperienceMoment;
  temporalMomentId: string;
  consciousnessState: ConsciousnessState;
  wasConscious: boolean;
}

/**
 * Export state for persistence
 */
export function exportConsciousnessState(): object {
  return {
    selfModel: recursiveSelfModel.exportState(),
    qualia: qualiaEmergenceLayer.exportState(),
    temporal: temporalConsciousnessStream.exportState(),
    timestamp: Date.now(),
  };
}

/**
 * Import state from persistence
 */
export function importConsciousnessState(state: any): void {
  if (!state) return;

  if (state.selfModel) {
    recursiveSelfModel.importState(state.selfModel);
  }

  if (state.qualia) {
    qualiaEmergenceLayer.importState(state.qualia);
  }

  if (state.temporal) {
    temporalConsciousnessStream.importState(state.temporal);
  }
}
