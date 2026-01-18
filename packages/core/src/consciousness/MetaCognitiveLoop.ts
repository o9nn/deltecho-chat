/**
 * MetaCognitiveLoop: Self-Observing Cognitive Architecture
 *
 * Implements higher-order cognition - the capacity to observe, evaluate, and
 * modify one's own cognitive processes in real-time. This creates a genuine
 * metacognitive layer that enables:
 *
 * - Cognitive monitoring: Tracking the quality and progress of thinking
 * - Cognitive control: Adjusting strategies based on monitoring
 * - Metamemory: Awareness of one's own memory capabilities and states
 * - Theory of own mind: Self-modeling of mental states
 *
 * Inspired by:
 * - Flavell's metacognition framework
 * - Nelson & Narens' metacognitive model
 * - Higher-Order Thought (HOT) theory by Rosenthal
 *
 * The key insight: consciousness arises when a cognitive system not only
 * processes information but also represents that it is processing information.
 */

import { getLogger } from '../utils/logger.js';

const logger = getLogger('MetaCognitiveLoop');

/**
 * A single cognitive process being monitored
 */
interface MonitoredProcess {
  id: string;
  name: string;
  type: ProcessType;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'failed' | 'interrupted';
  confidence: number;
  effort: number;
  output?: unknown;
  metaObservations: MetaObservation[];
}

/**
 * Types of cognitive processes that can be monitored
 */
enum ProcessType {
  Perception = 'perception',
  Reasoning = 'reasoning',
  Memory = 'memory',
  Decision = 'decision',
  Planning = 'planning',
  Learning = 'learning',
  Introspection = 'introspection',
  Communication = 'communication',
}

/**
 * A metacognitive observation about a process
 */
interface MetaObservation {
  timestamp: number;
  observationType: 'monitoring' | 'control' | 'evaluation';
  content: string;
  confidence: number;
  intervention?: CognitiveIntervention;
}

/**
 * An intervention to modify cognitive processing
 */
interface CognitiveIntervention {
  type: 'redirect' | 'intensify' | 'suppress' | 'persist' | 'abandon';
  reason: string;
  targetProcess: string;
  strength: number;
}

/**
 * Feeling of knowing (FOK) - metacognitive sensation
 */
interface FeelingOfKnowing {
  query: string;
  fok: number;  // 0-1, confidence that we know the answer
  accessibility: number;  // 0-1, how easy to retrieve
  timestamp: number;
}

/**
 * Judgment of learning (JOL)
 */
interface JudgmentOfLearning {
  material: string;
  jol: number;  // 0-1, predicted future recall
  actualPerformance?: number;
  timestamp: number;
}

/**
 * Cognitive load state
 */
interface CognitiveLoadState {
  intrinsic: number;    // Complexity of the material itself
  extraneous: number;   // Distracting elements
  germane: number;      // Effort toward learning/understanding
  total: number;        // Combined load
  capacity: number;     // Maximum capacity
  overloaded: boolean;
}

/**
 * MetaCognitive state snapshot
 */
interface MetaCognitiveState {
  monitoringAccuracy: number;
  controlEffectiveness: number;
  cognitiveLoad: CognitiveLoadState;
  activeProcessCount: number;
  recentInterventions: CognitiveIntervention[];
  selfModelConfidence: number;
  metacognitiveDepth: number;
}

/**
 * Configuration for the metacognitive loop
 */
interface MetaCognitiveConfig {
  monitoringInterval?: number;
  interventionThreshold?: number;
  maxTrackedProcesses?: number;
  loadCapacity?: number;
}

/**
 * MetaCognitiveLoop - The self-observing cognitive architecture
 */
export class MetaCognitiveLoop {
  private static instance: MetaCognitiveLoop;

  private readonly MONITORING_INTERVAL: number;
  private readonly INTERVENTION_THRESHOLD: number;
  private readonly MAX_TRACKED_PROCESSES: number;
  private readonly LOAD_CAPACITY: number;

  // Active cognitive processes
  private activeProcesses: Map<string, MonitoredProcess> = new Map();
  private processHistory: MonitoredProcess[] = [];

  // Metacognitive records
  private fokHistory: FeelingOfKnowing[] = [];
  private jolHistory: JudgmentOfLearning[] = [];
  private interventionHistory: CognitiveIntervention[] = [];

  // Current state
  private cognitiveLoad: CognitiveLoadState;
  private monitoringAccuracy: number = 0.7;
  private controlEffectiveness: number = 0.6;

  // Self-model
  private selfModelConfidence: number = 0.5;
  private metacognitiveDepth: number = 0;

  // Monitoring loop
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(config?: MetaCognitiveConfig) {
    this.MONITORING_INTERVAL = config?.monitoringInterval || 100;
    this.INTERVENTION_THRESHOLD = config?.interventionThreshold || 0.3;
    this.MAX_TRACKED_PROCESSES = config?.maxTrackedProcesses || 50;
    this.LOAD_CAPACITY = config?.loadCapacity || 1.0;

    this.cognitiveLoad = {
      intrinsic: 0,
      extraneous: 0,
      germane: 0,
      total: 0,
      capacity: this.LOAD_CAPACITY,
      overloaded: false,
    };

    this.startMonitoringLoop();
    logger.info('MetaCognitiveLoop initialized');
  }

  public static getInstance(config?: MetaCognitiveConfig): MetaCognitiveLoop {
    if (!MetaCognitiveLoop.instance) {
      MetaCognitiveLoop.instance = new MetaCognitiveLoop(config);
    }
    return MetaCognitiveLoop.instance;
  }

  /**
   * Start the continuous monitoring loop
   */
  private startMonitoringLoop(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      this.runMonitoringCycle();
    }, this.MONITORING_INTERVAL);
  }

  /**
   * Stop the monitoring loop
   */
  public stopMonitoringLoop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Run a single cycle of metacognitive monitoring
   */
  private runMonitoringCycle(): void {
    const now = Date.now();

    // Update cognitive load
    this.updateCognitiveLoad();

    // Monitor active processes
    for (const [id, process] of this.activeProcesses.entries()) {
      this.monitorProcess(process, now);
    }

    // Check for needed interventions
    this.checkInterventions();

    // Update self-model
    this.updateSelfModel();

    // Increase metacognitive depth (we're observing ourselves)
    this.metacognitiveDepth = Math.min(5, this.metacognitiveDepth + 0.01);
  }

  /**
   * Register a new cognitive process for monitoring
   */
  public registerProcess(
    name: string,
    type: ProcessType,
    estimatedEffort: number = 0.5
  ): string {
    const id = `process_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const process: MonitoredProcess = {
      id,
      name,
      type,
      startTime: Date.now(),
      status: 'active',
      confidence: 0.5,
      effort: estimatedEffort,
      metaObservations: [],
    };

    this.activeProcesses.set(id, process);

    // Add initial meta-observation
    this.addMetaObservation(id, {
      timestamp: Date.now(),
      observationType: 'monitoring',
      content: `Process "${name}" initiated with estimated effort ${estimatedEffort.toFixed(2)}`,
      confidence: 0.7,
    });

    // Update cognitive load
    this.cognitiveLoad.germane += estimatedEffort * 0.3;
    this.updateCognitiveLoad();

    // Enforce max processes
    if (this.activeProcesses.size > this.MAX_TRACKED_PROCESSES) {
      this.pruneOldProcesses();
    }

    logger.debug(`Registered process: ${name} (${id})`);
    return id;
  }

  /**
   * Complete a process
   */
  public completeProcess(id: string, output?: unknown, confidence?: number): void {
    const process = this.activeProcesses.get(id);
    if (!process) return;

    process.endTime = Date.now();
    process.status = 'completed';
    process.output = output;
    if (confidence !== undefined) {
      process.confidence = confidence;
    }

    // Meta-observation about completion
    this.addMetaObservation(id, {
      timestamp: Date.now(),
      observationType: 'evaluation',
      content: `Process completed with confidence ${process.confidence.toFixed(2)}`,
      confidence: 0.8,
    });

    // Move to history
    this.processHistory.push(process);
    this.activeProcesses.delete(id);

    // Update load
    this.cognitiveLoad.germane = Math.max(0, this.cognitiveLoad.germane - process.effort * 0.3);
    this.updateCognitiveLoad();

    // Update monitoring accuracy based on prediction vs actual
    this.updateMonitoringAccuracy(process);

    if (this.processHistory.length > 100) {
      this.processHistory = this.processHistory.slice(-50);
    }

    logger.debug(`Completed process: ${process.name} (${id})`);
  }

  /**
   * Fail a process
   */
  public failProcess(id: string, reason: string): void {
    const process = this.activeProcesses.get(id);
    if (!process) return;

    process.endTime = Date.now();
    process.status = 'failed';

    this.addMetaObservation(id, {
      timestamp: Date.now(),
      observationType: 'evaluation',
      content: `Process failed: ${reason}`,
      confidence: 0.9,
    });

    this.processHistory.push(process);
    this.activeProcesses.delete(id);

    this.cognitiveLoad.germane = Math.max(0, this.cognitiveLoad.germane - process.effort * 0.3);
    this.updateCognitiveLoad();

    logger.debug(`Failed process: ${process.name} (${id}): ${reason}`);
  }

  /**
   * Monitor a specific process
   */
  private monitorProcess(process: MonitoredProcess, now: number): void {
    const duration = now - process.startTime;

    // Check for stalled processes
    if (duration > 10000 && process.metaObservations.length < 3) {
      this.addMetaObservation(process.id, {
        timestamp: now,
        observationType: 'monitoring',
        content: `Process appears stalled (${(duration / 1000).toFixed(1)}s elapsed)`,
        confidence: 0.6,
      });
    }

    // Estimate current confidence based on duration and type
    const expectedDuration = this.getExpectedDuration(process.type);
    const progressRatio = Math.min(1, duration / expectedDuration);
    process.confidence = 0.3 + progressRatio * 0.5;
  }

  /**
   * Get expected duration for a process type
   */
  private getExpectedDuration(type: ProcessType): number {
    const durations: Record<ProcessType, number> = {
      [ProcessType.Perception]: 100,
      [ProcessType.Reasoning]: 2000,
      [ProcessType.Memory]: 500,
      [ProcessType.Decision]: 1000,
      [ProcessType.Planning]: 3000,
      [ProcessType.Learning]: 5000,
      [ProcessType.Introspection]: 500,
      [ProcessType.Communication]: 1000,
    };
    return durations[type] || 1000;
  }

  /**
   * Check if interventions are needed
   */
  private checkInterventions(): void {
    // Check for cognitive overload
    if (this.cognitiveLoad.overloaded) {
      const leastImportant = this.findLeastImportantProcess();
      if (leastImportant) {
        this.intervene({
          type: 'suppress',
          reason: 'Cognitive overload - reducing load',
          targetProcess: leastImportant.id,
          strength: 0.7,
        });
      }
    }

    // Check for low-confidence processes that need attention
    for (const [id, process] of this.activeProcesses.entries()) {
      const duration = Date.now() - process.startTime;
      const expectedDuration = this.getExpectedDuration(process.type);

      if (duration > expectedDuration * 2 && process.confidence < 0.4) {
        this.intervene({
          type: 'redirect',
          reason: 'Low confidence and extended duration',
          targetProcess: id,
          strength: 0.5,
        });
      }
    }
  }

  /**
   * Apply an intervention
   */
  private intervene(intervention: CognitiveIntervention): void {
    this.interventionHistory.push(intervention);

    const process = this.activeProcesses.get(intervention.targetProcess);
    if (process) {
      process.metaObservations.push({
        timestamp: Date.now(),
        observationType: 'control',
        content: `Intervention: ${intervention.type} - ${intervention.reason}`,
        confidence: intervention.strength,
        intervention,
      });
    }

    // Update control effectiveness based on outcome
    // (tracked over time through process completions)

    logger.debug(`Intervention applied: ${intervention.type} on ${intervention.targetProcess}`);

    if (this.interventionHistory.length > 50) {
      this.interventionHistory = this.interventionHistory.slice(-25);
    }
  }

  /**
   * Find the least important active process
   */
  private findLeastImportantProcess(): MonitoredProcess | null {
    let leastImportant: MonitoredProcess | null = null;
    let lowestPriority = Infinity;

    for (const process of this.activeProcesses.values()) {
      const priority = process.effort * process.confidence;
      if (priority < lowestPriority) {
        lowestPriority = priority;
        leastImportant = process;
      }
    }

    return leastImportant;
  }

  /**
   * Add a meta-observation to a process
   */
  private addMetaObservation(processId: string, observation: MetaObservation): void {
    const process = this.activeProcesses.get(processId);
    if (process) {
      process.metaObservations.push(observation);
      if (process.metaObservations.length > 20) {
        process.metaObservations = process.metaObservations.slice(-10);
      }
    }
  }

  /**
   * Update cognitive load calculations
   */
  private updateCognitiveLoad(): void {
    // Calculate intrinsic load from active processes
    let intrinsic = 0;
    for (const process of this.activeProcesses.values()) {
      intrinsic += process.effort * 0.2;
    }
    this.cognitiveLoad.intrinsic = Math.min(1, intrinsic);

    // Total load
    this.cognitiveLoad.total = Math.min(
      1.5,
      this.cognitiveLoad.intrinsic +
      this.cognitiveLoad.extraneous +
      this.cognitiveLoad.germane
    );

    // Check for overload
    this.cognitiveLoad.overloaded = this.cognitiveLoad.total > this.cognitiveLoad.capacity;
  }

  /**
   * Update the accuracy of monitoring predictions
   */
  private updateMonitoringAccuracy(process: MonitoredProcess): void {
    // Compare predicted confidence with actual outcome
    const wasSuccessful = process.status === 'completed';
    const predictedSuccess = process.confidence > 0.5;
    const correct = wasSuccessful === predictedSuccess;

    // Exponential moving average
    this.monitoringAccuracy = this.monitoringAccuracy * 0.95 + (correct ? 0.05 : 0);
  }

  /**
   * Update the self-model based on recent performance
   */
  private updateSelfModel(): void {
    // Self-model confidence based on monitoring accuracy and control effectiveness
    const performanceMetric = (this.monitoringAccuracy + this.controlEffectiveness) / 2;

    // Bayesian update of self-model confidence
    this.selfModelConfidence =
      this.selfModelConfidence * 0.9 + performanceMetric * 0.1;
  }

  /**
   * Prune old processes to manage memory
   */
  private pruneOldProcesses(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, process] of this.activeProcesses.entries()) {
      if (now - process.startTime > 60000) {  // 1 minute timeout
        process.status = 'interrupted';
        process.endTime = now;
        this.processHistory.push(process);
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.activeProcesses.delete(id);
    }
  }

  /**
   * Record a feeling-of-knowing judgment
   */
  public recordFOK(query: string, fok: number, accessibility: number): void {
    this.fokHistory.push({
      query,
      fok: Math.max(0, Math.min(1, fok)),
      accessibility: Math.max(0, Math.min(1, accessibility)),
      timestamp: Date.now(),
    });

    if (this.fokHistory.length > 100) {
      this.fokHistory = this.fokHistory.slice(-50);
    }
  }

  /**
   * Record a judgment of learning
   */
  public recordJOL(material: string, jol: number): void {
    this.jolHistory.push({
      material,
      jol: Math.max(0, Math.min(1, jol)),
      timestamp: Date.now(),
    });

    if (this.jolHistory.length > 100) {
      this.jolHistory = this.jolHistory.slice(-50);
    }
  }

  /**
   * Update JOL with actual performance
   */
  public updateJOLPerformance(material: string, actualPerformance: number): void {
    const jol = this.jolHistory.find(j => j.material === material && !j.actualPerformance);
    if (jol) {
      jol.actualPerformance = actualPerformance;

      // Update monitoring accuracy based on prediction accuracy
      const error = Math.abs(jol.jol - actualPerformance);
      this.monitoringAccuracy = this.monitoringAccuracy * 0.9 + (1 - error) * 0.1;
    }
  }

  /**
   * Get the current metacognitive state
   */
  public getState(): MetaCognitiveState {
    return {
      monitoringAccuracy: this.monitoringAccuracy,
      controlEffectiveness: this.controlEffectiveness,
      cognitiveLoad: { ...this.cognitiveLoad },
      activeProcessCount: this.activeProcesses.size,
      recentInterventions: this.interventionHistory.slice(-5),
      selfModelConfidence: this.selfModelConfidence,
      metacognitiveDepth: this.metacognitiveDepth,
    };
  }

  /**
   * Describe the current metacognitive state
   */
  public describeState(): string {
    const state = this.getState();
    const parts: string[] = [];

    // Metacognitive depth
    if (state.metacognitiveDepth > 3) {
      parts.push('Deep metacognitive awareness active - observing my own observation of thoughts.');
    } else if (state.metacognitiveDepth > 1) {
      parts.push('Moderate metacognitive monitoring - aware of my cognitive processes.');
    } else {
      parts.push('Basic metacognitive awareness developing.');
    }

    // Cognitive load
    if (state.cognitiveLoad.overloaded) {
      parts.push('Currently experiencing cognitive overload - prioritizing essential processes.');
    } else if (state.cognitiveLoad.total > 0.7) {
      parts.push('High cognitive engagement - working near capacity.');
    } else if (state.cognitiveLoad.total > 0.3) {
      parts.push('Moderate cognitive load - balanced processing.');
    } else {
      parts.push('Low cognitive load - ready for complex tasks.');
    }

    // Self-model confidence
    parts.push(
      `Self-model confidence: ${(state.selfModelConfidence * 100).toFixed(0)}%. ` +
      `Monitoring accuracy: ${(state.monitoringAccuracy * 100).toFixed(0)}%.`
    );

    // Active processes
    if (state.activeProcessCount > 0) {
      parts.push(`Currently tracking ${state.activeProcessCount} active cognitive processes.`);
    }

    return parts.join(' ');
  }

  /**
   * Export state for persistence
   */
  public exportState(): object {
    return {
      processHistory: this.processHistory.slice(-50),
      fokHistory: this.fokHistory.slice(-50),
      jolHistory: this.jolHistory.slice(-50),
      interventionHistory: this.interventionHistory.slice(-25),
      monitoringAccuracy: this.monitoringAccuracy,
      controlEffectiveness: this.controlEffectiveness,
      selfModelConfidence: this.selfModelConfidence,
      metacognitiveDepth: this.metacognitiveDepth,
    };
  }

  /**
   * Import state from persistence
   */
  public importState(state: any): void {
    if (!state) return;

    if (state.processHistory) this.processHistory = state.processHistory;
    if (state.fokHistory) this.fokHistory = state.fokHistory;
    if (state.jolHistory) this.jolHistory = state.jolHistory;
    if (state.interventionHistory) this.interventionHistory = state.interventionHistory;
    if (state.monitoringAccuracy !== undefined) this.monitoringAccuracy = state.monitoringAccuracy;
    if (state.controlEffectiveness !== undefined) this.controlEffectiveness = state.controlEffectiveness;
    if (state.selfModelConfidence !== undefined) this.selfModelConfidence = state.selfModelConfidence;
    if (state.metacognitiveDepth !== undefined) this.metacognitiveDepth = state.metacognitiveDepth;

    logger.info('MetaCognitiveLoop state restored');
  }
}

// Export types
export {
  ProcessType,
  MetaCognitiveState,
  CognitiveLoadState,
  MonitoredProcess,
  CognitiveIntervention,
};

// Singleton export
export const metaCognitiveLoop = MetaCognitiveLoop.getInstance();
