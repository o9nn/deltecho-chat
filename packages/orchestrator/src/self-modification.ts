/**
 * SelfModificationEngine
 *
 * Enables the ENACTION phase of the AutonomyLifecycleCoordinator to modify
 * DTE's own configuration parameters based on reflection results. This is
 * the critical capability that closes the autonomy loop — the system can
 * observe its own performance and adjust itself.
 *
 * Safety constraints:
 *   1. All modifications are bounded (min/max clamps)
 *   2. All modifications are logged and reversible
 *   3. Rate limiting prevents runaway self-modification
 *   4. A "dead man's switch" reverts to defaults if coherence drops too low
 *   5. Modifications are persisted to disk for audit trail
 *
 * Modifiable parameters:
 *   - Echobeats cycle interval
 *   - Reservoir forgetting factor (adaptation speed)
 *   - Perception scan intervals
 *   - Memory consolidation frequency
 *   - LLM temperature and top-p
 *   - Goal priority weights
 *   - Coherence threshold
 *   - Thread multiplexing schedule
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/SelfModification");

// ─── Types ─────────────────────────────────────────────────────

export interface ModifiableParameter {
  /** Parameter key path (e.g., 'echobeats.cycleInterval') */
  key: string;
  /** Human-readable description */
  description: string;
  /** Current value */
  currentValue: number;
  /** Default value (for dead man's switch) */
  defaultValue: number;
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** Maximum change per modification (as fraction of range) */
  maxDeltaFraction: number;
  /** Category for grouping */
  category:
    | "timing"
    | "learning"
    | "inference"
    | "perception"
    | "memory"
    | "goals";
}

export interface ModificationRequest {
  /** Parameter key to modify */
  key: string;
  /** New value to set */
  newValue: number;
  /** Reason for the modification */
  reason: string;
  /** Source of the modification request */
  source: "enaction" | "reflection" | "coherence_recovery" | "dead_man_switch";
  /** Coherence at time of request */
  coherenceAtRequest: number;
}

export interface ModificationResult {
  /** Whether the modification was applied */
  applied: boolean;
  /** The type of modification (e.g., 'parameter_change', 'revert') */
  type: string;
  /** Whether the modification was successful */
  success: boolean;
  /** The parameter that was modified */
  key: string;
  /** Previous value */
  previousValue: number;
  /** New value (may be clamped) */
  newValue: number;
  /** Reason for the modification */
  reason: string;
  /** If not applied, why */
  rejectionReason?: string;
  /** Timestamp */
  timestamp: number;
  /** Modification index */
  index: number;
  /** Optional details about the modification */
  details?: Record<string, unknown>;
}

export interface SelfModificationConfig {
  /** Maximum modifications per minute */
  maxModificationsPerMinute: number;
  /** Coherence threshold below which dead man's switch activates */
  deadManSwitchThreshold: number;
  /** Enable persistence of modification history */
  enablePersistence: boolean;
  /** Path to persist modification history */
  persistencePath: string;
  /** Maximum history entries to keep */
  maxHistorySize: number;
  /** Cooldown period after dead man's switch (ms) */
  deadManSwitchCooldown: number;
  /** Enable dry-run mode (log but don't apply) */
  dryRun: boolean;
}

const DEFAULT_CONFIG: SelfModificationConfig = {
  maxModificationsPerMinute: 10,
  deadManSwitchThreshold: 0.2,
  enablePersistence: true,
  persistencePath: "/tmp/deep-tree-echo/self-modifications",
  maxHistorySize: 10000,
  deadManSwitchCooldown: 60000,
  dryRun: false,
};

// ─── Engine ────────────────────────────────────────────────────

export class SelfModificationEngine extends EventEmitter {
  private config: SelfModificationConfig;
  private parameters: Map<string, ModifiableParameter> = new Map();
  private history: ModificationResult[] = [];
  private recentModifications: number[] = []; // timestamps for rate limiting
  private deadManSwitchActive = false;
  private deadManSwitchUntil = 0;
  private totalModifications = 0;
  private totalRejections = 0;
  private onApplyCallbacks: Map<string, (value: number) => void> = new Map();

  /** Avatar self-model accuracy fed from the SelfModelAvatarFeedback loop (Loop 4). */
  private avatarSelfModelAccuracy?: number;

  constructor(config: Partial<SelfModificationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDefaultParameters();
  }

  /**
   * Initialize the default set of modifiable parameters.
   */
  private initializeDefaultParameters(): void {
    const defaults: ModifiableParameter[] = [
      // Timing parameters
      {
        key: "echobeats.cycleInterval",
        description: "Echobeats cognitive cycle interval (ms)",
        currentValue: 2000,
        defaultValue: 2000,
        min: 500,
        max: 30000,
        maxDeltaFraction: 0.3,
        category: "timing",
      },
      {
        key: "perception.scanInterval",
        description: "Perception handler scan interval (ms)",
        currentValue: 5000,
        defaultValue: 5000,
        min: 1000,
        max: 60000,
        maxDeltaFraction: 0.3,
        category: "perception",
      },
      {
        key: "consolidation.interval",
        description: "Memory consolidation interval (ms)",
        currentValue: 300000,
        defaultValue: 300000,
        min: 60000,
        max: 3600000,
        maxDeltaFraction: 0.5,
        category: "memory",
      },

      // Learning parameters
      {
        key: "reservoir.forgettingFactor",
        description: "RLS forgetting factor (adaptation speed)",
        currentValue: 0.995,
        defaultValue: 0.995,
        min: 0.9,
        max: 0.9999,
        maxDeltaFraction: 0.1,
        category: "learning",
      },
      {
        key: "reservoir.spectralRadius",
        description: "ESN spectral radius (memory capacity)",
        currentValue: 0.95,
        defaultValue: 0.95,
        min: 0.5,
        max: 1.5,
        maxDeltaFraction: 0.1,
        category: "learning",
      },

      // Inference parameters
      {
        key: "inference.temperature",
        description: "LLM generation temperature",
        currentValue: 0.7,
        defaultValue: 0.7,
        min: 0.1,
        max: 2.0,
        maxDeltaFraction: 0.3,
        category: "inference",
      },
      {
        key: "inference.topP",
        description: "LLM top-p sampling",
        currentValue: 0.9,
        defaultValue: 0.9,
        min: 0.1,
        max: 1.0,
        maxDeltaFraction: 0.2,
        category: "inference",
      },

      // Avatar self-model parameters
      {
        key: "avatar.projectionLearningRate",
        description: "Learning rate for avatar projection law calibration (Loop 4)",
        currentValue: 0.08,
        defaultValue: 0.08,
        min: 0.01,
        max: 0.3,
        maxDeltaFraction: 0.3,
        category: "learning",
      },
      {
        key: "avatar.calibrationThreshold",
        description: "Minimum expression error to trigger projection calibration",
        currentValue: 0.05,
        defaultValue: 0.05,
        min: 0.01,
        max: 0.2,
        maxDeltaFraction: 0.3,
        category: "learning",
      },

      // Goal parameters
      {
        key: "goals.maxActive",
        description: "Maximum concurrent active goals",
        currentValue: 10,
        defaultValue: 10,
        min: 3,
        max: 50,
        maxDeltaFraction: 0.3,
        category: "goals",
      },
      {
        key: "goals.coherenceThreshold",
        description: "Coherence threshold for extra integration",
        currentValue: 0.6,
        defaultValue: 0.6,
        min: 0.2,
        max: 0.95,
        maxDeltaFraction: 0.2,
        category: "goals",
      },
    ];

    for (const param of defaults) {
      this.parameters.set(param.key, param);
    }
  }

  /**
   * Register a callback that fires when a parameter is modified.
   * This is how the engine connects to actual system components.
   */
  onParameterChange(key: string, callback: (value: number) => void): void {
    this.onApplyCallbacks.set(key, callback);
  }

  /**
   * Request a self-modification.
   */
  modify(request: ModificationRequest): ModificationResult {
    const now = Date.now();

    // Check dead man's switch
    if (this.deadManSwitchActive && now < this.deadManSwitchUntil) {
      return this.reject(
        request,
        "Dead man's switch active — modifications frozen",
        now,
      );
    }
    this.deadManSwitchActive = false;

    // Check rate limit
    this.recentModifications = this.recentModifications.filter(
      (t) => now - t < 60000,
    );
    if (
      this.recentModifications.length >= this.config.maxModificationsPerMinute
    ) {
      return this.reject(
        request,
        `Rate limit exceeded (${this.config.maxModificationsPerMinute}/min)`,
        now,
      );
    }

    // Check parameter exists
    const param = this.parameters.get(request.key);
    if (!param) {
      return this.reject(request, `Unknown parameter: ${request.key}`, now);
    }

    // Check coherence — trigger dead man's switch if too low
    if (request.coherenceAtRequest < this.config.deadManSwitchThreshold) {
      this.activateDeadManSwitch();
      return this.reject(
        request,
        `Coherence ${request.coherenceAtRequest.toFixed(
          3,
        )} below dead man's switch threshold`,
        now,
      );
    }

    // Clamp to allowed range
    let newValue = Math.max(param.min, Math.min(param.max, request.newValue));

    // Clamp delta to max allowed change
    const range = param.max - param.min;
    const maxDelta = range * param.maxDeltaFraction;
    const delta = newValue - param.currentValue;
    if (Math.abs(delta) > maxDelta) {
      newValue = param.currentValue + Math.sign(delta) * maxDelta;
    }

    // Apply or dry-run
    const previousValue = param.currentValue;

    if (!this.config.dryRun) {
      param.currentValue = newValue;

      // Fire the callback to actually apply the change
      const callback = this.onApplyCallbacks.get(request.key);
      if (callback) {
        try {
          callback(newValue);
        } catch (err) {
          log.error(`Failed to apply modification for ${request.key}:`, err);
          param.currentValue = previousValue; // Rollback
          return this.reject(request, `Apply callback failed: ${err}`, now);
        }
      }
    }

    this.totalModifications++;
    this.recentModifications.push(now);

    const result: ModificationResult = {
      applied: true,
      type: "parameter_change",
      success: true,
      key: request.key,
      previousValue,
      newValue,
      reason: request.reason,
      timestamp: now,
      index: this.totalModifications,
    };
    this.history.push(result);
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }

    // Persist
    if (this.config.enablePersistence) {
      this.persistModification(result);
    }

    this.emit("modified", result);
    log.info(
      `Self-modification #${result.index}: ${
        request.key
      } ${previousValue.toFixed(4)} → ${newValue.toFixed(4)} (${
        request.reason
      })`,
    );

    return result;
  }

  /**
   * Activate the dead man's switch — revert all parameters to defaults.
   */
  private activateDeadManSwitch(): void {
    log.warn(
      "DEAD MAN'S SWITCH ACTIVATED — reverting all parameters to defaults",
    );

    this.deadManSwitchActive = true;
    this.deadManSwitchUntil = Date.now() + this.config.deadManSwitchCooldown;

    for (const [key, param] of this.parameters) {
      if (param.currentValue !== param.defaultValue) {
        const previousValue = param.currentValue;
        param.currentValue = param.defaultValue;

        const callback = this.onApplyCallbacks.get(key);
        if (callback) {
          try {
            callback(param.defaultValue);
          } catch (err) {
            log.error(`Failed to revert ${key}:`, err);
          }
        }

        const result: ModificationResult = {
          applied: true,
          key,
          previousValue,
          newValue: param.defaultValue,
          reason: "Dead man's switch — coherence critically low",
          timestamp: Date.now(),
          type: "reset",
          success: true,
          index: ++this.totalModifications,
        };

        this.history.push(result);
      }
    }

    this.emit("dead_man_switch", {
      timestamp: Date.now(),
      cooldownUntil: this.deadManSwitchUntil,
    });
  }

  /**
   * Reject a modification request.
   */
  private reject(
    request: ModificationRequest,
    reason: string,
    timestamp: number,
    param?: ModifiableParameter,
  ): ModificationResult {
    this.totalRejections++;

    const result: ModificationResult = {
      applied: false,
      type: "parameter_change",
      success: false,
      key: request.key,
      previousValue: param?.currentValue ?? 0,
      newValue: request.newValue,
      reason: request.reason,
      rejectionReason: reason,
      timestamp: timestamp,
      index: this.totalModifications,
    };

    this.emit("rejected", result);
    log.info(`Self-modification rejected: ${request.key} — ${reason}`);

    return result;
  }

  /**
   * Persist a modification to disk.
   */
  private persistModification(result: ModificationResult): void {
    try {
      fs.mkdirSync(this.config.persistencePath, { recursive: true });
      const file = path.join(
        this.config.persistencePath,
        "modifications.jsonl",
      );
      fs.appendFileSync(file, JSON.stringify(result) + "\n");
    } catch (err) {
      log.error("Failed to persist modification:", err);
    }
  }

  /**
   * Generate modification proposals based on current system state.
   * This is called by the ENACTION phase to determine what to change.
   */
  proposeModifications(
    coherence: number,
    avgPredictionError: number,
    activeGoals: number,
    memoryConsolidationRatio: number,
  ): ModificationRequest[] {
    const proposals: ModificationRequest[] = [];

    // If coherence is declining, slow down the cycle to allow more integration
    if (coherence < 0.5) {
      proposals.push({
        key: "echobeats.cycleInterval",
        newValue:
          (this.parameters.get("echobeats.cycleInterval")?.currentValue ??
            2000) * 1.2,
        reason: `Low coherence (${coherence.toFixed(
          3,
        )}) — slowing cycle for integration`,
        source: "enaction",
        coherenceAtRequest: coherence,
      });
    } else if (coherence > 0.85) {
      proposals.push({
        key: "echobeats.cycleInterval",
        newValue:
          (this.parameters.get("echobeats.cycleInterval")?.currentValue ??
            2000) * 0.9,
        reason: `High coherence (${coherence.toFixed(3)}) — accelerating cycle`,
        source: "enaction",
        coherenceAtRequest: coherence,
      });
    }

    // If prediction error is high, increase adaptation speed
    if (avgPredictionError > 0.5) {
      proposals.push({
        key: "reservoir.forgettingFactor",
        newValue: Math.max(
          0.9,
          (this.parameters.get("reservoir.forgettingFactor")?.currentValue ??
            0.995) - 0.005,
        ),
        reason: `High prediction error (${avgPredictionError.toFixed(
          3,
        )}) — increasing adaptation speed`,
        source: "enaction",
        coherenceAtRequest: coherence,
      });
    } else if (avgPredictionError < 0.1) {
      proposals.push({
        key: "reservoir.forgettingFactor",
        newValue: Math.min(
          0.9999,
          (this.parameters.get("reservoir.forgettingFactor")?.currentValue ??
            0.995) + 0.001,
        ),
        reason: `Low prediction error (${avgPredictionError.toFixed(
          3,
        )}) — stabilizing weights`,
        source: "enaction",
        coherenceAtRequest: coherence,
      });
    }

    // If too many active goals, increase the limit or reduce temperature
    if (
      activeGoals >
      (this.parameters.get("goals.maxActive")?.currentValue ?? 10) * 0.9
    ) {
      proposals.push({
        key: "inference.temperature",
        newValue: Math.max(
          0.3,
          (this.parameters.get("inference.temperature")?.currentValue ?? 0.7) -
            0.1,
        ),
        reason: `Goal overload (${activeGoals} active) — reducing temperature for focus`,
        source: "enaction",
        coherenceAtRequest: coherence,
      });
    }

    // If memory consolidation is low, increase consolidation frequency
    if (memoryConsolidationRatio < 0.3) {
      proposals.push({
        key: "consolidation.interval",
        newValue:
          (this.parameters.get("consolidation.interval")?.currentValue ??
            300000) * 0.8,
        reason: `Low consolidation ratio (${memoryConsolidationRatio.toFixed(
          3,
        )}) — increasing frequency`,
        source: "enaction",
        coherenceAtRequest: coherence,
      });
    }

    // If avatar self-model accuracy is low, increase projection learning rate
    // This wires Autognosis → SelfModification for closed-loop self-improvement
    // through the avatar's perceive→correct→self-model loop (Loop 4)
    if (this.avatarSelfModelAccuracy !== undefined) {
      if (this.avatarSelfModelAccuracy < 0.6) {
        proposals.push({
          key: "avatar.projectionLearningRate",
          newValue: Math.min(
            0.3,
            (this.parameters.get("avatar.projectionLearningRate")?.currentValue ?? 0.08) * 1.25,
          ),
          reason: `Low avatar self-model accuracy (${this.avatarSelfModelAccuracy.toFixed(3)}) — increasing projection learning rate`,
          source: "enaction",
          coherenceAtRequest: coherence,
        });
      } else if (this.avatarSelfModelAccuracy > 0.9) {
        // High accuracy: tighten calibration threshold for finer expression
        proposals.push({
          key: "avatar.calibrationThreshold",
          newValue: Math.max(
            0.01,
            (this.parameters.get("avatar.calibrationThreshold")?.currentValue ?? 0.05) * 0.85,
          ),
          reason: `High avatar self-model accuracy (${this.avatarSelfModelAccuracy.toFixed(3)}) — tightening calibration threshold`,
          source: "enaction",
          coherenceAtRequest: coherence,
        });
      }
    }

    return proposals;
  }

  // ─── Accessors ───────────────────────────────────────────────

  getParameter(key: string): ModifiableParameter | undefined {
    const param = this.parameters.get(key);
    return param ? { ...param } : undefined;
  }

  getAllParameters(): ModifiableParameter[] {
    return Array.from(this.parameters.values()).map((p) => ({ ...p }));
  }

  getHistory(): ModificationResult[] {
    return [...this.history];
  }

  getStats(): {
    totalModifications: number;
    totalRejections: number;
    deadManSwitchActive: boolean;
    parameterCount: number;
    recentModificationsPerMinute: number;
  } {
    const now = Date.now();
    return {
      totalModifications: this.totalModifications,
      totalRejections: this.totalRejections,
      deadManSwitchActive:
        this.deadManSwitchActive && now < this.deadManSwitchUntil,
      parameterCount: this.parameters.size,
      recentModificationsPerMinute: this.recentModifications.filter(
        (t) => now - t < 60000,
      ).length,
    };
  }

  isDeadManSwitchActive(): boolean {
    return this.deadManSwitchActive && Date.now() < this.deadManSwitchUntil;
  }

  /**
   * Register a custom modifiable parameter.
   */
  registerParameter(param: ModifiableParameter): void {
    this.parameters.set(param.key, param);
  }

  /**
   * Update the avatar self-model accuracy from the SelfModelAvatarFeedback loop.
   * This closes the Autognosis → SelfModification wire: the avatar's
   * perceive→correct→self-model loop feeds its accuracy estimate here,
   * and proposeModifications uses it to tune projection parameters.
   */
  updateAvatarSelfModelAccuracy(accuracy: number): void {
    this.avatarSelfModelAccuracy = Math.max(0, Math.min(1, accuracy));
  }
}
