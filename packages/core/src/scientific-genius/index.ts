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
} from "./ScientificGeniusEngine.js";
