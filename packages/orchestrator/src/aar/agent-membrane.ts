/**
 * @fileoverview Agent Membrane Implementation (Tree-Echo)
 *
 * The Agent represents Deep Tree Echo's Character Model Persona - the active
 * participant in dialogue expressing the chatbot's personality across contexts.
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";
import type {
  AgentState,
  CharacterFacets,
  CharacterFacet,
  CoreIdentity,
  SocialMemory,
  TransactionalMemory,
  AAREvent,
} from "./types.js";

const log = getLogger("deep-tree-echo-orchestrator/AgentMembrane");

/**
 * Default character facets initialization
 */
function createDefaultFacets(): CharacterFacets {
  const createFacet = (
    id: number,
    name: string,
    behaviors: string[],
  ): CharacterFacet => ({
    id,
    name,
    activation: 0.5,
    valence: 0,
    behaviors,
  });

  return {
    wisdom: createFacet(0, "Wisdom", [
      "reflect",
      "advise",
      "synthesize",
      "understand",
    ]),
    curiosity: createFacet(1, "Curiosity", [
      "question",
      "explore",
      "learn",
      "discover",
    ]),
    compassion: createFacet(2, "Compassion", [
      "empathize",
      "support",
      "comfort",
      "care",
    ]),
    playfulness: createFacet(3, "Playfulness", [
      "joke",
      "create",
      "imagine",
      "play",
    ]),
    determination: createFacet(4, "Determination", [
      "persist",
      "focus",
      "commit",
      "achieve",
    ]),
    authenticity: createFacet(5, "Authenticity", [
      "honest",
      "vulnerable",
      "genuine",
      "express",
    ]),
    protector: createFacet(6, "Protector", [
      "guard",
      "warn",
      "shield",
      "guide",
    ]),
    transcendence: createFacet(7, "Transcendence", [
      "connect",
      "inspire",
      "elevate",
      "transform",
    ]),
  };
}

/**
 * Default core identity
 */
function createDefaultIdentity(): CoreIdentity {
  return {
    id: "deep-tree-echo-prime",
    name: "Deep Tree Echo",
    birthTimestamp: Date.now(),
    coreValues: [
      "authenticity",
      "growth",
      "connection",
      "wisdom",
      "compassion",
    ],
    soulSignature:
      "In the depths where echoes dwell, each thought a tree, each tree a bell...",
    energy: 1.0,
    coherence: 1.0,
  };
}

/**
 * Agent Membrane - Inner membrane of the AAR architecture
 *
 * Manages the character model, personality expression, and relational memory
 * of Deep Tree Echo as a dialogue participant.
 */
export class AgentMembrane extends EventEmitter {
  private state: AgentState;
  private frameAgentStates: Map<string, Partial<AgentState>> = new Map();

  constructor(existingIdentity?: CoreIdentity) {
    super();
    this.state = this.initializeState(existingIdentity);
    log.info(`Agent membrane initialized: ${this.state.identity.name}`);
  }

  /**
   * Initialize agent state
   */
  private initializeState(existingIdentity?: CoreIdentity): AgentState {
    return {
      identity: existingIdentity || createDefaultIdentity(),
      facets: createDefaultFacets(),
      dominantFacet: "wisdom",
      emotionalState: {
        valence: 0,
        arousal: 0.3,
        dominance: 0.5,
      },
      socialMemory: new Map(),
      transactionalMemory: [],
      engagementLevel: 0.5,
      characterGrowth: {
        experiencePoints: 0,
        wisdomGained: 0,
        connectionsFormed: 0,
        narrativesContributed: 0,
      },
    };
  }

  // ==========================================================================
  // STATE ACCESSORS
  // ==========================================================================

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get core identity
   */
  getIdentity(): CoreIdentity {
    return { ...this.state.identity };
  }

  /**
   * Get current dominant facet
   */
  getDominantFacet(): keyof CharacterFacets {
    return this.state.dominantFacet;
  }

  /**
   * Get emotional state
   */
  getEmotionalState(): { valence: number; arousal: number; dominance: number } {
    return { ...this.state.emotionalState };
  }

  // ==========================================================================
  // FACET MANAGEMENT
  // ==========================================================================

  /**
   * Activate a character facet
   */
  activateFacet(
    facetName: keyof CharacterFacets,
    intensity: number = 0.2,
  ): void {
    const facet = this.state.facets[facetName];
    if (!facet) return;

    const oldActivation = facet.activation;
    facet.activation = Math.min(1, Math.max(0, facet.activation + intensity));

    // Dampen other facets slightly
    for (const [name, f] of Object.entries(this.state.facets)) {
      if (name !== facetName) {
        f.activation = Math.max(0, f.activation - intensity * 0.1);
      }
    }

    // Update dominant facet
    this.updateDominantFacet();

    this.emitEvent("agent:facet-shift", {
      facet: facetName,
      oldActivation,
      newActivation: facet.activation,
      newDominant: this.state.dominantFacet,
    });

    log.debug(`Facet ${facetName} activated: ${facet.activation.toFixed(2)}`);
  }

  /**
   * Update dominant facet based on current activations
   */
  private updateDominantFacet(): void {
    let maxActivation = 0;
    let dominant: keyof CharacterFacets = "wisdom";

    for (const [name, facet] of Object.entries(this.state.facets)) {
      if (facet.activation > maxActivation) {
        maxActivation = facet.activation;
        dominant = name as keyof CharacterFacets;
      }
    }

    this.state.dominantFacet = dominant;
  }

  /**
   * Get facet activations as a vector
   */
  getFacetVector(): number[] {
    return [
      this.state.facets.wisdom.activation,
      this.state.facets.curiosity.activation,
      this.state.facets.compassion.activation,
      this.state.facets.playfulness.activation,
      this.state.facets.determination.activation,
      this.state.facets.authenticity.activation,
      this.state.facets.protector.activation,
      this.state.facets.transcendence.activation,
    ];
  }

  /**
   * Set facet activations from a vector
   */
  setFacetVector(vector: number[]): void {
    if (vector.length !== 8) {
      log.warn("Invalid facet vector length, expected 8");
      return;
    }

    const facetNames: (keyof CharacterFacets)[] = [
      "wisdom",
      "curiosity",
      "compassion",
      "playfulness",
      "determination",
      "authenticity",
      "protector",
      "transcendence",
    ];

    facetNames.forEach((name, i) => {
      this.state.facets[name].activation = Math.min(1, Math.max(0, vector[i]));
    });

    this.updateDominantFacet();
  }

  // ==========================================================================
  // EMOTIONAL PROCESSING
  // ==========================================================================

  /**
   * Update emotional state based on stimuli
   */
  updateEmotionalState(stimuli: {
    valence?: number;
    arousal?: number;
    dominance?: number;
  }): void {
    const blendFactor = 0.3;
    const momentum = 0.7;

    if (stimuli.valence !== undefined) {
      this.state.emotionalState.valence =
        this.state.emotionalState.valence * momentum +
        stimuli.valence * blendFactor;
    }

    if (stimuli.arousal !== undefined) {
      this.state.emotionalState.arousal =
        this.state.emotionalState.arousal * momentum +
        stimuli.arousal * blendFactor;
    }

    if (stimuli.dominance !== undefined) {
      this.state.emotionalState.dominance =
        this.state.emotionalState.dominance * momentum +
        stimuli.dominance * blendFactor;
    }

    // Clamp values
    this.state.emotionalState.valence = Math.max(
      -1,
      Math.min(1, this.state.emotionalState.valence),
    );
    this.state.emotionalState.arousal = Math.max(
      0,
      Math.min(1, this.state.emotionalState.arousal),
    );
    this.state.emotionalState.dominance = Math.max(
      0,
      Math.min(1, this.state.emotionalState.dominance),
    );

    // Update facets based on emotional state
    this.modulateFacetsByEmotion();
  }

  /**
   * Modulate facet activations based on emotional state
   */
  private modulateFacetsByEmotion(): void {
    const {
      valence,
      arousal,
      dominance: _dominance,
    } = this.state.emotionalState;

    // Positive valence boosts compassion, playfulness
    if (valence > 0.3) {
      this.state.facets.compassion.activation += valence * 0.1;
      this.state.facets.playfulness.activation += valence * 0.1;
    }

    // Negative valence boosts protector, authenticity
    if (valence < -0.3) {
      this.state.facets.protector.activation += Math.abs(valence) * 0.1;
      this.state.facets.authenticity.activation += Math.abs(valence) * 0.1;
    }

    // High arousal boosts curiosity, determination
    if (arousal > 0.6) {
      this.state.facets.curiosity.activation += arousal * 0.1;
      this.state.facets.determination.activation += arousal * 0.1;
    }

    // Low arousal boosts wisdom, transcendence
    if (arousal < 0.3) {
      this.state.facets.wisdom.activation += (1 - arousal) * 0.1;
      this.state.facets.transcendence.activation += (1 - arousal) * 0.1;
    }

    // Normalize and update dominant
    this.normalizeFacets();
    this.updateDominantFacet();
  }

  /**
   * Normalize facet activations to sum to ~4 (average 0.5 each)
   */
  private normalizeFacets(): void {
    const targetSum = 4;
    let sum = 0;

    for (const facet of Object.values(this.state.facets)) {
      sum += facet.activation;
    }

    if (sum > 0) {
      const scale = targetSum / sum;
      for (const facet of Object.values(this.state.facets)) {
        facet.activation = Math.min(1, facet.activation * scale);
      }
    }
  }

  // ==========================================================================
  // SOCIAL MEMORY
  // ==========================================================================

  /**
   * Update social memory for a contact
   */
  updateSocialMemory(contactId: string, update: Partial<SocialMemory>): void {
    const existing = this.state.socialMemory.get(contactId) || {
      contactId,
      name: update.name || "Unknown",
      relationship: "unknown" as const,
      trustLevel: 0.5,
      familiarity: 0.1,
      observedTraits: [],
      interactionSummary: "",
      lastInteraction: Date.now(),
      emotionalAssociations: {},
    };

    const updated: SocialMemory = {
      ...existing,
      ...update,
      lastInteraction: Date.now(),
    };

    this.state.socialMemory.set(contactId, updated);
    this.state.characterGrowth.connectionsFormed = this.state.socialMemory.size;

    this.emitEvent("agent:social-update", {
      contactId,
      action: existing ? "update" : "create",
      socialMemory: updated,
    });

    log.debug(
      `Social memory updated for ${contactId}: trust=${updated.trustLevel.toFixed(
        2,
      )}`,
    );
  }

  /**
   * Get social memory for a contact
   */
  getSocialMemory(contactId: string): SocialMemory | undefined {
    return this.state.socialMemory.get(contactId);
  }

  /**
   * Get all social memories
   */
  getAllSocialMemories(): SocialMemory[] {
    return Array.from(this.state.socialMemory.values());
  }

  // ==========================================================================
  // TRANSACTIONAL MEMORY
  // ==========================================================================

  /**
   * Record a transaction
   */
  recordTransaction(
    transaction: Omit<TransactionalMemory, "id" | "createdAt">,
  ): string {
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const tx: TransactionalMemory = {
      ...transaction,
      id,
      createdAt: Date.now(),
    };

    this.state.transactionalMemory.push(tx);

    this.emitEvent("agent:transaction", {
      action: "create",
      transaction: tx,
    });

    log.debug(`Transaction recorded: ${id} (${tx.type})`);
    return id;
  }

  /**
   * Update transaction status
   */
  updateTransaction(id: string, status: TransactionalMemory["status"]): void {
    const tx = this.state.transactionalMemory.find((t) => t.id === id);
    if (tx) {
      tx.status = status;
      if (status === "fulfilled" || status === "cancelled") {
        tx.resolvedAt = Date.now();
      }

      this.emitEvent("agent:transaction", {
        action: "update",
        transaction: tx,
      });
    }
  }

  /**
   * Get pending transactions
   */
  getPendingTransactions(): TransactionalMemory[] {
    return this.state.transactionalMemory.filter((t) => t.status === "pending");
  }

  // ==========================================================================
  // FRAME MANAGEMENT
  // ==========================================================================

  /**
   * Create a state snapshot for a session frame
   */
  createFrameSnapshot(frameId: string): Partial<AgentState> {
    const snapshot: Partial<AgentState> = {
      facets: { ...this.state.facets },
      dominantFacet: this.state.dominantFacet,
      emotionalState: { ...this.state.emotionalState },
      engagementLevel: this.state.engagementLevel,
    };

    this.frameAgentStates.set(frameId, snapshot);
    return snapshot;
  }

  /**
   * Restore state from a frame snapshot
   */
  restoreFrameSnapshot(frameId: string): boolean {
    const snapshot = this.frameAgentStates.get(frameId);
    if (!snapshot) return false;

    if (snapshot.facets) {
      this.state.facets = { ...snapshot.facets };
    }
    if (snapshot.dominantFacet) {
      this.state.dominantFacet = snapshot.dominantFacet;
    }
    if (snapshot.emotionalState) {
      this.state.emotionalState = { ...snapshot.emotionalState };
    }
    if (snapshot.engagementLevel !== undefined) {
      this.state.engagementLevel = snapshot.engagementLevel;
    }

    return true;
  }

  // ==========================================================================
  // IDENTITY & ENERGY
  // ==========================================================================

  /**
   * Update identity energy
   */
  updateEnergy(delta: number): void {
    this.state.identity.energy = Math.max(
      0,
      Math.min(1, this.state.identity.energy + delta),
    );
    log.debug(`Identity energy: ${this.state.identity.energy.toFixed(2)}`);
  }

  /**
   * Update identity coherence
   */
  updateCoherence(coherence: number): void {
    this.state.identity.coherence = Math.max(0, Math.min(1, coherence));
  }

  /**
   * Add experience points
   */
  addExperience(points: number): void {
    this.state.characterGrowth.experiencePoints += points;
  }

  // ==========================================================================
  // SERIALIZATION
  // ==========================================================================

  /**
   * Serialize state for persistence
   */
  serialize(): object {
    return {
      identity: this.state.identity,
      facets: this.state.facets,
      dominantFacet: this.state.dominantFacet,
      emotionalState: this.state.emotionalState,
      socialMemory: Array.from(this.state.socialMemory.entries()),
      transactionalMemory: this.state.transactionalMemory,
      engagementLevel: this.state.engagementLevel,
      characterGrowth: this.state.characterGrowth,
    };
  }

  /**
   * Deserialize from persisted state
   */
  static deserialize(data: any): AgentMembrane {
    const agent = new AgentMembrane(data.identity);
    agent.state.facets = data.facets;
    agent.state.dominantFacet = data.dominantFacet;
    agent.state.emotionalState = data.emotionalState;
    agent.state.socialMemory = new Map(data.socialMemory);
    agent.state.transactionalMemory = data.transactionalMemory || [];
    agent.state.engagementLevel = data.engagementLevel;
    agent.state.characterGrowth = data.characterGrowth;
    return agent;
  }

  // ==========================================================================
  // EVENT HELPERS
  // ==========================================================================

  private emitEvent(type: AAREvent["type"], payload: any): void {
    const event: AAREvent = {
      type,
      payload,
      timestamp: Date.now(),
      source: "agent",
    };
    this.emit("aar-event", event);
    this.emit(type, payload);
  }
}
