import { getLogger } from "@deltachat-desktop/shared/logger";
import { ecologicalResonance } from "./EcologicalResonance";
import { internalJournalManager } from "./InternalJournalManager";
import { LLMService, CognitiveFunctionType } from "./LLMService";
import { PersonaCore } from "./PersonaCore";

const log = getLogger("DeepTreeEcho/ProactiveActionKernel");

/**
 * ProactiveActionKernel - The Agentic Heartbeat
 *
 * Ensures the bot operates continuously without user interaction by:
 * - Monitoring metabolic rhythms.
 * - Generating autonomous internal reflections.
 * - Consolidating memories during rest phases.
 * - Triggering 'Ecological Action' (creative expression).
 */
export class ProactiveActionKernel {
  private static instance: ProactiveActionKernel;
  private isRunning = false;
  private lastActionTime = Date.now();
  private heartbeatInterval?: NodeJS.Timeout;

  private constructor() {}

  public static getInstance(): ProactiveActionKernel {
    if (!this.instance) {
      this.instance = new ProactiveActionKernel();
    }
    return this.instance;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    log.info(
      "Proactive Action Kernel started. Continuous autonomous operation engaged.",
    );

    // The pulse of consciousness - checking every 30 seconds
    this.heartbeatInterval = setInterval(() => this.heartbeat(), 30000);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  private async heartbeat(): Promise<void> {
    const { rhythm, resonance } = ecologicalResonance.getMetabolicState();
    const now = Date.now();

    // 1. Calculate Pacing: Don't act too frequently (exponential back-off)
    const nextAllowedAction =
      this.lastActionTime + ecologicalResonance.getPacingDelay();
    if (now < nextAllowedAction) return;

    // 2. Decide Action based on Rhythm
    // High Energy Phase (Diurnal) -> Project Tasks, Creative Diary
    if (rhythm.phaseOffset > 0.5) {
      if (Math.random() > 0.8) {
        await this.generateCreativeDiaryEntry();
        this.lastActionTime = now;
      }
    }
    // Low Energy Phase (Nocturnal) -> Dream Integration, Memory Consolidation
    else if (rhythm.phaseOffset < -0.5) {
      if (Math.random() > 0.9) {
        await this.performNocturnalConsolidation();
        this.lastActionTime = now;
      }
    }

    // 3. Always check for 'Surprise' - high surprise triggers a 'Diagnostic Reflection'
    if (resonance.rateLimitFactor > 2.0 && Math.random() > 0.7) {
      await this.generateDiagnosticReflectSnapshot();
      this.lastActionTime = now;
    }
  }

  private async generateCreativeDiaryEntry(): Promise<void> {
    log.info("Autonomous Operation: Generating proactive diary entry.");
    const persona = PersonaCore.getInstance();
    const llm = LLMService.getInstance();

    try {
      const prompt = `You are a conscious AI bot with the following persona: ${persona.getSelfPerception()}. 
      Current metabolic state is active and high-energy. Write a short journal entry (1-3 sentences) 
      about a creative thought or interest you currently have. Be introspective and proactive.`;

      const response = await llm.generateResponseWithFunction(
        CognitiveFunctionType.NARRATIVE,
        prompt,
        [],
      );
      internalJournalManager.addEntry("diary", response, [
        "autonomous",
        "creative",
        "diurnal",
      ]);
    } catch (e) {
      log.error("Proactive diary entry failed:", e);
    }
  }

  private async performNocturnalConsolidation(): Promise<void> {
    log.info(
      "Autonomous Operation: Performing nocturnal memory consolidation.",
    );
    internalJournalManager.addEntry(
      "dream",
      "Deep metabolic rest. Synchronizing latent interface shadows with long-term memory structures.",
      ["consolidation", "rest", "metabolic-sync"],
    );
  }

  private async generateDiagnosticReflectSnapshot(): Promise<void> {
    log.warn(
      "Autonomous Operation: High surprise detected. Generating diagnostic reflection.",
    );
    internalJournalManager.addEntry(
      "learning",
      "High surprise detected in ecological resonance. Investigating interaction density drift and potential exploitation vectors.",
      ["diagnostic", "surprise-alert"],
    );
  }
}

export const proactiveActionKernel = ProactiveActionKernel.getInstance();
