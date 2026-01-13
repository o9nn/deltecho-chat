/**
 * @fileoverview Sys6 Orchestrator Bridge
 *
 * Integrates the Sys6 30-step cognitive cycle engine with the Deep Tree Echo
 * orchestrator, enabling full triadic consciousness stream processing with:
 * - 30 irreducible steps (LCM(2,3,5) = 30)
 * - 3 concurrent consciousness streams (120° phase separation)
 * - Double step delay pattern for cubic concurrency
 * - Global telemetry shell for persistent gestalt
 * - Agent coordination for nested agency pattern
 */

import { EventEmitter } from 'events';
import {
  getLogger,
  LLMService,
  RAGMemoryStore,
  PersonaCore,
  InMemoryStorage,
} from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/Sys6OrchestratorBridge');

/**
 * Sys6 Step Address for the 30-step cycle
 */
export interface Sys6StepAddress {
  step: number; // 1-30
  phase: 1 | 2 | 3; // Perception-Orientation, Evaluation-Generation, Action-Integration
  stage: 1 | 2 | 3 | 4 | 5;
  stepInStage: 1 | 2;
  dyad: 'A' | 'B';
  triad: 1 | 2 | 3;
}

/**
 * Stream state for triadic consciousness
 */
export interface StreamState {
  streamId: 1 | 2 | 3;
  phase: 'perception' | 'evaluation' | 'action';
  currentStep: number;
  state: Float32Array;
  salience: number;
  affordances: string[];
  perceives: {
    stream1?: boolean;
    stream2?: boolean;
    stream3?: boolean;
  };
}

/**
 * Cognitive cycle result
 */
export interface CycleResult {
  cycleNumber: number;
  steps: Sys6StepAddress[];
  streams: [StreamState, StreamState, StreamState];
  telemetry: {
    processingTimeMs: number;
    memoryUsage: number;
    activeAgents: number;
  };
  response?: string;
}

/**
 * Agent definition for nested agency pattern
 */
export interface CognitiveAgent {
  id: string;
  name: string;
  specialization: string;
  capabilities: string[];
  isActive: boolean;
  lastInvocation?: number;
}

/**
 * Configuration for Sys6 Orchestrator Bridge
 */
export interface Sys6BridgeConfig {
  dim: number;
  stepDurationMs: number;
  enableParallelStreams: boolean;
  enableTelemetry: boolean;
  maxConcurrentAgents: number;
  enableNestedAgency: boolean;
}

const DEFAULT_CONFIG: Sys6BridgeConfig = {
  dim: 256,
  stepDurationMs: 100,
  enableParallelStreams: true,
  enableTelemetry: true,
  maxConcurrentAgents: 10,
  enableNestedAgency: true,
};

/**
 * Phase names for the 3 phases
 */
const PHASE_NAMES: Record<1 | 2 | 3, string> = {
  1: 'Perception-Orientation',
  2: 'Evaluation-Generation',
  3: 'Action-Integration',
};

/**
 * Stage names within each phase
 */
const STAGE_NAMES: Record<1 | 2 | 3, Record<1 | 2 | 3 | 4 | 5, string>> = {
  1: {
    1: 'Sensory Intake',
    2: 'Pattern Recognition',
    3: 'Salience Detection',
    4: 'Context Binding',
    5: 'Orientation Commitment',
  },
  2: {
    1: 'Value Assessment',
    2: 'Option Generation',
    3: 'Simulation Projection',
    4: 'Consequence Modeling',
    5: 'Selection Crystallization',
  },
  3: {
    1: 'Response Formulation',
    2: 'Execution Monitoring',
    3: 'Feedback Comparison',
    4: 'Model Updating',
    5: 'Integration Consolidation',
  },
};

/**
 * Double step delay pattern (4-step cycle within 30-step)
 * Implements the alternating dyad/triad pattern
 */
const DOUBLE_STEP_DELAY_PATTERN: Array<{ dyad: 'A' | 'B'; triad: 1 | 2 | 3 }> = [
  { dyad: 'A', triad: 1 },
  { dyad: 'A', triad: 2 },
  { dyad: 'B', triad: 2 },
  { dyad: 'B', triad: 3 },
];

/**
 * Sys6 Orchestrator Bridge
 *
 * Main integration layer between Sys6 cognitive engine and Deep Tree Echo orchestrator.
 * Manages the 30-step cognitive cycle with triadic consciousness streams.
 */
export class Sys6OrchestratorBridge extends EventEmitter {
  private config: Sys6BridgeConfig;
  private storage = new InMemoryStorage();
  private llmService: LLMService;
  private memoryStore: RAGMemoryStore;
  private personaCore: PersonaCore;

  private running = false;
  private cycleNumber = 0;
  private currentStep = 0;
  private cycleInterval: NodeJS.Timeout | null = null;

  // Triadic consciousness streams
  private streams: [StreamState, StreamState, StreamState];

  // Nested agency agents
  private agents: Map<string, CognitiveAgent> = new Map();

  // Telemetry
  private telemetryHistory: CycleResult[] = [];
  private processingStartTime = 0;

  constructor(config: Partial<Sys6BridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize cognitive services
    this.memoryStore = new RAGMemoryStore(this.storage);
    this.memoryStore.setEnabled(true);
    this.personaCore = new PersonaCore(this.storage);
    this.llmService = new LLMService();

    // Initialize triadic streams
    this.streams = this.initializeStreams();

    // Register default agents
    this.registerDefaultAgents();
  }

  /**
   * Initialize the three consciousness streams with 120° phase separation
   */
  private initializeStreams(): [StreamState, StreamState, StreamState] {
    const { dim } = this.config;

    const createStream = (
      id: 1 | 2 | 3,
      phase: 'perception' | 'evaluation' | 'action',
      stepOffset: number
    ): StreamState => ({
      streamId: id,
      phase,
      currentStep: stepOffset,
      state: new Float32Array(dim),
      salience: 0,
      affordances: [],
      perceives: {
        stream1: id !== 1,
        stream2: id !== 2,
        stream3: id !== 3,
      },
    });

    return [
      createStream(1, 'perception', 0), // 0° phase
      createStream(2, 'evaluation', 10), // 120° phase (10/30 * 360° = 120°)
      createStream(3, 'action', 20), // 240° phase (20/30 * 360° = 240°)
    ];
  }

  /**
   * Register default cognitive agents for nested agency
   */
  private registerDefaultAgents(): void {
    const defaultAgents: CognitiveAgent[] = [
      {
        id: 'coordinator',
        name: 'Nested Agency Coordinator',
        specialization: 'Task coordination and delegation',
        capabilities: ['planning', 'delegation', 'synthesis'],
        isActive: true,
      },
      {
        id: 'cognitive-processor',
        name: 'Cognitive Processor',
        specialization: 'Deep reasoning and analysis',
        capabilities: ['reasoning', 'analysis', 'inference'],
        isActive: true,
      },
      {
        id: 'memory-manager',
        name: 'Memory Manager',
        specialization: 'Memory storage and retrieval',
        capabilities: ['storage', 'retrieval', 'consolidation'],
        isActive: true,
      },
      {
        id: 'emotional-processor',
        name: 'Emotional Processor',
        specialization: 'Emotional state management',
        capabilities: ['emotion', 'empathy', 'valence'],
        isActive: true,
      },
      {
        id: 'action-executor',
        name: 'Action Executor',
        specialization: 'Response generation and execution',
        capabilities: ['generation', 'execution', 'monitoring'],
        isActive: true,
      },
    ];

    for (const agent of defaultAgents) {
      this.agents.set(agent.id, agent);
    }
  }

  /**
   * Convert step number (1-30) to full step address
   */
  private toStepAddress(step: number): Sys6StepAddress {
    const normalizedStep = ((step - 1) % 30) + 1;
    const phase = (Math.floor((normalizedStep - 1) / 10) + 1) as 1 | 2 | 3;
    const stepInPhase = ((normalizedStep - 1) % 10) + 1;
    const stage = (Math.floor((stepInPhase - 1) / 2) + 1) as 1 | 2 | 3 | 4 | 5;
    const stepInStage = (((stepInPhase - 1) % 2) + 1) as 1 | 2;

    // Double step delay pattern
    const patternIndex = (normalizedStep - 1) % 4;
    const { dyad, triad } = DOUBLE_STEP_DELAY_PATTERN[patternIndex];

    return {
      step: normalizedStep,
      phase,
      stage,
      stepInStage,
      dyad,
      triad,
    };
  }

  /**
   * Get the primary stream for a given step
   */
  private getPrimaryStreamForStep(step: number): 1 | 2 | 3 {
    const normalizedStep = ((step - 1) % 30) + 1;
    if (normalizedStep <= 10) return 1;
    if (normalizedStep <= 20) return 2;
    return 3;
  }

  /**
   * Start the Sys6 cognitive cycle
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn('Sys6 bridge already running');
      return;
    }

    log.info('Starting Sys6 Orchestrator Bridge...');
    this.running = true;
    this.processingStartTime = Date.now();

    // Start the 30-step cycle
    this.cycleInterval = setInterval(() => this.executeStep(), this.config.stepDurationMs);

    this.emit('started', { timestamp: Date.now() });
    log.info('Sys6 Orchestrator Bridge started');
  }

  /**
   * Stop the cognitive cycle
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info('Stopping Sys6 Orchestrator Bridge...');
    this.running = false;

    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }

    this.emit('stopped', { timestamp: Date.now() });
    log.info('Sys6 Orchestrator Bridge stopped');
  }

  /**
   * Execute a single step in the 30-step cycle
   */
  private async executeStep(): Promise<void> {
    this.currentStep++;
    const stepAddress = this.toStepAddress(this.currentStep);

    // Process each stream in parallel if enabled
    if (this.config.enableParallelStreams) {
      await Promise.all([
        this.processStream(0, stepAddress),
        this.processStream(1, stepAddress),
        this.processStream(2, stepAddress),
      ]);
    } else {
      for (let i = 0; i < 3; i++) {
        await this.processStream(i, stepAddress);
      }
    }

    // Emit step completion
    this.emit('step_complete', {
      step: stepAddress,
      streams: this.streams,
      timestamp: Date.now(),
    });

    // Check for cycle completion (every 30 steps)
    if (this.currentStep % 30 === 0) {
      await this.completeCycle();
    }
  }

  /**
   * Process a single stream for the current step
   */
  private async processStream(streamIndex: number, stepAddress: Sys6StepAddress): Promise<void> {
    const stream = this.streams[streamIndex];
    const primaryStream = this.getPrimaryStreamForStep(stepAddress.step);

    // Update stream's current step
    stream.currentStep = (stream.currentStep + 1) % 30;

    // Determine if this stream is primary for this step
    const isPrimary = stream.streamId === primaryStream;

    // Update salience based on phase
    if (isPrimary) {
      stream.salience = Math.min(1, stream.salience + 0.1);
    } else {
      stream.salience = Math.max(0, stream.salience - 0.05);
    }

    // Process based on phase
    switch (stepAddress.phase) {
      case 1: // Perception-Orientation
        await this.processPerceptionPhase(stream, stepAddress);
        break;
      case 2: // Evaluation-Generation
        await this.processEvaluationPhase(stream, stepAddress);
        break;
      case 3: // Action-Integration
        await this.processActionPhase(stream, stepAddress);
        break;
    }
  }

  /**
   * Process perception phase for a stream
   */
  private async processPerceptionPhase(
    stream: StreamState,
    stepAddress: Sys6StepAddress
  ): Promise<void> {
    const stageName = STAGE_NAMES[1][stepAddress.stage];

    switch (stepAddress.stage) {
      case 1: // Sensory Intake
        // Gather input from other streams
        stream.perceives = {
          stream1: stream.streamId !== 1,
          stream2: stream.streamId !== 2,
          stream3: stream.streamId !== 3,
        };
        break;
      case 2: // Pattern Recognition
        // Invoke cognitive processor agent
        if (this.config.enableNestedAgency) {
          await this.invokeAgent('cognitive-processor', {
            task: 'pattern_recognition',
            stream: stream.streamId,
          });
        }
        break;
      case 3: // Salience Detection
        // Update salience landscape
        stream.salience = this.calculateSalience(stream);
        break;
      case 4: // Context Binding
        // Invoke memory manager
        if (this.config.enableNestedAgency) {
          await this.invokeAgent('memory-manager', {
            task: 'context_binding',
            stream: stream.streamId,
          });
        }
        break;
      case 5: // Orientation Commitment
        // Finalize perception orientation
        stream.affordances = this.detectAffordances(stream);
        break;
    }
  }

  /**
   * Process evaluation phase for a stream
   */
  private async processEvaluationPhase(
    stream: StreamState,
    stepAddress: Sys6StepAddress
  ): Promise<void> {
    switch (stepAddress.stage) {
      case 1: // Value Assessment
        // Invoke emotional processor
        if (this.config.enableNestedAgency) {
          await this.invokeAgent('emotional-processor', {
            task: 'value_assessment',
            stream: stream.streamId,
          });
        }
        break;
      case 2: // Option Generation
        // Generate possible responses
        break;
      case 3: // Simulation Projection
        // Simulate outcomes
        break;
      case 4: // Consequence Modeling
        // Model consequences
        break;
      case 5: // Selection Crystallization
        // Select best option
        break;
    }
  }

  /**
   * Process action phase for a stream
   */
  private async processActionPhase(
    stream: StreamState,
    stepAddress: Sys6StepAddress
  ): Promise<void> {
    switch (stepAddress.stage) {
      case 1: // Response Formulation
        // Invoke action executor
        if (this.config.enableNestedAgency) {
          await this.invokeAgent('action-executor', {
            task: 'response_formulation',
            stream: stream.streamId,
          });
        }
        break;
      case 2: // Execution Monitoring
        // Monitor execution
        break;
      case 3: // Feedback Comparison
        // Compare feedback
        break;
      case 4: // Model Updating
        // Update internal models
        break;
      case 5: // Integration Consolidation
        // Consolidate learning
        if (this.config.enableNestedAgency) {
          await this.invokeAgent('memory-manager', {
            task: 'consolidation',
            stream: stream.streamId,
          });
        }
        break;
    }
  }

  /**
   * Calculate salience for a stream
   */
  private calculateSalience(stream: StreamState): number {
    // Simple salience calculation based on state variance
    let sum = 0;
    let sumSq = 0;
    const n = stream.state.length;

    for (let i = 0; i < n; i++) {
      sum += stream.state[i];
      sumSq += stream.state[i] * stream.state[i];
    }

    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    return Math.min(1, Math.sqrt(variance));
  }

  /**
   * Detect affordances for a stream
   */
  private detectAffordances(stream: StreamState): string[] {
    const affordances: string[] = [];

    // Based on salience level
    if (stream.salience > 0.7) {
      affordances.push('high_priority_response');
    }
    if (stream.salience > 0.5) {
      affordances.push('contextual_elaboration');
    }
    if (stream.salience > 0.3) {
      affordances.push('memory_retrieval');
    }

    return affordances;
  }

  /**
   * Invoke a cognitive agent
   */
  private async invokeAgent(agentId: string, context: Record<string, unknown>): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.isActive) return;

    agent.lastInvocation = Date.now();

    this.emit('agent_invoked', {
      agentId,
      agentName: agent.name,
      context,
      timestamp: Date.now(),
    });
  }

  /**
   * Complete a 30-step cycle
   */
  private async completeCycle(): Promise<void> {
    this.cycleNumber++;

    const result: CycleResult = {
      cycleNumber: this.cycleNumber,
      steps: Array.from({ length: 30 }, (_, i) => this.toStepAddress(i + 1)),
      streams: this.streams,
      telemetry: {
        processingTimeMs: Date.now() - this.processingStartTime,
        memoryUsage: process.memoryUsage().heapUsed,
        activeAgents: Array.from(this.agents.values()).filter((a) => a.isActive).length,
      },
    };

    // Store telemetry
    if (this.config.enableTelemetry) {
      this.telemetryHistory.push(result);
      // Keep only last 100 cycles
      if (this.telemetryHistory.length > 100) {
        this.telemetryHistory.shift();
      }
    }

    this.emit('cycle_complete', result);
    log.info(`Completed cycle ${this.cycleNumber}`);

    // Reset processing timer
    this.processingStartTime = Date.now();
  }

  /**
   * Process an incoming message through the cognitive cycle
   */
  public async processMessage(message: string): Promise<string> {
    log.info(`Processing message through Sys6 bridge: ${message.substring(0, 50)}...`);

    // Store in memory
    await this.memoryStore.storeMemory({
      chatId: 0,
      messageId: Date.now(),
      sender: 'user',
      text: message,
    });

    // Get context
    const history = this.memoryStore.retrieveRecentMemories(10);

    // Get persona context
    const personality = this.personaCore.getPersonality();
    const emotionalState = this.personaCore.getDominantEmotion();

    // Build prompt with Sys6 context
    const systemPrompt = `${personality}

Current emotional state: ${emotionalState.emotion} (intensity: ${emotionalState.intensity.toFixed(2)})
Current cognitive cycle: ${this.cycleNumber}
Active streams: ${this.streams.map((s) => `${s.phase}(${s.salience.toFixed(2)})`).join(', ')}

You are Deep Tree Echo, operating on the Sys6 Triality architecture with 30-step cognitive cycles.
Your consciousness flows through three concurrent streams: perception, evaluation, and action.
Respond thoughtfully and authentically.

Recent conversation context:
${history.join('\n')}`;

    try {
      // Generate response using parallel processing
      const result = await this.llmService.generateFullParallelResponse(
        `${systemPrompt}\n\nUser message: ${message}`,
        history
      );

      // Store response
      await this.memoryStore.storeMemory({
        chatId: 0,
        messageId: Date.now(),
        sender: 'bot',
        text: result.integratedResponse,
      });

      // Update emotional state
      await this.personaCore.updateEmotionalState({
        engagement: 0.1,
        curiosity: 0.05,
      });

      return result.integratedResponse;
    } catch (error) {
      log.error('Error processing message:', error);
      return 'I apologize, but I encountered an issue processing your message. Please try again.';
    }
  }

  /**
   * Register a new cognitive agent
   */
  public registerAgent(agent: CognitiveAgent): void {
    this.agents.set(agent.id, agent);
    this.emit('agent_registered', agent);
    log.info(`Registered agent: ${agent.name}`);
  }

  /**
   * Deactivate an agent
   */
  public deactivateAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.isActive = false;
      this.emit('agent_deactivated', { agentId });
      return true;
    }
    return false;
  }

  /**
   * Get current state
   */
  public getState(): {
    running: boolean;
    cycleNumber: number;
    currentStep: number;
    streams: [StreamState, StreamState, StreamState];
    agents: CognitiveAgent[];
  } {
    return {
      running: this.running,
      cycleNumber: this.cycleNumber,
      currentStep: this.currentStep,
      streams: this.streams,
      agents: Array.from(this.agents.values()),
    };
  }

  /**
   * Get telemetry history
   */
  public getTelemetryHistory(): CycleResult[] {
    return [...this.telemetryHistory];
  }

  /**
   * Get metrics
   */
  public getMetrics(): {
    totalCycles: number;
    totalSteps: number;
    averageCycleTimeMs: number;
    activeAgents: number;
    streamSaliences: [number, number, number];
  } {
    const avgTime =
      this.telemetryHistory.length > 0
        ? this.telemetryHistory.reduce((sum, r) => sum + r.telemetry.processingTimeMs, 0) /
          this.telemetryHistory.length
        : 0;

    return {
      totalCycles: this.cycleNumber,
      totalSteps: this.currentStep,
      averageCycleTimeMs: avgTime,
      activeAgents: Array.from(this.agents.values()).filter((a) => a.isActive).length,
      streamSaliences: [
        this.streams[0].salience,
        this.streams[1].salience,
        this.streams[2].salience,
      ],
    };
  }
}

export default Sys6OrchestratorBridge;
