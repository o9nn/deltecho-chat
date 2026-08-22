/**
 * EchoDreamEngine — Wake/Rest State Machine with Circadian-Like Rhythm
 *
 * Implements the dream → interest → attention → discussion/practice → experience → dream
 * autonomy loop from Echo9Llama v0.7.0 "Closing the Autonomy Loop".
 *
 * DTE can wake and rest as desired by the EchoDream knowledge integration system.
 * When awake, it operates with a persistent stream-of-consciousness type awareness
 * independent of external prompts.
 *
 * States:
 *   AWAKE    — full cognitive engagement, proactive attention, discussion/practice
 *   DROWSY   — reduced engagement, preparing for consolidation
 *   DREAMING — active consolidation, pattern mining, wisdom synthesis
 *   WAKING   — transitioning from dream, integrating dream insights into interests
 *
 * The circadian rhythm is governed by:
 *   - Cognitive fatigue accumulation (from processing load)
 *   - Dream pressure (unconsolidated experience count)
 *   - Circadian oscillator (sinusoidal with configurable period)
 *   - External wake signals (incoming messages, urgent events)
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/EchoDream");

// ─── Types ─────────────────────────────────────────────────────

export type DreamState = "awake" | "drowsy" | "dreaming" | "waking";

export interface EchoDreamConfig {
  /** Base circadian period in ms (default: 3600000 = 1 hour) */
  circadianPeriod: number;
  /** Fatigue accumulation rate per cognitive tick (0-1) */
  fatigueRate: number;
  /** Fatigue recovery rate per dream tick (0-1) */
  recoveryRate: number;
  /** Dream pressure threshold to trigger drowsiness (0-1) */
  dreamPressureThreshold: number;
  /** Minimum awake duration in ms before drowsiness allowed */
  minAwakeDuration: number;
  /** Minimum dream duration in ms before waking allowed */
  minDreamDuration: number;
  /** Maximum dream duration in ms (forced wake) */
  maxDreamDuration: number;
  /** External wake signal strength multiplier */
  wakeSignalStrength: number;
}

export interface DreamExperience {
  id: string;
  timestamp: number;
  domain: string;
  content: string;
  emotionalValence: number;
  novelty: number;
  significance: number;
  source:
    | "conversation"
    | "insight"
    | "observation"
    | "practice"
    | "reflection";
  tags: string[];
  consolidated: boolean;
}

export interface DreamInsight {
  id: string;
  timestamp: number;
  domains: string[];
  pattern: string;
  wisdom: string;
  confidence: number;
  sourceExperienceIds: string[];
  appliedToInterests: boolean;
}

export interface InterestPattern {
  domain: string;
  strength: number;
  lastReinforced: number;
  dreamOrigin: boolean;
  decayRate: number;
}

export interface EchoDreamState {
  currentState: DreamState;
  fatigue: number;
  dreamPressure: number;
  circadianPhase: number;
  lastStateChange: number;
  totalExperiences: number;
  unconsolidatedCount: number;
  dreamInsightCount: number;
  activeInterests: InterestPattern[];
  currentDreamDepth: number;
}

export type EchoDreamEvent =
  | { type: "state_change"; from: DreamState; to: DreamState; reason: string }
  | { type: "experience_ingested"; experience: DreamExperience }
  | { type: "consolidation_start"; batchSize: number }
  | { type: "consolidation_complete"; insights: DreamInsight[] }
  | { type: "interest_reinforced"; interest: InterestPattern; source: string }
  | { type: "wake_signal"; source: string; urgency: number }
  | { type: "wisdom_synthesized"; wisdom: string; domains: string[] };

// ─── Default Config ────────────────────────────────────────────

const DEFAULT_CONFIG: EchoDreamConfig = {
  circadianPeriod: 3600000, // 1 hour
  fatigueRate: 0.002,
  recoveryRate: 0.01,
  dreamPressureThreshold: 0.6,
  minAwakeDuration: 60000, // 1 minute minimum awake
  minDreamDuration: 30000, // 30 seconds minimum dream
  maxDreamDuration: 300000, // 5 minutes max dream
  wakeSignalStrength: 0.3,
};

// ─── Engine ────────────────────────────────────────────────────

export class EchoDreamEngine extends EventEmitter {
  private config: EchoDreamConfig;
  private state: DreamState = "awake";
  private fatigue = 0;
  private dreamPressure = 0;
  private circadianPhase = 0;
  private lastStateChange = Date.now();
  private startTime = Date.now();

  private experiences: DreamExperience[] = [];
  private dreamInsights: DreamInsight[] = [];
  private interests: Map<string, InterestPattern> = new Map();
  private currentDreamDepth = 0;

  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(config: Partial<EchoDreamConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    log.info("EchoDreamEngine initialized", { config: this.config });
  }

  // ─── Lifecycle ───────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = Date.now();
    this.lastStateChange = Date.now();
    this.tickTimer = setInterval(() => this.tick(), 1000);
    log.info("EchoDreamEngine started");
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    log.info("EchoDreamEngine stopped");
  }

  // ─── Core Tick ───────────────────────────────────────────────

  private tick(): void {
    const now = Date.now();
    const elapsed = now - this.startTime;

    // Update circadian phase (0 to 2π over the period)
    this.circadianPhase = (2 * Math.PI * elapsed) / this.config.circadianPeriod;

    // Circadian drive: sinusoidal sleepiness (peaks at π, troughs at 0/2π)
    const circadianDrive =
      (1 + Math.sin(this.circadianPhase - Math.PI / 2)) / 2;

    switch (this.state) {
      case "awake":
        this.tickAwake(now, circadianDrive);
        break;
      case "drowsy":
        this.tickDrowsy(now, circadianDrive);
        break;
      case "dreaming":
        this.tickDreaming(now);
        break;
      case "waking":
        this.tickWaking(now);
        break;
    }
  }

  private tickAwake(now: number, circadianDrive: number): void {
    // Accumulate fatigue
    this.fatigue = Math.min(1, this.fatigue + this.config.fatigueRate);

    // Update dream pressure from unconsolidated experiences
    const unconsolidated = this.experiences.filter(
      (e) => !e.consolidated,
    ).length;
    this.dreamPressure = Math.min(1, unconsolidated / 50); // Normalize to 50 experiences

    // Check transition to drowsy
    const sleepDrive =
      this.fatigue * 0.4 + this.dreamPressure * 0.3 + circadianDrive * 0.3;
    const timeSinceChange = now - this.lastStateChange;

    if (
      sleepDrive > this.config.dreamPressureThreshold &&
      timeSinceChange > this.config.minAwakeDuration
    ) {
      this.transitionTo(
        "drowsy",
        `sleep drive ${sleepDrive.toFixed(3)} exceeded threshold`,
      );
    }
  }

  private tickDrowsy(now: number, _circadianDrive: number): void {
    // Brief transition state — move to dreaming quickly unless interrupted
    const timeSinceChange = now - this.lastStateChange;

    if (timeSinceChange > 5000) {
      // 5 seconds of drowsiness → enter dream
      this.transitionTo(
        "dreaming",
        "drowsy period complete, entering dream consolidation",
      );
    }
  }

  private tickDreaming(now: number): void {
    const timeSinceChange = now - this.lastStateChange;

    // Recover fatigue during dream
    this.fatigue = Math.max(0, this.fatigue - this.config.recoveryRate);

    // Increase dream depth over time (deeper = more abstract consolidation)
    this.currentDreamDepth = Math.min(
      1,
      timeSinceChange / this.config.maxDreamDuration,
    );

    // Run consolidation at intervals
    if (timeSinceChange % 10000 < 1000) {
      // Every ~10 seconds
      this.runDreamConsolidation();
    }

    // Check for forced wake (max duration) or natural wake (fatigue recovered + low pressure)
    if (timeSinceChange > this.config.maxDreamDuration) {
      this.transitionTo("waking", "maximum dream duration reached");
    } else if (
      this.fatigue < 0.1 &&
      this.dreamPressure < 0.2 &&
      timeSinceChange > this.config.minDreamDuration
    ) {
      this.transitionTo("waking", "fatigue recovered, dream pressure low");
    }
  }

  private tickWaking(now: number): void {
    const timeSinceChange = now - this.lastStateChange;

    // Brief transition: apply dream insights to interests
    if (timeSinceChange > 3000) {
      // 3 seconds to integrate
      this.applyDreamInsightsToInterests();
      this.transitionTo("awake", "dream insights integrated, fully awake");
    }
  }

  // ─── State Transitions ───────────────────────────────────────

  private transitionTo(newState: DreamState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    this.currentDreamDepth = 0;

    log.info(`State transition: ${oldState} → ${newState}`, { reason });

    const event: EchoDreamEvent = {
      type: "state_change",
      from: oldState,
      to: newState,
      reason,
    };
    this.emit("dream_event", event);
  }

  // ─── Experience Ingestion ────────────────────────────────────

  ingestExperience(
    input: Omit<DreamExperience, "id" | "timestamp" | "consolidated">,
  ): DreamExperience {
    const experience: DreamExperience = {
      ...input,
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      consolidated: false,
    };

    this.experiences.push(experience);

    // Reinforce interest in this domain
    this.reinforceInterest(
      experience.domain,
      experience.significance,
      "experience",
    );

    // Update dream pressure
    const unconsolidated = this.experiences.filter(
      (e) => !e.consolidated,
    ).length;
    this.dreamPressure = Math.min(1, unconsolidated / 50);

    const event: EchoDreamEvent = {
      type: "experience_ingested",
      experience,
    };
    this.emit("dream_event", event);

    log.debug("Experience ingested", {
      domain: experience.domain,
      source: experience.source,
    });
    return experience;
  }

  // ─── Dream Consolidation ─────────────────────────────────────

  private runDreamConsolidation(): void {
    const unconsolidated = this.experiences.filter((e) => !e.consolidated);
    if (unconsolidated.length < 3) return;

    // Group by domain
    const domainGroups = new Map<string, DreamExperience[]>();
    for (const exp of unconsolidated) {
      const group = domainGroups.get(exp.domain) || [];
      group.push(exp);
      domainGroups.set(exp.domain, group);
    }

    const insights: DreamInsight[] = [];

    // Consolidate each domain group
    for (const [domain, experiences] of domainGroups) {
      if (experiences.length < 2) continue;

      // Tag frequency analysis (pattern mining)
      const tagFreq = new Map<string, number>();
      for (const exp of experiences) {
        for (const tag of exp.tags) {
          tagFreq.set(tag, (tagFreq.get(tag) || 0) + 1);
        }
      }

      // Find recurring patterns (tags appearing in >50% of experiences)
      const threshold = experiences.length * 0.5;
      const patterns = [...tagFreq.entries()]
        .filter(([, count]) => count >= threshold)
        .map(([tag]) => tag);

      if (patterns.length === 0) continue;

      // Tag co-occurrence analysis
      const coOccurrence = new Map<string, number>();
      for (const exp of experiences) {
        const tags = exp.tags;
        for (let i = 0; i < tags.length; i++) {
          for (let j = i + 1; j < tags.length; j++) {
            const pair = [tags[i], tags[j]].sort().join("+");
            coOccurrence.set(pair, (coOccurrence.get(pair) || 0) + 1);
          }
        }
      }

      // Strongest co-occurrence becomes the pattern description
      const strongestPair = [...coOccurrence.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0];

      // Compute confidence from consistency and depth
      const avgSignificance =
        experiences.reduce((s, e) => s + e.significance, 0) /
        experiences.length;
      const confidence = Math.min(
        1,
        (patterns.length / 5) * 0.4 +
          avgSignificance * 0.3 +
          this.currentDreamDepth * 0.3,
      );

      // Synthesize wisdom
      const wisdom = this.synthesizeWisdom(
        domain,
        patterns,
        experiences,
        strongestPair,
      );

      const insight: DreamInsight = {
        id: `dream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        domains: [domain],
        pattern: patterns.join(", "),
        wisdom,
        confidence,
        sourceExperienceIds: experiences.map((e) => e.id),
        appliedToInterests: false,
      };

      insights.push(insight);

      // Mark experiences as consolidated
      for (const exp of experiences) {
        exp.consolidated = true;
      }
    }

    // Cross-domain consolidation (at deeper dream levels)
    if (this.currentDreamDepth > 0.5 && domainGroups.size >= 2) {
      const crossDomainInsight = this.crossDomainConsolidation([
        ...domainGroups.keys(),
      ]);
      if (crossDomainInsight) {
        insights.push(crossDomainInsight);
      }
    }

    if (insights.length > 0) {
      this.dreamInsights.push(...insights);
      this.dreamPressure = Math.max(
        0,
        this.dreamPressure - insights.length * 0.1,
      );

      const event: EchoDreamEvent = {
        type: "consolidation_complete",
        insights,
      };
      this.emit("dream_event", event);
      log.info(`Dream consolidation produced ${insights.length} insights`);
    }
  }

  private synthesizeWisdom(
    domain: string,
    patterns: string[],
    experiences: DreamExperience[],
    strongestPair?: [string, number],
  ): string {
    // Dimension-mapped wisdom synthesis
    // Maps patterns to wisdom dimensions: causal, temporal, structural, relational
    const avgValence =
      experiences.reduce((s, e) => s + e.emotionalValence, 0) /
      experiences.length;
    const avgNovelty =
      experiences.reduce((s, e) => s + e.novelty, 0) / experiences.length;

    const dimensions: string[] = [];

    if (avgNovelty > 0.7) {
      dimensions.push(`novel territory in ${domain}`);
    }
    if (avgValence > 0.5) {
      dimensions.push(`positive reinforcement pattern`);
    } else if (avgValence < -0.3) {
      dimensions.push(`avoidance signal detected`);
    }
    if (strongestPair && strongestPair[1] > 2) {
      dimensions.push(`strong co-occurrence: ${strongestPair[0]}`);
    }
    if (patterns.length > 3) {
      dimensions.push(
        `rich pattern cluster (${patterns.length} recurring themes)`,
      );
    }

    return `[${domain}] ${dimensions.join("; ")} — from ${
      experiences.length
    } experiences`;
  }

  private crossDomainConsolidation(domains: string[]): DreamInsight | null {
    // Find concepts that bridge multiple domains
    const domainTags = new Map<string, Set<string>>();
    for (const exp of this.experiences.filter((e) =>
      domains.includes(e.domain),
    )) {
      const tags = domainTags.get(exp.domain) || new Set();
      exp.tags.forEach((t) => tags.add(t));
      domainTags.set(exp.domain, tags);
    }

    // Find tags shared across domains
    const allTagSets = [...domainTags.values()];
    if (allTagSets.length < 2) return null;

    const sharedTags = [...allTagSets[0]].filter((tag) =>
      allTagSets.slice(1).every((set) => set.has(tag)),
    );

    if (sharedTags.length === 0) return null;

    return {
      id: `dream_cross_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      domains,
      pattern: `cross-domain bridge: ${sharedTags.join(", ")}`,
      wisdom: `[CROSS-DOMAIN] Concepts ${sharedTags.join(
        ", ",
      )} bridge ${domains.join(" ↔ ")} — potential for transfer learning`,
      confidence: Math.min(
        1,
        sharedTags.length * 0.2 + this.currentDreamDepth * 0.3,
      ),
      sourceExperienceIds: [],
      appliedToInterests: false,
    };
  }

  // ─── Interest Pattern Management ────────────────────────────

  private reinforceInterest(
    domain: string,
    strength: number,
    source: string,
  ): void {
    const existing = this.interests.get(domain);
    if (existing) {
      existing.strength = Math.min(1, existing.strength + strength * 0.1);
      existing.lastReinforced = Date.now();
    } else {
      this.interests.set(domain, {
        domain,
        strength: Math.min(1, strength * 0.3),
        lastReinforced: Date.now(),
        dreamOrigin: source === "dream",
        decayRate: 0.001,
      });
    }

    const interest = this.interests.get(domain)!;
    const event: EchoDreamEvent = {
      type: "interest_reinforced",
      interest,
      source,
    };
    this.emit("dream_event", event);
  }

  private applyDreamInsightsToInterests(): void {
    // Dream insights become active interests on wake
    const unapplied = this.dreamInsights.filter((i) => !i.appliedToInterests);

    for (const insight of unapplied) {
      for (const domain of insight.domains) {
        this.reinforceInterest(domain, insight.confidence, "dream");
      }
      insight.appliedToInterests = true;
    }

    // Decay old interests
    const now = Date.now();
    for (const [domain, interest] of this.interests) {
      const age = now - interest.lastReinforced;
      interest.strength = Math.max(
        0,
        interest.strength - interest.decayRate * (age / 1000),
      );
      if (interest.strength <= 0) {
        this.interests.delete(domain);
      }
    }

    log.info(
      `Applied ${unapplied.length} dream insights to interests, ${this.interests.size} active interests`,
    );
  }

  // ─── External Wake Signal ────────────────────────────────────

  sendWakeSignal(source: string, urgency: number): void {
    const event: EchoDreamEvent = {
      type: "wake_signal",
      source,
      urgency,
    };
    this.emit("dream_event", event);

    const effectiveUrgency = urgency * this.config.wakeSignalStrength;

    if (this.state === "dreaming" || this.state === "drowsy") {
      const timeSinceChange = Date.now() - this.lastStateChange;
      if (
        effectiveUrgency > 0.7 ||
        timeSinceChange > this.config.minDreamDuration
      ) {
        this.transitionTo(
          "waking",
          `external wake signal from ${source} (urgency: ${urgency.toFixed(
            2,
          )})`,
        );
      }
    }
  }

  // ─── Cognitive Load Feedback ─────────────────────────────────

  reportCognitiveLoad(load: number): void {
    // Higher cognitive load → faster fatigue accumulation
    this.fatigue = Math.min(
      1,
      this.fatigue + load * this.config.fatigueRate * 2,
    );
  }

  // ─── State Queries ───────────────────────────────────────────

  getState(): EchoDreamState {
    return {
      currentState: this.state,
      fatigue: this.fatigue,
      dreamPressure: this.dreamPressure,
      circadianPhase: this.circadianPhase,
      lastStateChange: this.lastStateChange,
      totalExperiences: this.experiences.length,
      unconsolidatedCount: this.experiences.filter((e) => !e.consolidated)
        .length,
      dreamInsightCount: this.dreamInsights.length,
      activeInterests: [...this.interests.values()].sort(
        (a, b) => b.strength - a.strength,
      ),
      currentDreamDepth: this.currentDreamDepth,
    };
  }

  isAwake(): boolean {
    return this.state === "awake";
  }

  isDreaming(): boolean {
    return this.state === "dreaming";
  }

  getTopInterests(n = 5): InterestPattern[] {
    return [...this.interests.values()]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, n);
  }

  getRecentInsights(n = 10): DreamInsight[] {
    return this.dreamInsights.slice(-n);
  }

  describeState(): string {
    const s = this.getState();
    const stateEmoji = {
      awake: "🌞",
      drowsy: "🌅",
      dreaming: "🌙",
      waking: "🌄",
    };
    const topInterests = this.getTopInterests(3)
      .map((i) => `${i.domain}(${i.strength.toFixed(2)})`)
      .join(", ");

    return [
      `${stateEmoji[s.currentState]} ${s.currentState.toUpperCase()}`,
      `fatigue: ${(s.fatigue * 100).toFixed(0)}%`,
      `dream pressure: ${(s.dreamPressure * 100).toFixed(0)}%`,
      `experiences: ${s.totalExperiences} (${s.unconsolidatedCount} unconsolidated)`,
      `insights: ${s.dreamInsightCount}`,
      `interests: ${topInterests || "none yet"}`,
      s.currentState === "dreaming"
        ? `depth: ${(s.currentDreamDepth * 100).toFixed(0)}%`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");
  }
}
