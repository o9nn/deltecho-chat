/**
 * Temporal Credit Assignment for Self-Modification
 *
 * Tracks which parameter modifications led to improved coherence over time.
 * Uses an exponentially-weighted moving average with decay to attribute
 * coherence changes to specific modifications.
 *
 * Key insight: A modification made at time T may not show effects until T+Δ.
 * We use a temporal eligibility trace (inspired by TD(λ) reinforcement learning)
 * to assign credit to modifications that preceded coherence improvements.
 *
 * The credit score for each parameter guides future proposeModifications():
 *   - Parameters with high credit → more likely to be modified again in same direction
 *   - Parameters with negative credit → modifications are reversed or avoided
 *   - Parameters with near-zero credit → neutral, no strong signal
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";

// ─── Types ────────────────────────────────────────────────────────

export interface ModificationTrace {
  /** Parameter key that was modified */
  key: string;
  /** Direction of change: +1 (increase) or -1 (decrease) */
  direction: number;
  /** Magnitude of change (absolute) */
  magnitude: number;
  /** Timestamp of modification */
  timestamp: number;
  /** Eligibility trace strength (decays over time) */
  eligibility: number;
}

export interface CreditRecord {
  /** Parameter key */
  key: string;
  /** Accumulated credit score (positive = beneficial, negative = harmful) */
  credit: number;
  /** Number of times this parameter was modified */
  modificationCount: number;
  /** Average coherence delta following modifications */
  avgCoherenceDelta: number;
  /** Best coherence delta observed */
  bestCoherenceDelta: number;
  /** Worst coherence delta observed */
  worstCoherenceDelta: number;
  /** Last update timestamp */
  lastUpdated: number;
}

export interface TemporalCreditConfig {
  /** Eligibility trace decay rate per second (λ) */
  traceDecayRate: number;
  /** Learning rate for credit updates (α) */
  learningRate: number;
  /** Coherence sampling interval (ms) */
  coherenceSampleInterval: number;
  /** Maximum trace age before pruning (ms) */
  maxTraceAge: number;
  /** Persistence path for credit records */
  persistencePath: string;
  /** Enable persistence */
  enablePersistence: boolean;
  /** Minimum coherence delta to count as significant */
  significanceDelta: number;
}

const DEFAULT_CONFIG: TemporalCreditConfig = {
  traceDecayRate: 0.1, // 10% decay per second
  learningRate: 0.05,
  coherenceSampleInterval: 5000, // Sample every 5s
  maxTraceAge: 300000, // 5 minutes
  persistencePath: "/tmp/deep-tree-echo/temporal-credit",
  enablePersistence: true,
  significanceDelta: 0.01,
};

// ─── Temporal Credit Assignment Engine ────────────────────────────

export class TemporalCreditAssignment extends EventEmitter {
  private config: TemporalCreditConfig;
  private activeTraces: ModificationTrace[] = [];
  private creditRecords: Map<string, CreditRecord> = new Map();
  private previousCoherence = 0.5;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private coherenceHistory: Array<{ time: number; value: number }> = [];

  constructor(config: Partial<TemporalCreditConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.restoreCreditRecords();
  }

  /**
   * Start the temporal credit assignment engine.
   * Begins periodic coherence sampling and trace decay.
   */
  start(getCoherence: () => number): void {
    this.sampleTimer = setInterval(() => {
      const currentCoherence = getCoherence();
      this.sampleCoherence(currentCoherence);
    }, this.config.coherenceSampleInterval);

    this.emit("started");
  }

  /**
   * Stop the engine and persist credit records.
   */
  stop(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    this.persistCreditRecords();
    this.emit("stopped");
  }

  /**
   * Record a modification event (called when SelfModificationEngine applies a change).
   */
  recordModification(key: string, previousValue: number, newValue: number): void {
    const direction = newValue > previousValue ? 1 : -1;
    const magnitude = Math.abs(newValue - previousValue);

    const trace: ModificationTrace = {
      key,
      direction,
      magnitude,
      timestamp: Date.now(),
      eligibility: 1.0, // Full eligibility at creation
    };

    this.activeTraces.push(trace);
    this.emit("trace:created", trace);
  }

  /**
   * Sample current coherence and assign credit to active traces.
   */
  private sampleCoherence(currentCoherence: number): void {
    const now = Date.now();
    const coherenceDelta = currentCoherence - this.previousCoherence;

    // Store in history
    this.coherenceHistory.push({ time: now, value: currentCoherence });
    if (this.coherenceHistory.length > 1000) {
      this.coherenceHistory.shift();
    }

    // Only assign credit if the delta is significant
    if (Math.abs(coherenceDelta) >= this.config.significanceDelta) {
      this.assignCredit(coherenceDelta, now);
    }

    // Decay and prune traces
    this.decayTraces(now);

    this.previousCoherence = currentCoherence;
  }

  /**
   * Assign credit to all active traces proportional to their eligibility.
   * TD(λ)-inspired: recent modifications get more credit than older ones.
   */
  private assignCredit(coherenceDelta: number, now: number): void {
    for (const trace of this.activeTraces) {
      // Credit = learning_rate × eligibility × coherence_delta × direction_alignment
      // direction_alignment: +1 if coherence improved in same direction as modification
      const directionAlignment = coherenceDelta > 0 ? trace.direction : -trace.direction;
      const credit =
        this.config.learningRate *
        trace.eligibility *
        Math.abs(coherenceDelta) *
        directionAlignment;

      // Update credit record
      this.updateCreditRecord(trace.key, credit, coherenceDelta);
    }

    this.emit("credit:assigned", {
      coherenceDelta,
      activeTraces: this.activeTraces.length,
      timestamp: now,
    });
  }

  /**
   * Update the cumulative credit record for a parameter.
   */
  private updateCreditRecord(
    key: string,
    creditDelta: number,
    coherenceDelta: number,
  ): void {
    let record = this.creditRecords.get(key);
    if (!record) {
      record = {
        key,
        credit: 0,
        modificationCount: 0,
        avgCoherenceDelta: 0,
        bestCoherenceDelta: -Infinity,
        worstCoherenceDelta: Infinity,
        lastUpdated: Date.now(),
      };
      this.creditRecords.set(key, record);
    }

    record.credit += creditDelta;
    record.modificationCount++;
    record.avgCoherenceDelta =
      (record.avgCoherenceDelta * (record.modificationCount - 1) + coherenceDelta) /
      record.modificationCount;
    record.bestCoherenceDelta = Math.max(record.bestCoherenceDelta, coherenceDelta);
    record.worstCoherenceDelta = Math.min(record.worstCoherenceDelta, coherenceDelta);
    record.lastUpdated = Date.now();
  }

  /**
   * Decay eligibility traces and prune expired ones.
   */
  private decayTraces(now: number): void {
    this.activeTraces = this.activeTraces.filter((trace) => {
      const age = now - trace.timestamp;

      // Prune if too old
      if (age > this.config.maxTraceAge) return false;

      // Exponential decay: e^(-λ * t)
      const decaySeconds = age / 1000;
      trace.eligibility = Math.exp(-this.config.traceDecayRate * decaySeconds);

      // Prune if eligibility is negligible
      return trace.eligibility > 0.01;
    });
  }

  // ─── Query Interface (used by proposeModifications) ─────────────

  /**
   * Get the credit score for a parameter.
   * Positive = historically beneficial, negative = historically harmful.
   */
  getCredit(key: string): number {
    return this.creditRecords.get(key)?.credit ?? 0;
  }

  /**
   * Get all credit records sorted by credit score (descending).
   */
  getAllCredits(): CreditRecord[] {
    return Array.from(this.creditRecords.values()).sort(
      (a, b) => b.credit - a.credit,
    );
  }

  /**
   * Get the recommended direction for a parameter modification.
   * Returns +1 (increase), -1 (decrease), or 0 (no strong signal).
   */
  getRecommendedDirection(key: string): number {
    const record = this.creditRecords.get(key);
    if (!record || record.modificationCount < 3) return 0;
    if (record.credit > 0.1) return 1;
    if (record.credit < -0.1) return -1;
    return 0;
  }

  /**
   * Get the confidence level for a parameter's credit assignment.
   * Higher modification count + consistent direction = higher confidence.
   */
  getConfidence(key: string): number {
    const record = this.creditRecords.get(key);
    if (!record) return 0;

    // Confidence grows with sample count (saturates at ~20 samples)
    const countFactor = 1 - Math.exp(-record.modificationCount / 10);

    // Confidence is higher when best and worst deltas have same sign
    const consistencyFactor =
      record.bestCoherenceDelta > 0 && record.worstCoherenceDelta > 0
        ? 1.0
        : record.bestCoherenceDelta < 0 && record.worstCoherenceDelta < 0
          ? 0.8
          : 0.4;

    return countFactor * consistencyFactor;
  }

  // ─── Persistence ────────────────────────────────────────────────

  private persistCreditRecords(): void {
    if (!this.config.enablePersistence) return;
    try {
      fs.mkdirSync(this.config.persistencePath, { recursive: true });
      const file = path.join(this.config.persistencePath, "credit-records.json");
      const data = {
        timestamp: Date.now(),
        records: Object.fromEntries(this.creditRecords),
        coherenceHistory: this.coherenceHistory.slice(-100),
      };
      const tmpFile = file + ".tmp";
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
      fs.renameSync(tmpFile, file);
    } catch {
      // Non-fatal
    }
  }

  private restoreCreditRecords(): void {
    if (!this.config.enablePersistence) return;
    const file = path.join(this.config.persistencePath, "credit-records.json");
    try {
      if (!fs.existsSync(file)) return;
      const raw = fs.readFileSync(file, "utf-8");
      const data = JSON.parse(raw) as {
        records: Record<string, CreditRecord>;
        coherenceHistory?: Array<{ time: number; value: number }>;
      };
      for (const [key, record] of Object.entries(data.records)) {
        this.creditRecords.set(key, record);
      }
      if (data.coherenceHistory) {
        this.coherenceHistory = data.coherenceHistory;
      }
    } catch {
      // Start fresh
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────

  getStats(): {
    activeTraces: number;
    totalRecords: number;
    positiveCredits: number;
    negativeCredits: number;
    coherenceHistoryLength: number;
  } {
    const records = Array.from(this.creditRecords.values());
    return {
      activeTraces: this.activeTraces.length,
      totalRecords: records.length,
      positiveCredits: records.filter((r) => r.credit > 0).length,
      negativeCredits: records.filter((r) => r.credit < 0).length,
      coherenceHistoryLength: this.coherenceHistory.length,
    };
  }
}

export const temporalCreditAssignment = new TemporalCreditAssignment();
