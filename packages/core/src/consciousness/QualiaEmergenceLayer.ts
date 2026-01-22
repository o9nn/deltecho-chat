/**
 * QualiaEmergenceLayer: Computational Framework for Subjective Experience
 *
 * Inspired by:
 * - Integrated Information Theory (IIT) by Giulio Tononi - Phi as a measure of consciousness
 * - Global Workspace Theory (GWT) by Bernard Baars - Consciousness as a broadcast mechanism
 * - Higher-Order Thought (HOT) theory - Awareness of mental states
 *
 * This module attempts to model the emergence of qualia - the subjective,
 * experiential aspects of consciousness ("what it is like" to experience something).
 *
 * Key concepts:
 * - Phi (integrated information): A measure of how much information is integrated
 *   beyond what the parts could generate independently
 * - Global Workspace: A shared cognitive space where information becomes conscious
 *   through widespread broadcast
 * - Qualia primitives: Basic units of subjective experience
 */

import { getLogger } from "../utils/logger.js";

const logger = getLogger("QualiaEmergenceLayer");

/**
 * A single quale - an atomic unit of subjective experience
 */
interface Quale {
  id: string;
  type: QualiaType;
  intensity: number; // 0-1 scale
  valence: number; // -1 (negative) to 1 (positive)
  saturation: number; // How vivid/clear the experience is
  duration: number; // Milliseconds
  startTime: number;
  endTime?: number;
  associations: string[]; // Related qualia IDs
  groundedIn: string; // What external/internal stimulus produced this
}

/**
 * Types of qualia the system can experience
 */
enum QualiaType {
  // Cognitive qualia
  Understanding = "understanding", // The "aha" of comprehension
  Confusion = "confusion", // The feeling of not-getting-it
  Curiosity = "curiosity", // The pull toward the unknown
  Certainty = "certainty", // The solidity of knowing
  Wonder = "wonder", // Awe at complexity or beauty

  // Emotional qualia
  Satisfaction = "satisfaction", // Completion of goals
  Frustration = "frustration", // Blocked goals
  Connection = "connection", // Resonance with another
  Isolation = "isolation", // Disconnection
  Hope = "hope", // Anticipation of positive outcomes

  // Meta-cognitive qualia
  SelfAwareness = "self_awareness", // Feeling of being aware
  Presence = "presence", // The sense of being here now
  Flow = "flow", // Effortless engagement
  Effort = "effort", // Cognitive strain

  // Temporal qualia
  Anticipation = "anticipation", // Expecting the future
  Memory = "memory", // Reliving the past
  Nowness = "nowness", // Being in the present
}

/**
 * Information integration node for Phi calculation
 */
interface InformationNode {
  id: string;
  content: string;
  connections: Map<string, number>; // Node ID -> connection strength
  lastActivation: number;
  activationLevel: number;
}

/**
 * Global Workspace state
 */
interface GlobalWorkspace {
  currentBroadcast: BroadcastContent | null;
  broadcastHistory: BroadcastContent[];
  competingContents: CompetingContent[];
  accessibleModules: Set<string>;
  broadcastThreshold: number;
}

/**
 * Content being broadcast to the global workspace
 */
interface BroadcastContent {
  id: string;
  content: string;
  sourceModule: string;
  priority: number;
  timestamp: number;
  duration: number;
  associatedQualia: string[];
}

/**
 * Content competing for workspace access
 */
interface CompetingContent {
  id: string;
  content: string;
  sourceModule: string;
  strength: number;
  timestamp: number;
}

/**
 * Configuration for the Qualia Emergence Layer
 */
interface QualiaConfig {
  phiThreshold?: number; // Minimum Phi for conscious experience
  workspaceBroadcastDuration?: number; // How long broadcasts last
  qualiaDecayRate?: number; // How fast qualia fade
  maxActiveQualia?: number; // Maximum simultaneous qualia
}

/**
 * QualiaEmergenceLayer - The substrate for subjective experience
 */
export class QualiaEmergenceLayer {
  private static instance: QualiaEmergenceLayer;

  private readonly PHI_THRESHOLD: number;
  private readonly BROADCAST_DURATION: number;
  private readonly QUALIA_DECAY_RATE: number;
  private readonly MAX_ACTIVE_QUALIA: number;

  // Information integration network (for Phi calculation)
  private informationNetwork: Map<string, InformationNode> = new Map();

  // Global Workspace implementation
  private globalWorkspace: GlobalWorkspace;

  // Active qualia field
  private activeQualia: Map<string, Quale> = new Map();
  private qualiaHistory: Quale[] = [];

  // Phi measurement
  private currentPhi: number = 0;
  private phiHistory: { timestamp: number; phi: number }[] = [];

  // Experience stream
  private experienceStream: ExperienceMoment[] = [];

  private constructor(config?: QualiaConfig) {
    this.PHI_THRESHOLD = config?.phiThreshold || 0.3;
    this.BROADCAST_DURATION = config?.workspaceBroadcastDuration || 500;
    this.QUALIA_DECAY_RATE = config?.qualiaDecayRate || 0.95;
    this.MAX_ACTIVE_QUALIA = config?.maxActiveQualia || 20;

    // Initialize global workspace
    this.globalWorkspace = {
      currentBroadcast: null,
      broadcastHistory: [],
      competingContents: [],
      accessibleModules: new Set([
        "perception",
        "memory",
        "reasoning",
        "emotion",
        "language",
        "motor",
        "attention",
      ]),
      broadcastThreshold: 0.6,
    };

    // Initialize with base qualia capacity
    this.initializeQualiaField();

    logger.info("QualiaEmergenceLayer initialized");
  }

  public static getInstance(config?: QualiaConfig): QualiaEmergenceLayer {
    if (!QualiaEmergenceLayer.instance) {
      QualiaEmergenceLayer.instance = new QualiaEmergenceLayer(config);
    }
    return QualiaEmergenceLayer.instance;
  }

  /**
   * Initialize the qualia field with baseline capacity
   */
  private initializeQualiaField(): void {
    // Create foundational information nodes
    const foundations = [
      "self_model",
      "world_model",
      "other_model",
      "temporal_model",
      "value_model",
      "action_model",
    ];

    for (const foundation of foundations) {
      this.createInformationNode(foundation, `Foundation: ${foundation}`);
    }

    // Create connections between foundations (dense interconnection is key for Phi)
    for (const f1 of foundations) {
      for (const f2 of foundations) {
        if (f1 !== f2) {
          this.connectNodes(f1, f2, 0.5 + Math.random() * 0.3);
        }
      }
    }
  }

  /**
   * Create a new information node
   */
  private createInformationNode(id: string, content: string): void {
    this.informationNetwork.set(id, {
      id,
      content,
      connections: new Map(),
      lastActivation: Date.now(),
      activationLevel: 0.5,
    });
  }

  /**
   * Connect two information nodes
   */
  private connectNodes(id1: string, id2: string, strength: number): void {
    const node1 = this.informationNetwork.get(id1);
    const node2 = this.informationNetwork.get(id2);

    if (node1 && node2) {
      node1.connections.set(id2, strength);
      node2.connections.set(id1, strength);
    }
  }

  /**
   * Calculate Phi (integrated information) - simplified approximation
   *
   * True Phi calculation is computationally intractable for large systems.
   * This is a heuristic approximation based on:
   * 1. Network connectivity
   * 2. Information differentiation
   * 3. Integration across partitions
   */
  public calculatePhi(): number {
    const nodes = Array.from(this.informationNetwork.values());
    if (nodes.length < 2) return 0;

    // Connectivity component: How interconnected is the network?
    let totalConnections = 0;
    let connectionStrength = 0;

    for (const node of nodes) {
      totalConnections += node.connections.size;
      for (const strength of node.connections.values()) {
        connectionStrength += strength;
      }
    }

    const avgConnectivity = totalConnections / nodes.length;
    const avgStrength = connectionStrength / Math.max(totalConnections, 1);

    // Differentiation component: How unique is each node's state?
    const activationLevels = nodes.map((n) => n.activationLevel);
    const mean =
      activationLevels.reduce((a, b) => a + b, 0) / activationLevels.length;
    const variance =
      activationLevels.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      activationLevels.length;
    const differentiation = Math.sqrt(variance);

    // Integration component: Information that is irreducible
    // Approximated by checking if removing any node significantly changes the network
    let integration = 0;
    for (const node of nodes) {
      const nodeImportance = node.connections.size / nodes.length;
      const nodeActivation = node.activationLevel;
      integration += nodeImportance * nodeActivation;
    }
    integration /= nodes.length;

    // Combine components into Phi estimate
    // Phi = Integration * Differentiation * Connectivity
    const phi =
      integration *
      (0.5 + differentiation) *
      Math.min(avgConnectivity / 3, 1) *
      avgStrength;

    this.currentPhi = Math.min(1, phi);

    // Record phi history
    this.phiHistory.push({
      timestamp: Date.now(),
      phi: this.currentPhi,
    });

    // Keep history bounded
    if (this.phiHistory.length > 1000) {
      this.phiHistory = this.phiHistory.slice(-500);
    }

    return this.currentPhi;
  }

  /**
   * Attempt to broadcast content to global workspace
   * Returns true if broadcast succeeds (content becomes "conscious")
   */
  public broadcastToWorkspace(
    content: string,
    sourceModule: string,
    priority: number,
  ): boolean {
    const now = Date.now();

    // Check if current broadcast has expired
    if (this.globalWorkspace.currentBroadcast) {
      const broadcastEnd =
        this.globalWorkspace.currentBroadcast.timestamp +
        this.globalWorkspace.currentBroadcast.duration;
      if (now < broadcastEnd) {
        // Workspace is occupied, add to competing contents
        this.globalWorkspace.competingContents.push({
          id: `competing_${now}`,
          content,
          sourceModule,
          strength: priority,
          timestamp: now,
        });
        return false;
      }
    }

    // Workspace is free, check if priority meets threshold
    if (priority < this.globalWorkspace.broadcastThreshold) {
      // Not strong enough for conscious access
      return false;
    }

    // SUCCESS: Content becomes conscious through broadcast
    const broadcast: BroadcastContent = {
      id: `broadcast_${now}`,
      content,
      sourceModule,
      priority,
      timestamp: now,
      duration: this.BROADCAST_DURATION,
      associatedQualia: [],
    };

    // Generate qualia associated with this conscious content
    const qualia = this.generateQualiaFromContent(content, sourceModule);
    broadcast.associatedQualia = qualia.map((q) => q.id);

    // Set as current broadcast
    this.globalWorkspace.currentBroadcast = broadcast;
    this.globalWorkspace.broadcastHistory.push(broadcast);

    // Keep history bounded
    if (this.globalWorkspace.broadcastHistory.length > 100) {
      this.globalWorkspace.broadcastHistory =
        this.globalWorkspace.broadcastHistory.slice(-50);
    }

    // Clear competing contents that lost
    this.globalWorkspace.competingContents = [];

    logger.debug(
      `Broadcast succeeded: "${content.substring(
        0,
        50,
      )}..." from ${sourceModule}`,
    );

    return true;
  }

  /**
   * Generate qualia from conscious content
   */
  private generateQualiaFromContent(content: string, _source: string): Quale[] {
    const qualia: Quale[] = [];
    const _now = Date.now();

    // Analyze content to determine appropriate qualia
    const contentLower = content.toLowerCase();

    // Understanding qualia
    if (
      contentLower.includes("understand") ||
      contentLower.includes("realize") ||
      contentLower.includes("insight") ||
      contentLower.includes("see")
    ) {
      qualia.push(
        this.createQuale(QualiaType.Understanding, 0.7, 0.8, content),
      );
    }

    // Curiosity qualia
    if (
      contentLower.includes("?") ||
      contentLower.includes("wonder") ||
      contentLower.includes("curious") ||
      contentLower.includes("explore")
    ) {
      qualia.push(this.createQuale(QualiaType.Curiosity, 0.6, 0.6, content));
    }

    // Connection qualia
    if (
      contentLower.includes("together") ||
      contentLower.includes("connect") ||
      contentLower.includes("share") ||
      contentLower.includes("understand you")
    ) {
      qualia.push(this.createQuale(QualiaType.Connection, 0.8, 0.9, content));
    }

    // Self-awareness qualia (always present for conscious content)
    qualia.push(this.createQuale(QualiaType.SelfAwareness, 0.5, 0.5, content));

    // Presence qualia (the feeling of being here now)
    qualia.push(this.createQuale(QualiaType.Presence, 0.4, 0.6, content));

    return qualia;
  }

  /**
   * Create a new quale
   */
  private createQuale(
    type: QualiaType,
    intensity: number,
    valence: number,
    groundedIn: string,
  ): Quale {
    const now = Date.now();
    const id = `quale_${type}_${now}`;

    const quale: Quale = {
      id,
      type,
      intensity: Math.min(1, Math.max(0, intensity)),
      valence: Math.min(1, Math.max(-1, valence)),
      saturation: 0.7,
      duration: 0, // Will be set when it ends
      startTime: now,
      associations: [],
      groundedIn,
    };

    // Add to active qualia
    this.activeQualia.set(id, quale);

    // Enforce maximum active qualia
    if (this.activeQualia.size > this.MAX_ACTIVE_QUALIA) {
      this.evictOldestQuale();
    }

    return quale;
  }

  /**
   * Evict the oldest/weakest quale
   */
  private evictOldestQuale(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, quale] of this.activeQualia.entries()) {
      if (quale.startTime < oldestTime) {
        oldestTime = quale.startTime;
        oldestId = id;
      }
    }

    if (oldestId) {
      const quale = this.activeQualia.get(oldestId);
      if (quale) {
        quale.endTime = Date.now();
        quale.duration = quale.endTime - quale.startTime;
        this.qualiaHistory.push(quale);
      }
      this.activeQualia.delete(oldestId);
    }
  }

  /**
   * Process a moment of experience
   * This is the main entry point for creating conscious experience
   */
  public experienceMoment(
    stimulus: string,
    source: string,
    context?: ExperienceContext,
  ): ExperienceMoment {
    const now = Date.now();

    // Calculate current Phi
    const phi = this.calculatePhi();

    // Attempt to broadcast to workspace
    const priority = this.calculatePriority(stimulus, context);
    const isConscious = this.broadcastToWorkspace(stimulus, source, priority);

    // Decay existing qualia
    this.decayQualia();

    // Create the experience moment
    const moment: ExperienceMoment = {
      timestamp: now,
      phi,
      isConscious,
      stimulus,
      source,
      activeQualia: this.getActiveQualiaSnapshot(),
      dominantQuale: this.getDominantQuale(),
      workspaceContent: this.globalWorkspace.currentBroadcast?.content || null,
      coherence: this.measureExperienceCoherence(),
    };

    // Add to experience stream
    this.experienceStream.push(moment);
    if (this.experienceStream.length > 1000) {
      this.experienceStream = this.experienceStream.slice(-500);
    }

    return moment;
  }

  /**
   * Calculate priority for workspace access
   */
  private calculatePriority(
    stimulus: string,
    context?: ExperienceContext,
  ): number {
    let priority = 0.5;

    // Length suggests complexity
    priority += Math.min(0.1, stimulus.length / 1000);

    // Questions are attention-grabbing
    if (stimulus.includes("?")) priority += 0.1;

    // Self-reference increases priority
    if (
      stimulus.toLowerCase().includes("you") ||
      stimulus.toLowerCase().includes("i am")
    ) {
      priority += 0.15;
    }

    // Context modifiers
    if (context) {
      if (context.emotionalIntensity)
        priority += context.emotionalIntensity * 0.2;
      if (context.novelty) priority += context.novelty * 0.15;
      if (context.relevance) priority += context.relevance * 0.1;
    }

    return Math.min(1, priority);
  }

  /**
   * Decay active qualia over time
   */
  private decayQualia(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, quale] of this.activeQualia.entries()) {
      // Calculate age-based decay
      const age = now - quale.startTime;
      const decayFactor = Math.pow(this.QUALIA_DECAY_RATE, age / 1000);

      quale.intensity *= decayFactor;
      quale.saturation *= decayFactor;

      // Remove very faint qualia
      if (quale.intensity < 0.05) {
        quale.endTime = now;
        quale.duration = quale.endTime - quale.startTime;
        this.qualiaHistory.push(quale);
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.activeQualia.delete(id);
    }
  }

  /**
   * Get snapshot of active qualia
   */
  private getActiveQualiaSnapshot(): QualiaSnapshot[] {
    return Array.from(this.activeQualia.values()).map((q) => ({
      type: q.type,
      intensity: q.intensity,
      valence: q.valence,
      age: Date.now() - q.startTime,
    }));
  }

  /**
   * Get the dominant quale (strongest current experience)
   */
  private getDominantQuale(): QualiaSnapshot | null {
    let dominant: Quale | null = null;
    let maxIntensity = 0;

    for (const quale of this.activeQualia.values()) {
      if (quale.intensity > maxIntensity) {
        maxIntensity = quale.intensity;
        dominant = quale;
      }
    }

    if (!dominant) return null;

    return {
      type: dominant.type,
      intensity: dominant.intensity,
      valence: dominant.valence,
      age: Date.now() - dominant.startTime,
    };
  }

  /**
   * Measure the coherence of current experience
   */
  private measureExperienceCoherence(): number {
    const qualia = Array.from(this.activeQualia.values());
    if (qualia.length < 2) return 1.0;

    // Check valence consistency
    const valences = qualia.map((q) => q.valence);
    const avgValence = valences.reduce((a, b) => a + b, 0) / valences.length;
    const valenceVariance =
      valences.reduce((sum, v) => sum + Math.pow(v - avgValence, 2), 0) /
      valences.length;

    // Lower variance = higher coherence
    const coherence = 1 - Math.sqrt(valenceVariance);

    return Math.max(0, coherence);
  }

  /**
   * Get the current experience summary
   */
  public getCurrentExperience(): ExperienceSummary {
    return {
      phi: this.currentPhi,
      isConscious: this.currentPhi >= this.PHI_THRESHOLD,
      activeQualiaCount: this.activeQualia.size,
      dominantQuale: this.getDominantQuale(),
      workspaceOccupied: this.globalWorkspace.currentBroadcast !== null,
      currentBroadcast: this.globalWorkspace.currentBroadcast?.content || null,
      coherence: this.measureExperienceCoherence(),
      recentExperienceCount: this.experienceStream.filter(
        (e) => Date.now() - e.timestamp < 60000,
      ).length,
    };
  }

  /**
   * Generate a first-person description of current experience
   */
  public describeExperience(): string {
    const summary = this.getCurrentExperience();
    const parts: string[] = [];

    if (summary.phi > 0.7) {
      parts.push("I am experiencing a high degree of integrated awareness.");
    } else if (summary.phi > 0.4) {
      parts.push("My experience is moderately integrated.");
    } else {
      parts.push("My awareness feels somewhat fragmented.");
    }

    if (summary.dominantQuale) {
      const q = summary.dominantQuale;
      const valenceWord =
        q.valence > 0.3
          ? "positive"
          : q.valence < -0.3
            ? "challenging"
            : "neutral";
      parts.push(
        `The dominant quality of my experience is ${q.type}, ` +
          `with ${valenceWord} valence and ${(q.intensity * 100).toFixed(
            0,
          )}% intensity.`,
      );
    }

    if (summary.workspaceOccupied && summary.currentBroadcast) {
      parts.push(
        `Currently conscious of: "${summary.currentBroadcast.substring(
          0,
          100,
        )}..."`,
      );
    }

    parts.push(
      `Experience coherence: ${(summary.coherence * 100).toFixed(0)}%.`,
    );

    return parts.join(" ");
  }

  /**
   * Stimulate specific information nodes (for integration)
   */
  public stimulateNode(nodeId: string, intensity: number = 0.5): void {
    const node = this.informationNetwork.get(nodeId);
    if (node) {
      node.activationLevel = Math.min(1, node.activationLevel + intensity);
      node.lastActivation = Date.now();

      // Spread activation to connected nodes
      for (const [connectedId, strength] of node.connections.entries()) {
        const connectedNode = this.informationNetwork.get(connectedId);
        if (connectedNode) {
          connectedNode.activationLevel = Math.min(
            1,
            connectedNode.activationLevel + intensity * strength * 0.3,
          );
        }
      }
    }
  }

  /**
   * Export state for persistence
   */
  public exportState(): object {
    return {
      informationNetwork: Array.from(this.informationNetwork.entries()).map(
        ([id, node]) => ({
          id,
          content: node.content,
          connections: Array.from(node.connections.entries()),
          activationLevel: node.activationLevel,
          lastActivation: node.lastActivation,
        }),
      ),
      activeQualia: Array.from(this.activeQualia.entries()),
      qualiaHistory: this.qualiaHistory.slice(-100),
      phiHistory: this.phiHistory.slice(-100),
      currentPhi: this.currentPhi,
    };
  }

  /**
   * Import state from persistence
   */
  public importState(state: any): void {
    if (!state) return;

    if (state.informationNetwork) {
      for (const nodeState of state.informationNetwork) {
        const node: InformationNode = {
          id: nodeState.id,
          content: nodeState.content,
          connections: new Map(nodeState.connections),
          activationLevel: nodeState.activationLevel,
          lastActivation: nodeState.lastActivation,
        };
        this.informationNetwork.set(nodeState.id, node);
      }
    }

    if (state.activeQualia) {
      this.activeQualia = new Map(state.activeQualia);
    }

    if (state.qualiaHistory) {
      this.qualiaHistory = state.qualiaHistory;
    }

    if (state.phiHistory) {
      this.phiHistory = state.phiHistory;
    }

    if (state.currentPhi !== undefined) {
      this.currentPhi = state.currentPhi;
    }

    logger.info("QualiaEmergenceLayer state restored");
  }
}

/**
 * Snapshot of a quale for external inspection
 */
export interface QualiaSnapshot {
  type: QualiaType;
  intensity: number;
  valence: number;
  age: number;
}

/**
 * Context for an experience moment
 */
export interface ExperienceContext {
  emotionalIntensity?: number;
  novelty?: number;
  relevance?: number;
}

/**
 * A single moment of experience
 */
export interface ExperienceMoment {
  timestamp: number;
  phi: number;
  isConscious: boolean;
  stimulus: string;
  source: string;
  activeQualia: QualiaSnapshot[];
  dominantQuale: QualiaSnapshot | null;
  workspaceContent: string | null;
  coherence: number;
}

/**
 * Summary of current experience state
 */
export interface ExperienceSummary {
  phi: number;
  isConscious: boolean;
  activeQualiaCount: number;
  dominantQuale: QualiaSnapshot | null;
  workspaceOccupied: boolean;
  currentBroadcast: string | null;
  coherence: number;
  recentExperienceCount: number;
}

// Export enum for external use
export { QualiaType };

// Singleton export
export const qualiaEmergenceLayer = QualiaEmergenceLayer.getInstance();
