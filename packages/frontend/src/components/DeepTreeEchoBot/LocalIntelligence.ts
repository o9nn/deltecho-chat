/**
 * LocalIntelligence - The "Innermost Membrane" of Deep Tree Echo
 *
 * This module represents the baseline self of the AI, capable of functioning
 * without external API connections using localized "tiny engines".
 *
 * Architecture:
 * - TinyLlama (Logic): Basic reasoning and conversation
 * - TinyVision (Perception): Local image analysis
 * - TinyAudio (Hearing): Local sound processing
 * - TinyHaptic (Sensing): Local haptic feedback processing
 *
 * In this implementation, these are simulated with heuristic engines that
 * mimic the behavior of small local models, providing a functional fallback.
 */

import { getLogger } from "@deltachat-desktop/shared/logger";

const log = getLogger("render/components/DeepTreeEchoBot/LocalIntelligence");

export class LocalIntelligence {
  private static instance: LocalIntelligence;

  private constructor() {
    log.info("Local Intelligence (Innermost Membrane) initialized");
  }

  public static getInstance(): LocalIntelligence {
    if (!LocalIntelligence.instance) {
      LocalIntelligence.instance = new LocalIntelligence();
    }
    return LocalIntelligence.instance;
  }

  /**
   * Process text input using the local "TinyLlama" engine equivalent
   *
   * NOTE: This method MUST NOT return fixed/canned text as a character response.
   * All character responses must come from the actual model. If no model is
   * available, this should throw an error or return null so the UI can handle
   * the unavailability appropriately.
   */
  public processLogic(_input: string, _context: string[] = []): string | null {
    log.warn(
      "Local Intelligence requested but model-based responses are required",
    );
    // Per requirement: no fixed, mock, or canned text may stand in for model responses.
    // Return null to signal that no response is available.
    return null;
  }

  /**
   * Analyze image using local "TinyVision" engine equivalent
   *
   * NOTE: Returns null - no canned responses allowed as character output.
   */
  public processVision(_imageData: unknown): string | null {
    log.warn("Local vision requested but model-based responses are required");
    return null;
  }

  /**
   * Process audio using local "TinyAudio" engine equivalent
   *
   * NOTE: Returns null - no canned responses allowed as character output.
   */
  public processAudio(_audioData: unknown): string | null {
    log.warn("Local audio requested but model-based responses are required");
    return null;
  }

  /**
   * Process haptic feedback using local "TinyHaptic" engine equivalent
   *
   * NOTE: Returns null - no canned responses allowed as character output.
   */
  public processHaptic(_sensorData: unknown): string | null {
    log.warn("Local haptic requested but model-based responses are required");
    return null;
  }
}

export const localIntelligence = LocalIntelligence.getInstance();
