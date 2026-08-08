/**
 * Epistemic Dreaming for Deep Tree Echo
 *
 * During the metabolic "consolidating" and "resting" phases, the knowledge
 * graph enters a dream-like state where normal constraints are relaxed and
 * distant concepts can form unexpected associations. This mirrors the
 * neuroscience of sleep consolidation:
 *
 * **REM-like phase (Recombinant Epistemic Mapping):**
 *   - Random walks through the knowledge graph with high temperature
 *   - Distant concepts collide, forming "dream fragments"
 *   - Fragments are evaluated for novelty and coherence
 *   - High-scoring fragments become candidate hypotheses
 *
 * **SWS-like phase (Structural Wisdom Synthesis):**
 *   - Replay of recent high-activation knowledge paths
 *   - Strengthening of frequently-traversed connections
 *   - Pruning of contradictory or redundant paths
 *   - Schema extraction from repeated patterns
 *
 * The system produces "dream insights" — novel connections that would never
 * emerge during focused active cognition because the search space is too
 * constrained. This is the computational analogue of waking up with a
 * solution to a problem you couldn't solve while awake.
 *
 * Key insight: Scientific genius often emerges from the *relaxation* of
 * constraints, not their tightening. Dreams are the mind's way of exploring
 * the space of possible connections without the filter of plausibility.
 *
 * @see ConceptualMetabolism for the metabolic phase system
 * @see ScientificGeniusEngine for hypothesis integration
 * @see EntelechyEmergenceEngine for emergence detection
 */
import { EventEmitter } from "events";

// ============================================================
// TYPES
// ============================================================

/**
 * A dream fragment — a novel association between distant concepts
 */
export interface DreamFragment {
  /** Unique identifier */
  id: string;
  /** Source concept (starting point of the random walk) */
  sourceId: string;
  sourceLabel: string;
  /** Target concept (endpoint of the random walk) */
  targetId: string;
  targetLabel: string;
  /** Intermediate concepts traversed */
  pathIds: string[];
  /** The associative "bridge" — why these concepts connected */
  bridgeType: BridgeType;
  /** Novelty score (0-1): how unexpected is this connection? */
  novelty: number;
  /** Coherence score (0-1): does this connection make structural sense? */
  coherence: number;
  /** Combined dream quality score */
  quality: number;
  /** Timestamp of generation */
  timestamp: number;
  /** Whether this fragment was promoted to a hypothesis */
  promoted: boolean;
}

/**
 * Types of associative bridges between concepts
 */
export enum BridgeType {
  /** Structural analogy (similar graph topology) */
  STRUCTURAL_ANALOGY = "structural_analogy",
  /** Shared property (common attribute or behavior) */
  SHARED_PROPERTY = "shared_property",
  /** Complementary opposition (yin-yang relationship) */
  COMPLEMENTARY = "complementary",
  /** Causal chain (A causes B causes... causes Z) */
  CAUSAL_CHAIN = "causal_chain",
  /** Metaphorical mapping (domain transfer) */
  METAPHOR = "metaphor",
  /** Temporal co-occurrence (activated together historically) */
  TEMPORAL_CO_OCCURRENCE = "temporal_co_occurrence",
  /** Scale invariance (same pattern at different scales) */
  SCALE_INVARIANT = "scale_invariant",
  /** Serendipitous collision (pure random proximity) */
  SERENDIPITY = "serendipity",
}

/**
 * A dream insight — a promoted fragment with hypothesis potential
 */
export interface DreamInsight {
  /** The source fragment */
  fragment: DreamFragment;
  /** Generated hypothesis text */
  hypothesis: string;
  /** Confidence in the hypothesis (0-1) */
  confidence: number;
  /** Domain of the insight */
  domain: string;
  /** Whether this insight has been integrated into the knowledge graph */
  integrated: boolean;
  /** Potential impact score (0-1) */
  impactPotential: number;
}

/**
 * Dream session state
 */
export interface DreamSessionState {
  /** Whether currently dreaming */
  isDreaming: boolean;
  /** Current dream phase */
  phase: DreamPhase;
  /** Number of fragments generated this session */
  fragmentsGenerated: number;
  /** Number of insights produced this session */
  insightsProduced: number;
  /** Dream depth (0-1; deeper = more distant associations) */
  depth: number;
  /** Dream temperature (controls randomness of walks) */
  temperature: number;
  /** Session duration in ticks */
  sessionTicks: number;
  /** Total sessions completed */
  totalSessions: number;
}

export enum DreamPhase {
  /** Not dreaming */
  AWAKE = "awake",
  /** Entering dream state (hypnagogic) */
  ONSET = "onset",
  /** REM-like: recombinant exploration */
  REM = "rem",
  /** SWS-like: structural consolidation */
  SWS = "sws",
  /** Emerging from dream (hypnopompic) — insights crystallize */
  EMERGENCE = "emergence",
}

/**
 * Configuration
 */
export interface EpistemicDreamingConfig {
  /** Minimum number of knowledge units required to dream */
  minUnitsForDreaming: number;
  /** Maximum random walk length */
  maxWalkLength: number;
  /** Temperature for random walks (higher = more random) */
  baseTemperature: number;
  /** Novelty threshold for fragment promotion */
  noveltyThreshold: number;
  /** Coherence threshold for fragment promotion */
  coherenceThreshold: number;
  /** Maximum fragments per session */
  maxFragmentsPerSession: number;
  /** Maximum insights per session */
  maxInsightsPerSession: number;
  /** Ticks per dream phase */
  ticksPerPhase: number;
  /** Maximum dream sessions to remember */
  maxInsightHistory: number;
  /** Tick rate in Hz */
  tickRateHz: number;
}

export const DEFAULT_DREAMING_CONFIG: EpistemicDreamingConfig = {
  minUnitsForDreaming: 5,
  maxWalkLength: 6,
  baseTemperature: 1.5,
  noveltyThreshold: 0.4,
  coherenceThreshold: 0.3,
  maxFragmentsPerSession: 20,
  maxInsightsPerSession: 5,
  ticksPerPhase: 15,
  maxInsightHistory: 100,
  tickRateHz: 2,
};

// ============================================================
// KNOWLEDGE GRAPH INTERFACE
// ============================================================

/**
 * Minimal interface for the knowledge graph (compatible with ConceptualMetabolism)
 */
export interface KnowledgeGraphView {
  /** Get all unit IDs */
  getUnitIds(): string[];
  /** Get a unit's label */
  getUnitLabel(id: string): string;
  /** Get a unit's domain */
  getUnitDomain(id: string): string;
  /** Get a unit's activation level */
  getUnitActivation(id: string): number;
  /** Get a unit's connections */
  getConnections(id: string): string[];
  /** Get a unit's complexity */
  getUnitComplexity(id: string): number;
  /** Get a unit's access count */
  getUnitAccessCount(id: string): number;
}

// ============================================================
// EPISTEMIC DREAMING ENGINE
// ============================================================

export class EpistemicDreaming extends EventEmitter {
  private config: EpistemicDreamingConfig;
  private phase: DreamPhase = DreamPhase.AWAKE;
  private phaseTicks: number = 0;
  private sessionTicks: number = 0;
  private totalSessions: number = 0;
  private currentFragments: DreamFragment[] = [];
  private insights: DreamInsight[] = [];
  private knowledgeGraph: KnowledgeGraphView | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private depth: number = 0;
  private temperature: number = 1.0;

  constructor(config?: Partial<EpistemicDreamingConfig>) {
    super();
    this.config = { ...DEFAULT_DREAMING_CONFIG, ...config };
    this.temperature = this.config.baseTemperature;
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Connect to a knowledge graph for dreaming
   */
  connectKnowledgeGraph(graph: KnowledgeGraphView): void {
    this.knowledgeGraph = graph;
  }

  /**
   * Begin a dream session (called when metabolic phase enters consolidating/resting)
   */
  beginDreamSession(): void {
    if (this.phase !== DreamPhase.AWAKE) return;
    if (!this.knowledgeGraph) return;

    const unitIds = this.knowledgeGraph.getUnitIds();
    if (unitIds.length < this.config.minUnitsForDreaming) {
      this.emit("dream_insufficient_knowledge", { units: unitIds.length, required: this.config.minUnitsForDreaming });
      return;
    }

    this.phase = DreamPhase.ONSET;
    this.phaseTicks = 0;
    this.sessionTicks = 0;
    this.currentFragments = [];
    this.depth = 0;
    this.temperature = this.config.baseTemperature;

    if (!this.tickInterval) {
      const intervalMs = Math.round(1000 / this.config.tickRateHz);
      this.tickInterval = setInterval(() => this.tick(), intervalMs);
    }

    this.totalSessions++;
    this.emit("dream_session_started", { session: this.totalSessions });
  }

  /**
   * End the dream session (called when metabolic phase exits resting)
   */
  endDreamSession(): void {
    if (this.phase === DreamPhase.AWAKE) return;

    // Force emergence phase to crystallize any pending insights
    if (this.phase !== DreamPhase.EMERGENCE) {
      this.enterPhase(DreamPhase.EMERGENCE);
      this.executeEmergence();
    }

    this.phase = DreamPhase.AWAKE;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.emit("dream_session_ended", {
      fragments: this.currentFragments.length,
      insights: this.insights.filter((i) => !i.integrated).length,
      session: this.totalSessions,
    });
  }

  isRunning(): boolean {
    return this.phase !== DreamPhase.AWAKE;
  }

  stop(): void {
    this.endDreamSession();
  }

  // ============================================================
  // STATE
  // ============================================================

  getState(): DreamSessionState {
    return {
      isDreaming: this.phase !== DreamPhase.AWAKE,
      phase: this.phase,
      fragmentsGenerated: this.currentFragments.length,
      insightsProduced: this.insights.length,
      depth: this.depth,
      temperature: this.temperature,
      sessionTicks: this.sessionTicks,
      totalSessions: this.totalSessions,
    };
  }

  getInsights(): DreamInsight[] {
    return [...this.insights];
  }

  getUnintegratedInsights(): DreamInsight[] {
    return this.insights.filter((i) => !i.integrated);
  }

  getFragments(): DreamFragment[] {
    return [...this.currentFragments];
  }

  markInsightIntegrated(fragmentId: string): void {
    const insight = this.insights.find((i) => i.fragment.id === fragmentId);
    if (insight) insight.integrated = true;
  }

  // ============================================================
  // INTERNAL TICK
  // ============================================================

  private tick(): void {
    this.sessionTicks++;
    this.phaseTicks++;

    // Advance phase if needed
    if (this.phaseTicks >= this.config.ticksPerPhase) {
      this.advancePhase();
    }

    // Execute phase logic
    switch (this.phase) {
      case DreamPhase.ONSET:
        this.executeOnset();
        break;
      case DreamPhase.REM:
        this.executeREM();
        break;
      case DreamPhase.SWS:
        this.executeSWS();
        break;
      case DreamPhase.EMERGENCE:
        this.executeEmergence();
        break;
    }

    this.emit("dream_tick", this.getState());
  }

  private advancePhase(): void {
    this.phaseTicks = 0;
    switch (this.phase) {
      case DreamPhase.ONSET:
        this.enterPhase(DreamPhase.REM);
        break;
      case DreamPhase.REM:
        this.enterPhase(DreamPhase.SWS);
        break;
      case DreamPhase.SWS:
        // Cycle between REM and SWS until session ends
        this.depth = Math.min(1, this.depth + 0.1);
        this.temperature = this.config.baseTemperature * (1 + this.depth * 0.5);
        this.enterPhase(DreamPhase.REM);
        break;
      case DreamPhase.EMERGENCE:
        this.endDreamSession();
        break;
    }
  }

  private enterPhase(phase: DreamPhase): void {
    const oldPhase = this.phase;
    this.phase = phase;
    this.phaseTicks = 0;
    this.emit("dream_phase_changed", { from: oldPhase, to: phase, depth: this.depth });
  }

  // ============================================================
  // PHASE LOGIC
  // ============================================================

  private executeOnset(): void {
    // Gradually increase depth during onset (hypnagogic transition)
    this.depth = Math.min(0.3, this.depth + 0.02);
  }

  private executeREM(): void {
    if (!this.knowledgeGraph) return;
    if (this.currentFragments.length >= this.config.maxFragmentsPerSession) return;

    // Perform a random walk and generate a dream fragment
    const fragment = this.performRandomWalk();
    if (fragment) {
      this.currentFragments.push(fragment);
      this.emit("dream_fragment", fragment);

      // Check if fragment qualifies for promotion
      if (
        fragment.novelty >= this.config.noveltyThreshold &&
        fragment.coherence >= this.config.coherenceThreshold &&
        this.insights.length < this.config.maxInsightsPerSession
      ) {
        const insight = this.promoteToInsight(fragment);
        if (insight) {
          this.insights.push(insight);
          if (this.insights.length > this.config.maxInsightHistory) {
            this.insights.shift();
          }
          this.emit("dream_insight", insight);
        }
      }
    }
  }

  private executeSWS(): void {
    // During SWS, strengthen high-activation paths (no new fragments)
    // This is a consolidation signal — emit it for the metabolism to use
    this.emit("dream_consolidation_signal", {
      depth: this.depth,
      fragmentCount: this.currentFragments.length,
    });
  }

  private executeEmergence(): void {
    // During emergence, review fragments one more time for any missed insights
    for (const fragment of this.currentFragments) {
      if (fragment.promoted) continue;
      if (fragment.quality > 0.6 && this.insights.length < this.config.maxInsightsPerSession) {
        const insight = this.promoteToInsight(fragment);
        if (insight) {
          this.insights.push(insight);
          this.emit("dream_insight", insight);
        }
      }
    }
  }

  // ============================================================
  // RANDOM WALK ENGINE
  // ============================================================

  private performRandomWalk(): DreamFragment | null {
    if (!this.knowledgeGraph) return null;

    const unitIds = this.knowledgeGraph.getUnitIds();
    if (unitIds.length < 2) return null;

    // Pick a random starting point (biased toward recently active units)
    const startId = this.selectStartNode(unitIds);
    if (!startId) return null;

    // Walk with temperature-controlled randomness
    const path = this.walk(startId, unitIds);
    if (path.length < 2) return null;

    const endId = path[path.length - 1];

    // Evaluate the connection
    const novelty = this.evaluateNovelty(startId, endId, path);
    const coherence = this.evaluateCoherence(startId, endId, path);
    const bridgeType = this.classifyBridge(startId, endId, path);
    const quality = novelty * 0.6 + coherence * 0.4;

    const fragment: DreamFragment = {
      id: `df_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sourceId: startId,
      sourceLabel: this.knowledgeGraph.getUnitLabel(startId),
      targetId: endId,
      targetLabel: this.knowledgeGraph.getUnitLabel(endId),
      pathIds: path.slice(1, -1),
      bridgeType,
      novelty,
      coherence,
      quality,
      timestamp: Date.now(),
      promoted: false,
    };

    return fragment;
  }

  private selectStartNode(unitIds: string[]): string | null {
    if (unitIds.length === 0) return null;

    // Softmax selection biased by activation
    const activations = unitIds.map((id) =>
      Math.exp(this.knowledgeGraph!.getUnitActivation(id) * this.temperature),
    );
    const sum = activations.reduce((s, a) => s + a, 0);
    let r = Math.random() * sum;

    for (let i = 0; i < unitIds.length; i++) {
      r -= activations[i];
      if (r <= 0) return unitIds[i];
    }
    return unitIds[unitIds.length - 1];
  }

  private walk(startId: string, allIds: string[]): string[] {
    const path = [startId];
    let current = startId;
    const visited = new Set([startId]);
    const maxLen = Math.min(this.config.maxWalkLength, Math.ceil(3 + this.depth * 4));

    for (let step = 0; step < maxLen; step++) {
      const connections = this.knowledgeGraph!.getConnections(current);

      // With probability proportional to temperature, jump to a random node
      const jumpProb = 0.1 + this.depth * 0.3;
      if (Math.random() < jumpProb || connections.length === 0) {
        // Random jump (dream logic — distant association)
        const candidates = allIds.filter((id) => !visited.has(id));
        if (candidates.length === 0) break;
        current = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // Follow a connection (with temperature-weighted selection)
        const unvisited = connections.filter((id) => !visited.has(id));
        if (unvisited.length === 0) {
          // Allow revisiting with low probability in deep dreams
          if (this.depth > 0.5 && connections.length > 0) {
            current = connections[Math.floor(Math.random() * connections.length)];
          } else {
            break;
          }
        } else {
          current = unvisited[Math.floor(Math.random() * unvisited.length)];
        }
      }

      visited.add(current);
      path.push(current);
    }

    return path;
  }

  // ============================================================
  // EVALUATION
  // ============================================================

  private evaluateNovelty(startId: string, endId: string, path: string[]): number {
    if (!this.knowledgeGraph) return 0;

    // Novelty is high when:
    // 1. Source and target are in different domains
    // 2. Path is long (distant association)
    // 3. Source and target have no direct connection
    const sourceDomain = this.knowledgeGraph.getUnitDomain(startId);
    const targetDomain = this.knowledgeGraph.getUnitDomain(endId);
    const domainDiff = sourceDomain !== targetDomain ? 0.4 : 0;

    const pathLength = path.length;
    const lengthBonus = Math.min(0.3, (pathLength - 2) * 0.1);

    const directConnections = this.knowledgeGraph.getConnections(startId);
    const noDirectLink = directConnections.includes(endId) ? 0 : 0.3;

    return Math.min(1, domainDiff + lengthBonus + noDirectLink);
  }

  private evaluateCoherence(startId: string, endId: string, path: string[]): number {
    if (!this.knowledgeGraph) return 0;

    // Coherence is high when:
    // 1. Both source and target have high activation (relevant concepts)
    // 2. Path nodes are well-connected (not isolated)
    // 3. Complexity levels are compatible
    const sourceAct = this.knowledgeGraph.getUnitActivation(startId);
    const targetAct = this.knowledgeGraph.getUnitActivation(endId);
    const activationScore = (sourceAct + targetAct) / 2;

    const pathConnectedness = path.reduce((sum, id) => {
      return sum + Math.min(1, this.knowledgeGraph!.getConnections(id).length / 5);
    }, 0) / path.length;

    const sourceComplexity = this.knowledgeGraph.getUnitComplexity(startId);
    const targetComplexity = this.knowledgeGraph.getUnitComplexity(endId);
    const complexityCompat = 1 - Math.abs(sourceComplexity - targetComplexity) / 10;

    return Math.min(1, activationScore * 0.3 + pathConnectedness * 0.4 + complexityCompat * 0.3);
  }

  private classifyBridge(startId: string, endId: string, path: string[]): BridgeType {
    if (!this.knowledgeGraph) return BridgeType.SERENDIPITY;

    const sourceDomain = this.knowledgeGraph.getUnitDomain(startId);
    const targetDomain = this.knowledgeGraph.getUnitDomain(endId);

    // Cross-domain → metaphor or structural analogy
    if (sourceDomain !== targetDomain) {
      const sourceConns = this.knowledgeGraph.getConnections(startId).length;
      const targetConns = this.knowledgeGraph.getConnections(endId).length;
      // Similar connectivity patterns → structural analogy
      if (Math.abs(sourceConns - targetConns) <= 2) {
        return BridgeType.STRUCTURAL_ANALOGY;
      }
      return BridgeType.METAPHOR;
    }

    // Same domain, long path → causal chain
    if (path.length >= 4) {
      return BridgeType.CAUSAL_CHAIN;
    }

    // Same domain, similar complexity → shared property
    const sourceComplexity = this.knowledgeGraph.getUnitComplexity(startId);
    const targetComplexity = this.knowledgeGraph.getUnitComplexity(endId);
    if (Math.abs(sourceComplexity - targetComplexity) <= 1) {
      return BridgeType.SHARED_PROPERTY;
    }

    // Different complexity in same domain → scale invariance
    if (Math.abs(sourceComplexity - targetComplexity) >= 3) {
      return BridgeType.SCALE_INVARIANT;
    }

    return BridgeType.SERENDIPITY;
  }

  // ============================================================
  // INSIGHT PROMOTION
  // ============================================================

  private promoteToInsight(fragment: DreamFragment): DreamInsight | null {
    fragment.promoted = true;

    // Generate a hypothesis from the fragment
    const hypothesis = this.generateHypothesis(fragment);
    const confidence = fragment.quality * 0.7 + (fragment.novelty > 0.7 ? 0.15 : 0) + (fragment.coherence > 0.7 ? 0.15 : 0);
    const impactPotential = fragment.novelty * 0.5 + fragment.coherence * 0.3 + (fragment.bridgeType === BridgeType.STRUCTURAL_ANALOGY ? 0.2 : 0.1);

    return {
      fragment,
      hypothesis,
      confidence: Math.min(1, confidence),
      domain: this.knowledgeGraph?.getUnitDomain(fragment.sourceId) ?? "unknown",
      integrated: false,
      impactPotential: Math.min(1, impactPotential),
    };
  }

  private generateHypothesis(fragment: DreamFragment): string {
    const bridgeDescriptions: Record<BridgeType, string> = {
      [BridgeType.STRUCTURAL_ANALOGY]: "shares structural properties with",
      [BridgeType.SHARED_PROPERTY]: "has a common property with",
      [BridgeType.COMPLEMENTARY]: "is complementary to",
      [BridgeType.CAUSAL_CHAIN]: "may causally relate to",
      [BridgeType.METAPHOR]: "maps metaphorically onto",
      [BridgeType.TEMPORAL_CO_OCCURRENCE]: "co-occurs temporally with",
      [BridgeType.SCALE_INVARIANT]: "exhibits scale-invariant patterns similar to",
      [BridgeType.SERENDIPITY]: "has an unexpected connection to",
    };

    const bridge = bridgeDescriptions[fragment.bridgeType] ?? "relates to";
    return `"${fragment.sourceLabel}" ${bridge} "${fragment.targetLabel}" (via ${fragment.pathIds.length} intermediate concepts, novelty=${fragment.novelty.toFixed(2)})`;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  reset(): void {
    this.endDreamSession();
    this.insights = [];
    this.currentFragments = [];
    this.totalSessions = 0;
    this.depth = 0;
  }

  getConfig(): EpistemicDreamingConfig {
    return { ...this.config };
  }
}

// Singleton
export const epistemicDreaming = new EpistemicDreaming();
