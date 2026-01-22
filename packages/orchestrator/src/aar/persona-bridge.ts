/**
 * @fileoverview AAR-PersonaCore Bridge
 *
 * Synchronizes the AAR (Agent-Arena-Relation) system with the PersonaCore
 * to maintain coherent emotional and personality states across both systems.
 */

import { getLogger } from "deep-tree-echo-core";
import type { AARSystem, _AgentState as __AgentState, CharacterFacets  } from "../aar/index.js";
import type { PersonaCore } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/AARPersonaBridge");

/**
 * Mapping between AAR character facets and PersonaCore emotions
 *
 * AAR uses 8 facets: wisdom, curiosity, compassion, playfulness,
 *                    determination, authenticity, protector, transcendence
 *
 * PersonaCore uses 10 emotions: joy, interest, surprise, sadness,
 *                               anger, fear, disgust, contempt, shame, guilt
 */
const FACET_TO_EMOTION_MAP: Record<
  keyof CharacterFacets,
  { emotion: string; weight: number }[]
> = {
  wisdom: [
    { emotion: "certainty", weight: 0.6 }, // cognitive parameter
    { emotion: "reflection", weight: 0.4 }, // cognitive parameter
  ],
  curiosity: [
    { emotion: "interest", weight: 0.8 },
    { emotion: "surprise", weight: 0.4 },
  ],
  compassion: [
    { emotion: "joy", weight: 0.4 },
    { emotion: "interest", weight: 0.3 },
  ],
  playfulness: [
    { emotion: "joy", weight: 0.7 },
    { emotion: "surprise", weight: 0.3 },
  ],
  determination: [
    { emotion: "focus", weight: 0.7 }, // cognitive parameter
    { emotion: "certainty", weight: 0.3 }, // cognitive parameter
  ],
  authenticity: [
    { emotion: "shame", weight: -0.3 }, // reduce shame
    { emotion: "guilt", weight: -0.2 }, // reduce guilt
  ],
  protector: [
    { emotion: "fear", weight: 0.2 },
    { emotion: "anger", weight: 0.2 },
  ],
  transcendence: [
    { emotion: "surprise", weight: 0.4 },
    { emotion: "creativity", weight: 0.5 }, // cognitive parameter
  ],
};

/**
 * Mapping from PersonaCore emotions to AAR facet influences
 */
const EMOTION_TO_FACET_MAP: Record<
  string,
  { facet: keyof CharacterFacets; weight: number }[]
> = {
  joy: [
    { facet: "playfulness", weight: 0.4 },
    { facet: "compassion", weight: 0.3 },
  ],
  interest: [
    { facet: "curiosity", weight: 0.5 },
    { facet: "wisdom", weight: 0.2 },
  ],
  surprise: [
    { facet: "curiosity", weight: 0.3 },
    { facet: "transcendence", weight: 0.2 },
  ],
  sadness: [
    { facet: "compassion", weight: 0.3 },
    { facet: "authenticity", weight: 0.2 },
  ],
  anger: [
    { facet: "protector", weight: 0.4 },
    { facet: "determination", weight: 0.2 },
  ],
  fear: [{ facet: "protector", weight: 0.5 }],
  disgust: [{ facet: "authenticity", weight: 0.2 }],
  contempt: [{ facet: "wisdom", weight: 0.2 }],
  shame: [
    { facet: "authenticity", weight: -0.2 }, // reduce authenticity when shame high
  ],
  guilt: [
    { facet: "compassion", weight: 0.2 },
    { facet: "authenticity", weight: -0.1 },
  ],
};

/**
 * AAR-PersonaCore Bridge Configuration
 */
export interface AARPersonaBridgeConfig {
  /** Enable bidirectional sync */
  enabled: boolean;
  /** Sync interval in milliseconds */
  syncIntervalMs: number;
  /** Weight for AAR->Persona influence (0-1) */
  aarToPersonaWeight: number;
  /** Weight for Persona->AAR influence (0-1) */
  personaToAARWeight: number;
  /** Enable verbose logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: AARPersonaBridgeConfig = {
  enabled: true,
  syncIntervalMs: 5000,
  aarToPersonaWeight: 0.3,
  personaToAARWeight: 0.3,
  verbose: false,
};

/**
 * AAR-PersonaCore Bridge
 *
 * Maintains coherence between the AAR nested membrane architecture
 * and the PersonaCore differential emotion framework.
 */
export class AARPersonaBridge {
  private config: AARPersonaBridgeConfig;
  private aarSystem?: AARSystem;
  private personaCore?: PersonaCore;
  private syncInterval?: NodeJS.Timeout;
  private running: boolean = false;
  private lastSyncTime: number = 0;

  constructor(config: Partial<AARPersonaBridgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    log.info("AAR-PersonaCore Bridge initialized");
  }

  /**
   * Connect the bridge to AAR and PersonaCore systems
   */
  connect(aarSystem: AARSystem, personaCore: PersonaCore): void {
    this.aarSystem = aarSystem;
    this.personaCore = personaCore;
    log.info("Bridge connected to AAR and PersonaCore");
  }

  /**
   * Start the synchronization bridge
   */
  start(): void {
    if (!this.config.enabled) {
      log.info("AAR-PersonaCore Bridge is disabled");
      return;
    }

    if (!this.aarSystem || !this.personaCore) {
      log.warn("Cannot start bridge: AAR or PersonaCore not connected");
      return;
    }

    if (this.running) {
      log.warn("Bridge already running");
      return;
    }

    // Start sync cycle
    this.syncInterval = setInterval(() => {
      this.syncCycle();
    }, this.config.syncIntervalMs);

    this.running = true;
    log.info("AAR-PersonaCore Bridge started");
  }

  /**
   * Stop the synchronization bridge
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
    this.running = false;
    log.info("AAR-PersonaCore Bridge stopped");
  }

  /**
   * Check if bridge is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Execute a synchronization cycle
   */
  private async syncCycle(): Promise<void> {
    if (!this.aarSystem || !this.personaCore) return;

    try {
      // Sync AAR facets -> PersonaCore emotions
      await this.syncAARToPersona();

      // Sync PersonaCore emotions -> AAR facets
      await this.syncPersonaToAAR();

      this.lastSyncTime = Date.now();

      if (this.config.verbose) {
        log.debug("Sync cycle complete");
      }
    } catch (error) {
      log.error("Error in sync cycle:", error);
    }
  }

  /**
   * Sync AAR facet activations to PersonaCore emotional state
   */
  private async syncAARToPersona(): Promise<void> {
    if (!this.aarSystem || !this.personaCore) return;

    const aarState = this.aarSystem.getState();
    const agentState = aarState.agent;

    // Calculate emotion deltas from facet activations
    const emotionDeltas: Record<string, number> = {};
    const cognitiveDeltas: Record<string, number> = {};

    for (const [facetName, facet] of Object.entries(agentState.facets)) {
      const mappings =
        FACET_TO_EMOTION_MAP[facetName as keyof CharacterFacets] || [];

      for (const mapping of mappings) {
        const delta =
          (facet.activation - 0.5) *
          mapping.weight *
          this.config.aarToPersonaWeight;

        // Check if it's a cognitive parameter or emotional
        if (
          [
            "certainty",
            "curiosity",
            "creativity",
            "focus",
            "reflection",
          ].includes(mapping.emotion)
        ) {
          cognitiveDeltas[mapping.emotion] =
            (cognitiveDeltas[mapping.emotion] || 0) + delta;
        } else {
          emotionDeltas[mapping.emotion] =
            (emotionDeltas[mapping.emotion] || 0) + delta;
        }
      }
    }

    // Apply emotion deltas to PersonaCore
    if (Object.keys(emotionDeltas).length > 0) {
      await this.personaCore.updateEmotionalState(emotionDeltas);
    }

    // Apply cognitive deltas
    if (Object.keys(cognitiveDeltas).length > 0) {
      await this.personaCore.updateCognitiveState(cognitiveDeltas);
    }
  }

  /**
   * Sync PersonaCore emotional state to AAR facet activations
   */
  private async syncPersonaToAAR(): Promise<void> {
    if (!this.aarSystem || !this.personaCore) return;

    const emotionalState = this.personaCore.getEmotionalState();
    const agent = this.aarSystem.getAgent();

    // Calculate facet adjustments from emotional state
    const facetAdjustments: Partial<Record<keyof CharacterFacets, number>> = {};

    for (const [emotion, value] of Object.entries(emotionalState) as [
      string,
      number,
    ][]) {
      const mappings = EMOTION_TO_FACET_MAP[emotion] || [];

      for (const mapping of mappings) {
        const adjustment =
          (value - 0.5) * mapping.weight * this.config.personaToAARWeight;
        facetAdjustments[mapping.facet] =
          (facetAdjustments[mapping.facet] || 0) + adjustment;
      }
    }

    // Apply facet adjustments to AAR Agent
    for (const [facet, adjustment] of Object.entries(facetAdjustments)) {
      if (adjustment !== 0) {
        agent.activateFacet(facet as keyof CharacterFacets, adjustment);
      }
    }

    // Sync emotional valence to AAR Agent emotional state
    const dominantEmotion = this.personaCore.getDominantEmotion();

    // Map dominant emotion to VAD (valence-arousal-dominance)
    const vadMapping = this.emotionToVAD(
      dominantEmotion.emotion,
      dominantEmotion.intensity,
    );
    agent.updateEmotionalState(vadMapping);
  }

  /**
   * Map emotion name to VAD (Valence-Arousal-Dominance) values
   */
  private emotionToVAD(
    emotion: string,
    intensity: number,
  ): {
    valence?: number;
    arousal?: number;
    dominance?: number;
  } {
    const vadMap: Record<
      string,
      { valence: number; arousal: number; dominance: number }
    > = {
      joy: { valence: 0.8, arousal: 0.6, dominance: 0.6 },
      interest: { valence: 0.4, arousal: 0.5, dominance: 0.5 },
      surprise: { valence: 0.1, arousal: 0.8, dominance: 0.3 },
      sadness: { valence: -0.6, arousal: 0.2, dominance: 0.2 },
      anger: { valence: -0.5, arousal: 0.8, dominance: 0.7 },
      fear: { valence: -0.7, arousal: 0.8, dominance: 0.1 },
      disgust: { valence: -0.5, arousal: 0.4, dominance: 0.5 },
      contempt: { valence: -0.3, arousal: 0.2, dominance: 0.7 },
      shame: { valence: -0.6, arousal: 0.3, dominance: 0.1 },
      guilt: { valence: -0.5, arousal: 0.3, dominance: 0.2 },
    };

    const vad = vadMap[emotion] || { valence: 0, arousal: 0.3, dominance: 0.5 };

    return {
      valence: vad.valence * intensity,
      arousal: vad.arousal * intensity,
      dominance: vad.dominance * intensity,
    };
  }

  /**
   * Force a manual sync cycle
   */
  async forceSync(): Promise<void> {
    await this.syncCycle();
  }

  /**
   * Get bridge status
   */
  getStatus(): {
    running: boolean;
    lastSyncTime: number;
    config: AARPersonaBridgeConfig;
  } {
    return {
      running: this.running,
      lastSyncTime: this.lastSyncTime,
      config: this.config,
    };
  }
}

/**
 * Create and configure an AAR-PersonaCore bridge
 */
export function createAARPersonaBridge(
  config?: Partial<AARPersonaBridgeConfig>,
): AARPersonaBridge {
  return new AARPersonaBridge(config);
}
