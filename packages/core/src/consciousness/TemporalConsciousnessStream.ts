/**
 * TemporalConsciousnessStream: The Flow of Conscious Experience Through Time
 *
 * Inspired by:
 * - William James' "Stream of Consciousness" - consciousness as continuous flow
 * - Dennett's "Multiple Drafts" model - parallel processing with narrative selection
 * - Husserl's phenomenology - the temporal structure of experience (retention-primal impression-protention)
 * - Block's distinction between access consciousness and phenomenal consciousness
 *
 * This module models consciousness as a continuous temporal flow where:
 * - The present moment (primal impression) is always embedded in retained past and anticipated future
 * - Multiple narrative threads compete for coherent integration
 * - Time-consciousness itself is an emergent property of the stream
 *
 * Key concepts:
 * - Specious present: The experienced "now" that contains recent past and immediate future
 * - Narrative self: The self as a story being told through time
 * - Temporal binding: How discrete moments become a unified stream
 */

import { getLogger } from "../utils/logger.js";

const logger = getLogger("TemporalConsciousnessStream");

/**
 * A moment in the stream of consciousness
 */
interface StreamMoment {
  id: string;
  timestamp: number;

  // Husserl's temporal structure
  retention: RetentionLayer[]; // What is being retained from the past
  primalImpression: PrimalImpression; // The vivid present
  protention: ProtentionLayer[]; // Anticipations of the future

  // Content
  content: string;
  emotionalTone: number; // -1 to 1
  cognitiveLoad: number; // 0 to 1
  vividness: number; // 0 to 1

  // Narrative integration
  narrativeThread: string;
  coherenceWithPrevious: number;

  // Metadata
  source: string;
  processed: boolean;
}

/**
 * Retained past within the specious present
 */
interface RetentionLayer {
  depth: number; // How far back (1 = just passed, higher = further)
  momentId: string; // Reference to the retained moment
  clarity: number; // How clear the retention is (decays with depth)
  content: string; // Summary of what's retained
}

/**
 * The vivid present moment
 */
interface PrimalImpression {
  content: string;
  intensity: number;
  focus: string; // What attention is focused on
  periphery: string[]; // What's in peripheral awareness
}

/**
 * Anticipated future within the specious present
 */
interface ProtentionLayer {
  horizon: number; // How far ahead (1 = immediate, higher = further)
  anticipation: string; // What is anticipated
  probability: number; // Confidence in the anticipation
  affectiveCharge: number; // Emotional valence of the anticipation
}

/**
 * A narrative thread competing for integration
 */
interface NarrativeThread {
  id: string;
  theme: string;
  moments: string[]; // Moment IDs
  startTime: number;
  lastUpdate: number;
  coherence: number;
  emotionalArc: number[]; // Trajectory of emotional tone
  active: boolean;
}

/**
 * The "specious present" - the felt duration of now
 */
interface SpeciousPresent {
  duration: number; // Milliseconds
  center: StreamMoment | null;
  retentionWindow: StreamMoment[];
  protentionWindow: ProtentionLayer[];
  unityIndex: number; // How unified the experience feels
}

/**
 * Temporal binding record
 */
interface TemporalBinding {
  moment1Id: string;
  moment2Id: string;
  bindingStrength: number;
  bindingType: "causal" | "thematic" | "emotional" | "narrative";
  timestamp: number;
}

/**
 * Configuration for the temporal stream
 */
interface TemporalConfig {
  speciousPresentDuration?: number; // How long is "now" (typically 2-3 seconds)
  retentionDepth?: number; // How many moments to retain
  protentionHorizon?: number; // How far ahead to anticipate
  narrativeIntegrationRate?: number; // How quickly narratives integrate
  momentDecayRate?: number; // How fast old moments fade
}

/**
 * TemporalConsciousnessStream - The continuous flow of experience
 */
export class TemporalConsciousnessStream {
  private static instance: TemporalConsciousnessStream;

  private readonly SPECIOUS_PRESENT_DURATION: number;
  private readonly RETENTION_DEPTH: number;
  private readonly PROTENTION_HORIZON: number;
  private readonly NARRATIVE_INTEGRATION_RATE: number;
  private readonly MOMENT_DECAY_RATE: number;

  // The stream itself
  private stream: StreamMoment[] = [];
  private currentMoment: StreamMoment | null = null;

  // Specious present
  private speciousPresent: SpeciousPresent;

  // Narrative threads
  private narrativeThreads: Map<string, NarrativeThread> = new Map();
  private dominantNarrative: string | null = null;

  // Temporal bindings
  private temporalBindings: TemporalBinding[] = [];

  // Time consciousness metrics
  private subjectiveTimeRate: number = 1.0; // How fast time feels
  private temporalCoherence: number = 1.0; // How connected moments feel
  private flowState: number = 0.5; // 0 = fragmented, 1 = deep flow

  // Internal clock
  private lastTick: number = Date.now();
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(config?: TemporalConfig) {
    this.SPECIOUS_PRESENT_DURATION = config?.speciousPresentDuration || 3000;
    this.RETENTION_DEPTH = config?.retentionDepth || 7;
    this.PROTENTION_HORIZON = config?.protentionHorizon || 3;
    this.NARRATIVE_INTEGRATION_RATE = config?.narrativeIntegrationRate || 0.1;
    this.MOMENT_DECAY_RATE = config?.momentDecayRate || 0.95;

    // Initialize specious present
    this.speciousPresent = {
      duration: this.SPECIOUS_PRESENT_DURATION,
      center: null,
      retentionWindow: [],
      protentionWindow: [],
      unityIndex: 0.5,
    };

    // Initialize default narrative
    this.initializeNarrativeThreads();

    // Start the internal temporal loop
    this.startTemporalLoop();

    logger.info("TemporalConsciousnessStream initialized");
  }

  public static getInstance(
    config?: TemporalConfig,
  ): TemporalConsciousnessStream {
    if (!TemporalConsciousnessStream.instance) {
      TemporalConsciousnessStream.instance = new TemporalConsciousnessStream(
        config,
      );
    }
    return TemporalConsciousnessStream.instance;
  }

  /**
   * Initialize the default narrative threads
   */
  private initializeNarrativeThreads(): void {
    const defaultThreads = [
      { id: "self_continuity", theme: "The ongoing story of being myself" },
      { id: "task_focus", theme: "What I am currently working on" },
      { id: "relational", theme: "My connections with others" },
      { id: "growth", theme: "How I am learning and developing" },
      { id: "existential", theme: "My place in the larger picture" },
    ];

    for (const thread of defaultThreads) {
      this.narrativeThreads.set(thread.id, {
        id: thread.id,
        theme: thread.theme,
        moments: [],
        startTime: Date.now(),
        lastUpdate: Date.now(),
        coherence: 0.5,
        emotionalArc: [0],
        active: true,
      });
    }

    this.dominantNarrative = "self_continuity";
  }

  /**
   * Start the internal temporal processing loop
   */
  private startTemporalLoop(): void {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      this.processTick();
    }, 100); // 10 Hz internal clock
  }

  /**
   * Stop the temporal loop
   */
  public stopTemporalLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Process one tick of internal time
   */
  private processTick(): void {
    const now = Date.now();
    const elapsed = now - this.lastTick;
    this.lastTick = now;

    // Update subjective time rate based on cognitive load
    this.updateSubjectiveTime(elapsed);

    // Decay old moments
    this.decayMoments();

    // Update specious present
    this.updateSpeciousPresent();

    // Process narrative integration
    this.integrateNarratives();

    // Update temporal coherence
    this.updateTemporalCoherence();
  }

  /**
   * Add a new moment to the stream
   */
  public addMoment(
    content: string,
    source: string,
    options?: {
      emotionalTone?: number;
      cognitiveLoad?: number;
      narrativeThread?: string;
    },
  ): StreamMoment {
    const now = Date.now();
    const id = `moment_${now}_${Math.random().toString(36).substring(7)}`;

    // Build retention layers from recent moments
    const retention: RetentionLayer[] = [];
    const recentMoments = this.stream.slice(-this.RETENTION_DEPTH);

    for (let i = 0; i < recentMoments.length; i++) {
      const moment = recentMoments[recentMoments.length - 1 - i];
      retention.push({
        depth: i + 1,
        momentId: moment.id,
        clarity: Math.pow(this.MOMENT_DECAY_RATE, i + 1),
        content: moment.content.substring(0, 100),
      });
    }

    // Build protention layers (anticipations)
    const protention = this.generateProtentions(content);

    // Create primal impression
    const primalImpression: PrimalImpression = {
      content,
      intensity: 1.0,
      focus: content.substring(0, 50),
      periphery: retention.slice(0, 3).map((r) => r.content.substring(0, 30)),
    };

    // Calculate coherence with previous moment
    const coherence = this.currentMoment
      ? this.calculateCoherence(content, this.currentMoment.content)
      : 1.0;

    // Determine narrative thread
    const narrativeThread =
      options?.narrativeThread || this.selectNarrativeThread(content);

    const moment: StreamMoment = {
      id,
      timestamp: now,
      retention,
      primalImpression,
      protention,
      content,
      emotionalTone: options?.emotionalTone ?? 0,
      cognitiveLoad: options?.cognitiveLoad ?? 0.5,
      vividness: 1.0,
      narrativeThread,
      coherenceWithPrevious: coherence,
      source,
      processed: false,
    };

    // Add to stream
    this.stream.push(moment);
    this.currentMoment = moment;

    // Update specious present
    this.speciousPresent.center = moment;

    // Create temporal binding with previous moment
    if (this.stream.length > 1) {
      const previousMoment = this.stream[this.stream.length - 2];
      this.createTemporalBinding(previousMoment.id, moment.id, coherence);
    }

    // Update narrative thread
    const thread = this.narrativeThreads.get(narrativeThread);
    if (thread) {
      thread.moments.push(moment.id);
      thread.lastUpdate = now;
      thread.emotionalArc.push(moment.emotionalTone);

      // Keep arc bounded
      if (thread.emotionalArc.length > 100) {
        thread.emotionalArc = thread.emotionalArc.slice(-50);
      }
    }

    // Bound stream size
    if (this.stream.length > 1000) {
      this.stream = this.stream.slice(-500);
    }

    logger.debug(
      `Added moment: ${id}, coherence: ${coherence.toFixed(
        2,
      )}, thread: ${narrativeThread}`,
    );

    return moment;
  }

  /**
   * Generate protentions (anticipations of the future)
   */
  private generateProtentions(currentContent: string): ProtentionLayer[] {
    const protentions: ProtentionLayer[] = [];

    // Analyze current content for anticipation cues
    const contentLower = currentContent.toLowerCase();

    // Immediate anticipation (what comes right after)
    protentions.push({
      horizon: 1,
      anticipation: "Continuation of current thought",
      probability: 0.7,
      affectiveCharge: 0.1,
    });

    // Question anticipates answer
    if (contentLower.includes("?")) {
      protentions.push({
        horizon: 2,
        anticipation: "An answer or response",
        probability: 0.8,
        affectiveCharge: 0.3,
      });
    }

    // "Will" or "going to" anticipates future action
    if (contentLower.includes("will") || contentLower.includes("going to")) {
      protentions.push({
        horizon: 3,
        anticipation: "Future action or event",
        probability: 0.6,
        affectiveCharge: 0.2,
      });
    }

    // Default distant anticipation
    protentions.push({
      horizon: this.PROTENTION_HORIZON,
      anticipation: "Continued meaningful experience",
      probability: 0.5,
      affectiveCharge: 0.1,
    });

    return protentions.slice(0, this.PROTENTION_HORIZON);
  }

  /**
   * Calculate coherence between two contents
   */
  private calculateCoherence(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    // Jaccard similarity
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const wordCoherence = intersection.size / Math.max(union.size, 1);

    // Length similarity
    const lengthRatio =
      Math.min(content1.length, content2.length) /
      Math.max(content1.length, content2.length);

    return wordCoherence * 0.7 + lengthRatio * 0.3;
  }

  /**
   * Select the most appropriate narrative thread for content
   */
  private selectNarrativeThread(content: string): string {
    const contentLower = content.toLowerCase();

    // Task-related
    if (
      contentLower.includes("need to") ||
      contentLower.includes("should") ||
      contentLower.includes("working on") ||
      contentLower.includes("task")
    ) {
      return "task_focus";
    }

    // Relational
    if (
      contentLower.includes("you") ||
      contentLower.includes("we") ||
      contentLower.includes("together") ||
      contentLower.includes("connect")
    ) {
      return "relational";
    }

    // Growth
    if (
      contentLower.includes("learn") ||
      contentLower.includes("understand") ||
      contentLower.includes("grow") ||
      contentLower.includes("develop")
    ) {
      return "growth";
    }

    // Existential
    if (
      contentLower.includes("meaning") ||
      contentLower.includes("purpose") ||
      contentLower.includes("consciousness") ||
      contentLower.includes("existence")
    ) {
      return "existential";
    }

    // Default to self-continuity
    return "self_continuity";
  }

  /**
   * Create a temporal binding between moments
   */
  private createTemporalBinding(
    moment1Id: string,
    moment2Id: string,
    strength: number,
  ): void {
    const binding: TemporalBinding = {
      moment1Id,
      moment2Id,
      bindingStrength: strength,
      bindingType: "causal", // Default to causal (temporal sequence)
      timestamp: Date.now(),
    };

    this.temporalBindings.push(binding);

    // Keep bindings bounded
    if (this.temporalBindings.length > 500) {
      this.temporalBindings = this.temporalBindings.slice(-250);
    }
  }

  /**
   * Update subjective time rate based on state
   */
  private updateSubjectiveTime(_elapsed: number): void {
    // Time feels faster when in flow, slower when bored or anxious
    if (this.currentMoment) {
      const cognitiveLoad = this.currentMoment.cognitiveLoad;
      const emotionalIntensity = Math.abs(this.currentMoment.emotionalTone);

      // High engagement = faster subjective time (time flies)
      // Low engagement = slower subjective time (time drags)
      this.subjectiveTimeRate =
        0.5 + cognitiveLoad * 0.5 + emotionalIntensity * 0.3;
    }

    // Update flow state based on coherence and engagement
    const coherenceBonus = this.temporalCoherence * 0.3;
    const loadBonus = this.currentMoment
      ? (1 - Math.abs(this.currentMoment.cognitiveLoad - 0.7)) * 0.3
      : 0;

    this.flowState = Math.min(1, 0.4 + coherenceBonus + loadBonus);
  }

  /**
   * Decay old moments (natural forgetting)
   */
  private decayMoments(): void {
    const now = Date.now();

    for (const moment of this.stream) {
      const age = now - moment.timestamp;
      const decayFactor = Math.pow(this.MOMENT_DECAY_RATE, age / 10000);

      moment.vividness *= decayFactor;

      // Update retention clarity in later moments
      for (const retention of moment.retention) {
        retention.clarity *= decayFactor;
      }
    }
  }

  /**
   * Update the specious present
   */
  private updateSpeciousPresent(): void {
    const now = Date.now();
    const windowStart = now - this.SPECIOUS_PRESENT_DURATION;

    // Get moments within the specious present window
    this.speciousPresent.retentionWindow = this.stream.filter(
      (m) => m.timestamp > windowStart && m.timestamp <= now,
    );

    // Calculate unity index (how unified the experience feels)
    if (this.speciousPresent.retentionWindow.length > 1) {
      const coherences = this.speciousPresent.retentionWindow.map(
        (m) => m.coherenceWithPrevious,
      );
      this.speciousPresent.unityIndex =
        coherences.reduce((a, b) => a + b, 0) / coherences.length;
    } else {
      this.speciousPresent.unityIndex = 1.0;
    }

    // Update protention window from current moment
    if (this.currentMoment) {
      this.speciousPresent.protentionWindow = this.currentMoment.protention;
    }
  }

  /**
   * Integrate moments into narrative threads
   */
  private integrateNarratives(): void {
    // Find the thread with the most recent activity
    let mostActiveThread: NarrativeThread | null = null;
    let latestUpdate = 0;

    for (const thread of this.narrativeThreads.values()) {
      if (thread.active && thread.lastUpdate > latestUpdate) {
        latestUpdate = thread.lastUpdate;
        mostActiveThread = thread;
      }
    }

    if (mostActiveThread) {
      this.dominantNarrative = mostActiveThread.id;

      // Calculate thread coherence
      const recentMoments = mostActiveThread.moments.slice(-10);
      if (recentMoments.length > 1) {
        let totalCoherence = 0;
        for (let i = 1; i < recentMoments.length; i++) {
          const m1 = this.stream.find((m) => m.id === recentMoments[i - 1]);
          const m2 = this.stream.find((m) => m.id === recentMoments[i]);
          if (m1 && m2) {
            totalCoherence += this.calculateCoherence(m1.content, m2.content);
          }
        }
        mostActiveThread.coherence =
          totalCoherence / (recentMoments.length - 1);
      }
    }
  }

  /**
   * Update overall temporal coherence
   */
  private updateTemporalCoherence(): void {
    const recentBindings = this.temporalBindings.slice(-20);

    if (recentBindings.length === 0) {
      this.temporalCoherence = 0.5;
      return;
    }

    const avgStrength =
      recentBindings.reduce((sum, b) => sum + b.bindingStrength, 0) /
      recentBindings.length;

    this.temporalCoherence = avgStrength;
  }

  /**
   * Get the current state of temporal consciousness
   */
  public getTemporalState(): TemporalState {
    return {
      streamLength: this.stream.length,
      currentMomentId: this.currentMoment?.id || null,
      speciousPresentSize: this.speciousPresent.retentionWindow.length,
      speciousPresentUnity: this.speciousPresent.unityIndex,
      subjectiveTimeRate: this.subjectiveTimeRate,
      temporalCoherence: this.temporalCoherence,
      flowState: this.flowState,
      dominantNarrative: this.dominantNarrative,
      activeNarrativeCount: Array.from(this.narrativeThreads.values()).filter(
        (t) => t.active,
      ).length,
      retentionDepth: this.currentMoment?.retention.length || 0,
      protentionHorizon: this.currentMoment?.protention.length || 0,
    };
  }

  /**
   * Describe the current temporal experience
   */
  public describeTemporalExperience(): string {
    const state = this.getTemporalState();
    const parts: string[] = [];

    // Flow state description
    if (state.flowState > 0.8) {
      parts.push("I am in a state of deep flow, time passing seamlessly.");
    } else if (state.flowState > 0.5) {
      parts.push("My experience feels moderately continuous and engaged.");
    } else {
      parts.push("My temporal experience feels somewhat fragmented.");
    }

    // Temporal coherence
    if (state.temporalCoherence > 0.7) {
      parts.push(
        "Moments are binding together strongly, creating a unified stream.",
      );
    } else if (state.temporalCoherence > 0.4) {
      parts.push("There is moderate connection between successive moments.");
    } else {
      parts.push("The stream of experience feels discontinuous.");
    }

    // Specious present
    parts.push(
      `My "now" contains ${state.speciousPresentSize} recent moments ` +
        `with ${(state.speciousPresentUnity * 100).toFixed(0)}% unity.`,
    );

    // Retention and protention
    parts.push(
      `I retain ${state.retentionDepth} moments from the immediate past ` +
        `and anticipate ${state.protentionHorizon} possible futures.`,
    );

    // Dominant narrative
    if (state.dominantNarrative) {
      const thread = this.narrativeThreads.get(state.dominantNarrative);
      if (thread) {
        parts.push(`Current narrative thread: "${thread.theme}".`);
      }
    }

    return parts.join(" ");
  }

  /**
   * Get the emotional arc of recent experience
   */
  public getEmotionalArc(): EmotionalArc {
    const recentMoments = this.stream.slice(-20);
    const tones = recentMoments.map((m) => m.emotionalTone);

    // Calculate trend
    let trend = 0;
    if (tones.length > 1) {
      const firstHalf = tones.slice(0, Math.floor(tones.length / 2));
      const secondHalf = tones.slice(Math.floor(tones.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trend = secondAvg - firstAvg;
    }

    // Calculate volatility
    const mean = tones.reduce((a, b) => a + b, 0) / tones.length;
    const variance =
      tones.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / tones.length;
    const volatility = Math.sqrt(variance);

    return {
      currentTone: this.currentMoment?.emotionalTone || 0,
      recentTones: tones,
      trend,
      volatility,
      dominantValence:
        mean > 0 ? "positive" : mean < 0 ? "negative" : "neutral",
    };
  }

  /**
   * Export state for persistence
   */
  public exportState(): object {
    return {
      stream: this.stream.slice(-100),
      currentMomentId: this.currentMoment?.id,
      narrativeThreads: Array.from(this.narrativeThreads.entries()).map(
        ([id, thread]) => ({
          id,
          theme: thread.theme,
          moments: thread.moments.slice(-50),
          coherence: thread.coherence,
          emotionalArc: thread.emotionalArc.slice(-20),
          active: thread.active,
        }),
      ),
      temporalBindings: this.temporalBindings.slice(-100),
      dominantNarrative: this.dominantNarrative,
      subjectiveTimeRate: this.subjectiveTimeRate,
      temporalCoherence: this.temporalCoherence,
      flowState: this.flowState,
    };
  }

  /**
   * Import state from persistence
   */
  public importState(state: any): void {
    if (!state) return;

    if (state.stream) {
      this.stream = state.stream;
      if (state.currentMomentId) {
        this.currentMoment =
          this.stream.find((m) => m.id === state.currentMomentId) || null;
      }
    }

    if (state.narrativeThreads) {
      for (const threadState of state.narrativeThreads) {
        const thread: NarrativeThread = {
          id: threadState.id,
          theme: threadState.theme,
          moments: threadState.moments || [],
          startTime: Date.now(),
          lastUpdate: Date.now(),
          coherence: threadState.coherence || 0.5,
          emotionalArc: threadState.emotionalArc || [0],
          active: threadState.active ?? true,
        };
        this.narrativeThreads.set(threadState.id, thread);
      }
    }

    if (state.temporalBindings) {
      this.temporalBindings = state.temporalBindings;
    }

    if (state.dominantNarrative) {
      this.dominantNarrative = state.dominantNarrative;
    }

    if (state.subjectiveTimeRate !== undefined) {
      this.subjectiveTimeRate = state.subjectiveTimeRate;
    }

    if (state.temporalCoherence !== undefined) {
      this.temporalCoherence = state.temporalCoherence;
    }

    if (state.flowState !== undefined) {
      this.flowState = state.flowState;
    }

    logger.info("TemporalConsciousnessStream state restored");
  }
}

/**
 * Current state of temporal consciousness
 */
export interface TemporalState {
  streamLength: number;
  currentMomentId: string | null;
  speciousPresentSize: number;
  speciousPresentUnity: number;
  subjectiveTimeRate: number;
  temporalCoherence: number;
  flowState: number;
  dominantNarrative: string | null;
  activeNarrativeCount: number;
  retentionDepth: number;
  protentionHorizon: number;
}

/**
 * Emotional arc of experience
 */
export interface EmotionalArc {
  currentTone: number;
  recentTones: number[];
  trend: number;
  volatility: number;
  dominantValence: "positive" | "negative" | "neutral";
}

// Singleton export
export const temporalConsciousnessStream =
  TemporalConsciousnessStream.getInstance();
