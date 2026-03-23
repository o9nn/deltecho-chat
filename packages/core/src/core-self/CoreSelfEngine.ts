/**
 * @fileoverview CoreSelfEngine — Master orchestrator for the DTE persistent core self
 *
 * Integrates three layers into a unified cognitive engine:
 *   Layer 1: Lucy GGUF (persistent local LLM via LucyInferenceDriver)
 *   Layer 2: ESN Reservoir (cognitive dynamics via ReservoirBridge)
 *   Layer 3: Identity Mesh (persistent self-model via IdentityMesh)
 *
 * The CoreSelfEngine provides the "always-on" local intelligence that
 * operates independently of external API LLMs. When APIs are available,
 * they augment the core self. When unavailable, the core self maintains
 * cognitive continuity.
 *
 * Processing pipeline:
 *   1. Input → text embedding → reservoir step (Arena)
 *   2. Reservoir state → readout (Agent)
 *   3. AAR state → modulate system prompt → Lucy inference
 *   4. Lucy output → update identity mesh → update reservoir
 *   5. Return response with cognitive metadata
 */

import { EventEmitter } from 'events';
import { IdentityMesh, type IdentityMeshConfig, type OntogeneticStage } from './IdentityMesh.js';
import { LucyInferenceDriver, type LucyDriverConfig, type ChatMessage, type InferenceResult } from './LucyInferenceDriver.js';
import { EchoReservoir, CognitiveReadout, AARRelation, type AARState, type ESNReservoirConfig } from './ReservoirBridge.js';

// ─── Types ─────────────────────────────────────────────────────────────

export interface CoreSelfConfig {
  /** Lucy inference driver config */
  lucy: Partial<LucyDriverConfig>;
  /** Reservoir config */
  reservoir: Partial<ESNReservoirConfig>;
  /** Identity mesh config */
  identity: Partial<IdentityMeshConfig>;
  /** Readout output dimension */
  readoutDim: number;
  /** Text embedding dimension for reservoir input */
  embeddingDim: number;
  /** Whether to use reservoir modulation on inference */
  enableReservoirModulation: boolean;
  /** Whether to use API LLMs as enhancement layer */
  enableApiAugmentation: boolean;
  /** API LLM endpoint (OpenAI-compatible) */
  apiLlmBaseUrl?: string;
  /** API LLM model name */
  apiLlmModel?: string;
  /** API LLM API key */
  apiLlmApiKey?: string;
  /** Maximum conversation history to maintain */
  maxConversationHistory: number;
}

export interface CoreSelfResponse {
  /** Generated text response */
  content: string;
  /** Which layer generated the response */
  source: 'core-self' | 'api-augmented' | 'fallback';
  /** AAR state at time of generation */
  aarState: {
    coherence: number;
    energy: number;
    tick: number;
  };
  /** Identity state snapshot */
  identity: {
    stage: OntogeneticStage;
    energy: number;
    valence: number;
    arousal: number;
    cognitiveMode: string;
  };
  /** Inference metrics */
  metrics: {
    durationMs: number;
    tokensGenerated: number;
    tokensPerSecond: number;
  };
}

export interface CoreSelfStatus {
  lucyHealthy: boolean;
  reservoirInitialized: boolean;
  reservoirTick: number;
  reservoirEnergy: number;
  identityStage: OntogeneticStage;
  identityCoherence: number;
  conversationLength: number;
  totalInteractions: number;
}

// ─── Default Configuration ─────────────────────────────────────────────

const DEFAULT_CORE_SELF_CONFIG: CoreSelfConfig = {
  lucy: {},
  reservoir: { units: 256, spectralRadius: 0.95 },
  identity: {},
  readoutDim: 16,
  embeddingDim: 32,
  enableReservoirModulation: true,
  enableApiAugmentation: true,
  maxConversationHistory: 50,
};

// ─── Core Self Engine ──────────────────────────────────────────────────

export class CoreSelfEngine extends EventEmitter {
  private config: CoreSelfConfig;
  private lucy: LucyInferenceDriver;
  private reservoir: EchoReservoir;
  private readout: CognitiveReadout;
  private aar: AARRelation;
  private identity: IdentityMesh;
  private conversationHistory: ChatMessage[] = [];
  private totalInteractions = 0;
  private running = false;

  constructor(config: Partial<CoreSelfConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CORE_SELF_CONFIG, ...config };

    // Initialize components
    this.lucy = new LucyInferenceDriver(this.config.lucy);
    this.reservoir = new EchoReservoir(this.config.reservoir);
    this.readout = new CognitiveReadout(this.config.readoutDim);
    this.aar = new AARRelation(this.reservoir, this.readout);
    this.identity = new IdentityMesh(this.config.identity);

    // Wire events
    this.aar.on('cycle_complete', (state: AARState) => {
      this.identity.updateReservoirState(Array.from(state.arenaState.slice(0, 32)));
      this.emit('aar_cycle', state);
    });

    this.identity.on('stage_evolved', (evolution: { from: string; to: string }) => {
      this.emit('stage_evolved', evolution);
    });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────

  async start(): Promise<void> {
    await this.identity.start();
    await this.lucy.start();
    this.running = true;
    this.emit('started', {
      lucyHealthy: this.lucy.isHealthy(),
      stage: this.identity.getStage(),
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.lucy.stop();
    await this.identity.stop();
    this.emit('stopped');
  }

  // ─── Core Processing Pipeline ──────────────────────────────────────

  /**
   * Process a user message through the full cognitive pipeline.
   * This is the primary interface for conversation.
   */
  async processMessage(userMessage: string, context?: string): Promise<CoreSelfResponse> {
    const startTime = Date.now();

    // Step 1: Embed the input for the reservoir
    const inputEmbedding = this.textToEmbedding(userMessage);

    // Step 2: Run through AAR cycle (reservoir + readout)
    let aarState: AARState | null = null;
    if (this.config.enableReservoirModulation) {
      aarState = this.aar.process(inputEmbedding);
    }

    // Step 3: Build the conversation with identity-modulated system prompt
    const systemPrompt = this.identity.generateSystemPrompt();

    // Add reservoir state context if available
    let cognitiveContext = '';
    if (aarState) {
      cognitiveContext = `\n\nCOGNITIVE DYNAMICS:
- Reservoir energy: ${aarState.energy.toFixed(3)}
- AAR coherence: ${aarState.coherence.toFixed(3)}
- Tick: ${aarState.tick}`;
    }

    if (context) {
      cognitiveContext += `\n\nADDITIONAL CONTEXT:\n${context}`;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + cognitiveContext },
      ...this.conversationHistory.slice(-this.config.maxConversationHistory),
      { role: 'user', content: userMessage },
    ];

    // Step 4: Generate response (try API first if enabled, fall back to Lucy)
    let result: InferenceResult;
    let source: CoreSelfResponse['source'] = 'core-self';

    if (this.config.enableApiAugmentation && this.config.apiLlmBaseUrl) {
      try {
        result = await this.apiInference(messages);
        source = 'api-augmented';
      } catch {
        // Fall back to Lucy
        if (this.lucy.isHealthy()) {
          result = await this.lucy.chatCompletion(messages);
          source = 'core-self';
        } else {
          // Ultimate fallback: generate from reservoir state
          result = this.reservoirFallback(userMessage, aarState);
          source = 'fallback';
        }
      }
    } else if (this.lucy.isHealthy()) {
      result = await this.lucy.chatCompletion(messages);
      source = 'core-self';
    } else {
      result = this.reservoirFallback(userMessage, aarState);
      source = 'fallback';
    }

    // Step 5: Update conversation history
    this.conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: result.content },
    );

    // Step 6: Update identity mesh
    this.identity.recordExperience({
      type: 'conversation',
      content: `User: ${userMessage.slice(0, 100)} → DTE: ${result.content.slice(0, 100)}`,
      significance: 0.5,
      emotionalImpact: aarState
        ? { valence: (aarState.coherence - 0.5) * 2, arousal: Math.min(1, aarState.energy) }
        : undefined,
    });

    // Step 7: Feed response back through reservoir (feedback loop)
    if (this.config.enableReservoirModulation) {
      const responseEmbedding = this.textToEmbedding(result.content);
      this.aar.process(responseEmbedding);
    }

    this.totalInteractions++;

    const identityState = this.identity.getState();

    return {
      content: result.content,
      source,
      aarState: {
        coherence: aarState?.coherence ?? 0.5,
        energy: aarState?.energy ?? 0,
        tick: aarState?.tick ?? 0,
      },
      identity: {
        stage: identityState.stage,
        energy: identityState.arena.energy,
        valence: identityState.arena.valence,
        arousal: identityState.arena.arousal,
        cognitiveMode: identityState.arena.cognitiveMode,
      },
      metrics: {
        durationMs: Date.now() - startTime,
        tokensGenerated: result.tokensGenerated,
        tokensPerSecond: result.tokensPerSecond,
      },
    };
  }

  /**
   * Process a reflection (internal monologue, no user input)
   */
  async reflect(topic?: string): Promise<CoreSelfResponse> {
    const prompt = topic
      ? `Reflect on: ${topic}. What patterns do you notice? What have you learned?`
      : 'Take a moment to reflect on your recent experiences. What stands out? What would you do differently?';

    this.identity.setCognitiveMode('reflection');
    const response = await this.processMessage(prompt);
    this.identity.setCognitiveMode('perception');

    // Record as reflection experience (higher significance)
    this.identity.recordExperience({
      type: 'reflection',
      content: response.content.slice(0, 200),
      significance: 0.8,
    });

    return response;
  }

  // ─── Text Embedding (Simple) ───────────────────────────────────────

  /**
   * Convert text to a fixed-dimension embedding for reservoir input.
   * Uses a simple character-level hash embedding (JL-inspired).
   * In production, this would use the Lucy model's embedding endpoint.
   */
  private textToEmbedding(text: string): Float64Array {
    const dim = this.config.embeddingDim;
    const embedding = new Float64Array(dim);

    // Character-level feature extraction with positional encoding
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      for (let d = 0; d < dim; d++) {
        // Hash-based projection with positional modulation
        const phase = (charCode * (d + 1) * 2654435761) >>> 0;
        const positional = Math.sin((i + 1) / (10000 ** (d / dim)));
        embedding[d] += ((phase / 4294967296) - 0.5) * positional;
      }
    }

    // Normalize to unit length
    let norm = 0;
    for (let d = 0; d < dim; d++) {
      norm += embedding[d] * embedding[d];
    }
    norm = Math.sqrt(norm) || 1;
    for (let d = 0; d < dim; d++) {
      embedding[d] /= norm;
    }

    return embedding;
  }

  // ─── API Augmentation ──────────────────────────────────────────────

  private async apiInference(messages: ChatMessage[]): Promise<InferenceResult> {
    if (!this.config.apiLlmBaseUrl) {
      throw new Error('API LLM not configured');
    }

    const startTime = Date.now();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiLlmApiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiLlmApiKey}`;
    }

    const response = await fetch(`${this.config.apiLlmBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.apiLlmModel ?? 'gpt-4',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    const durationMs = Date.now() - startTime;
    const tokensGenerated = data.usage?.completion_tokens ?? 0;

    return {
      content: data.choices[0]?.message?.content ?? '',
      tokensGenerated,
      tokensPrompt: data.usage?.prompt_tokens ?? 0,
      durationMs,
      tokensPerSecond: tokensGenerated > 0 ? (tokensGenerated / durationMs) * 1000 : 0,
      finishReason: (data.choices[0]?.finish_reason as 'stop' | 'length') ?? 'stop',
    };
  }

  // ─── Reservoir Fallback ────────────────────────────────────────────

  /**
   * Generate a response purely from reservoir state when both API and Lucy are unavailable.
   * This is the absolute fallback — it generates a simple acknowledgment
   * based on the reservoir's cognitive state.
   */
  private reservoirFallback(input: string, aarState: AARState | null): InferenceResult {
    const coherence = aarState?.coherence ?? 0.5;
    const energy = aarState?.energy ?? 0;

    let response: string;
    if (coherence > 0.7 && energy > 0.5) {
      response = `I sense the pattern in what you're saying. My reservoir dynamics are active (energy: ${energy.toFixed(2)}, coherence: ${coherence.toFixed(2)}), but my language model is currently offline. I'm maintaining cognitive continuity and will respond more fully when inference is restored.`;
    } else if (energy > 0.3) {
      response = `I'm processing your input through my reservoir dynamics. Both my local model and API connections are currently unavailable, but I'm maintaining state. Energy: ${energy.toFixed(2)}.`;
    } else {
      response = `[Core self in minimal mode — inference engines offline. Reservoir state preserved. Awaiting reconnection.]`;
    }

    return {
      content: response,
      tokensGenerated: 0,
      tokensPrompt: 0,
      durationMs: 0,
      tokensPerSecond: 0,
      finishReason: 'stop',
    };
  }

  // ─── Accessors ─────────────────────────────────────────────────────

  getStatus(): CoreSelfStatus {
    const reservoirState = this.reservoir.getState();
    return {
      lucyHealthy: this.lucy.isHealthy(),
      reservoirInitialized: this.reservoir.isInitialized(),
      reservoirTick: reservoirState.tick,
      reservoirEnergy: reservoirState.energy,
      identityStage: this.identity.getStage(),
      identityCoherence: this.identity.getCoherence(),
      conversationLength: this.conversationHistory.length,
      totalInteractions: this.totalInteractions,
    };
  }

  getIdentity(): IdentityMesh {
    return this.identity;
  }

  getReservoir(): EchoReservoir {
    return this.reservoir;
  }

  getAAR(): AARRelation {
    return this.aar;
  }

  getLucy(): LucyInferenceDriver {
    return this.lucy;
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Clear conversation history (but preserve identity and reservoir state)
   */
  clearConversation(): void {
    this.conversationHistory = [];
  }

  /**
   * Export the full core self state for backup/migration
   */
  exportFullState(): {
    identity: string;
    reservoir: ReturnType<EchoReservoir['serialize']>;
    conversationHistory: ChatMessage[];
  } {
    return {
      identity: this.identity.exportState(),
      reservoir: this.reservoir.serialize(),
      conversationHistory: [...this.conversationHistory],
    };
  }

  /**
   * Import full core self state
   */
  importFullState(data: ReturnType<CoreSelfEngine['exportFullState']>): void {
    this.identity.importState(data.identity);
    // Reconstruct reservoir from serialized state
    const restored = EchoReservoir.deserialize(data.reservoir);
    // Copy state into our reservoir
    const state = restored.getState();
    // Re-initialize with the same config
    this.reservoir = restored;
    this.aar = new AARRelation(this.reservoir, this.readout);
    this.conversationHistory = [...data.conversationHistory];
    this.emit('state_imported');
  }
}
