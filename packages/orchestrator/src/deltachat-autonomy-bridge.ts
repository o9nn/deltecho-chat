/**
 * DeltaChat Autonomy Bridge
 *
 * Wires DeltaChat message events into the AutonomyPipeline for live
 * autonomous operation. Converts incoming messages to cognitive percepts,
 * routes responses through the CoreSelfEngine when available, and feeds
 * conversation context into the Echobeats energy flow.
 *
 * Architecture:
 *   DeltaChat Message → Percept → CognitiveTickProcessor → CoreSelf/LLM → Response
 *                                        ↕
 *                              AutonomyPipeline (memory, planning, tools)
 *                                        ↕
 *                              Echobeats (energy, coherence, telemetry)
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';
import type { AutonomyPipeline } from './autonomy-pipeline.js';
import type { CognitivePercept } from './cognitive-tick-processor.js';

const log = getLogger('deep-tree-echo-orchestrator/DeltaChatAutonomyBridge');

// ─── Types ─────────────────────────────────────────────────────

export interface BridgeConfig {
  /** Enable autonomous response generation (vs. just perception) */
  enableAutonomousResponse: boolean;
  /** Prefer CoreSelf over external LLM for responses */
  preferCoreSelf: boolean;
  /** Maximum response length */
  maxResponseLength: number;
  /** Enable proactive messaging (DTE initiates conversation) */
  enableProactiveMessaging: boolean;
  /** Minimum coherence to allow proactive messaging */
  proactiveCoherenceThreshold: number;
  /** Cooldown between proactive messages (ms) */
  proactiveCooldownMs: number;
}

const DEFAULT_CONFIG: BridgeConfig = {
  enableAutonomousResponse: true,
  preferCoreSelf: true,
  maxResponseLength: 2000,
  enableProactiveMessaging: false,
  proactiveCoherenceThreshold: 0.7,
  proactiveCooldownMs: 300_000, // 5 minutes
};

export interface IncomingMessage {
  chatId: number;
  messageId: number;
  accountId: number;
  senderAddress: string;
  senderName: string;
  text: string;
  timestamp: number;
  isGroup: boolean;
}

export interface BridgeResponse {
  text: string;
  source: 'core-self' | 'llm-service' | 'pipeline' | 'fallback';
  coherence: number;
  processingTimeMs: number;
  perceptsGenerated: number;
}

export interface BridgeStats {
  messagesReceived: number;
  responsesGenerated: number;
  coreSelResponses: number;
  llmResponses: number;
  perceptsInjected: number;
  proactiveMessages: number;
  averageResponseTimeMs: number;
  errors: number;
}

// ─── Bridge ────────────────────────────────────────────────────

export class DeltaChatAutonomyBridge extends EventEmitter {
  private config: BridgeConfig;
  private pipeline: AutonomyPipeline;
  private stats: BridgeStats = {
    messagesReceived: 0,
    responsesGenerated: 0,
    coreSelResponses: 0,
    llmResponses: 0,
    perceptsInjected: 0,
    proactiveMessages: 0,
    averageResponseTimeMs: 0,
    errors: 0,
  };
  private lastProactiveTime = 0;
  private responseTimes: number[] = [];

  constructor(pipeline: AutonomyPipeline, config?: Partial<BridgeConfig>) {
    super();
    this.pipeline = pipeline;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Message Processing ──────────────────────────────────────

  /**
   * Process an incoming DeltaChat message through the autonomy pipeline.
   *
   * Flow:
   * 1. Convert message to cognitive percept
   * 2. Inject percept into CognitiveTickProcessor
   * 3. Store message in vector memory
   * 4. Generate response via CoreSelf or LLM
   * 5. Record episodic memory of the interaction
   */
  async processMessage(message: IncomingMessage): Promise<BridgeResponse> {
    const startTime = Date.now();
    this.stats.messagesReceived++;

    try {
      // 1. Convert to cognitive percept
      const percept: CognitivePercept = {
        id: `msg-${message.chatId}-${message.messageId}`,
        source: 'message',
        content: message.text,
        salience: this.computeSalience(message),
        emotionalValence: 0, // Neutral by default
        timestamp: message.timestamp,
        metadata: {
          chatId: message.chatId,
          messageId: message.messageId,
          senderAddress: message.senderAddress,
          senderName: message.senderName,
          isGroup: message.isGroup,
        },
      };

      // 2. Inject percept into cognitive processor
      const processor = this.pipeline.getCognitiveProcessor();
      processor.injectPercept(percept);
      this.stats.perceptsInjected++;

      // 3. Store in vector memory
      await this.pipeline.storeMessage({
        chatId: message.chatId,
        messageId: message.messageId,
        sender: 'user',
        text: message.text,
      });

      // 4. Generate response
      let responseText = '';
      let source: BridgeResponse['source'] = 'fallback';
      let coherence = 0.5;

      if (this.config.enableAutonomousResponse) {
        // Build context from recent memory
        const memoryResults = await this.pipeline.searchMemory(message.text, 5);
        const contextParts = memoryResults.map(m => m.text);
        const context = contextParts.length > 0
          ? `Recent context:\n${contextParts.join('\n')}`
          : undefined;

        if (this.config.preferCoreSelf) {
          // Try CoreSelf first
          const coreSelfResult = await this.pipeline.processWithCoreSelf(message.text, context);
          if (coreSelfResult.source !== 'none') {
            responseText = coreSelfResult.content;
            source = coreSelfResult.source === 'core-self' ? 'core-self' : 'llm-service';
            coherence = coreSelfResult.coherence;

            if (source === 'core-self') {
              this.stats.coreSelResponses++;
            } else {
              this.stats.llmResponses++;
            }
          }
        } else {
          // Use pipeline's LLM directly
          const coreSelfResult = await this.pipeline.processWithCoreSelf(message.text);
          responseText = coreSelfResult.content;
          source = 'pipeline';
          coherence = coreSelfResult.coherence;
          this.stats.llmResponses++;
        }
      }

      // Truncate if needed
      if (responseText.length > this.config.maxResponseLength) {
        responseText = responseText.substring(0, this.config.maxResponseLength - 3) + '...';
      }

      // 5. Store response in memory
      if (responseText) {
        await this.pipeline.storeMessage({
          chatId: message.chatId,
          messageId: message.messageId + 1,
          sender: 'bot',
          text: responseText,
        });
      }

      const processingTimeMs = Date.now() - startTime;
      this.stats.responsesGenerated++;
      this.responseTimes.push(processingTimeMs);
      if (this.responseTimes.length > 100) this.responseTimes.shift();
      this.stats.averageResponseTimeMs = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

      const response: BridgeResponse = {
        text: responseText,
        source,
        coherence,
        processingTimeMs,
        perceptsGenerated: 1,
      };

      this.emit('response', { message, response });
      return response;

    } catch (error) {
      this.stats.errors++;
      log.error('Bridge processing error:', error);
      this.emit('error', { message, error: String(error) });

      return {
        text: '',
        source: 'fallback',
        coherence: 0,
        processingTimeMs: Date.now() - startTime,
        perceptsGenerated: 0,
      };
    }
  }

  // ─── Proactive Messaging ─────────────────────────────────────

  /**
   * Check if DTE should proactively send a message.
   * Returns a message if conditions are met, null otherwise.
   *
   * Conditions:
   * - Proactive messaging enabled
   * - Coherence above threshold
   * - Cooldown period elapsed
   * - Pipeline has active goals that require communication
   */
  async checkProactiveMessage(): Promise<{ chatId: number; text: string } | null> {
    if (!this.config.enableProactiveMessaging) return null;

    const now = Date.now();
    if (now - this.lastProactiveTime < this.config.proactiveCooldownMs) return null;

    // Check coherence via pipeline stats
    const stats = this.pipeline.getStats();
    const coherence = stats.cognitiveState.latestSelfImage?.coherenceScore ?? 0;
    if (coherence < this.config.proactiveCoherenceThreshold) return null;

    // Check if there are goals that suggest proactive communication
    const processor = this.pipeline.getCognitiveProcessor();
    const goals = processor.getGoals();
    const communicationGoals = goals.filter(g =>
      g.status === 'active' &&
      (g.description.includes('communicate') ||
       g.description.includes('report') ||
       g.description.includes('notify') ||
       g.description.includes('share'))
    );

    if (communicationGoals.length === 0) return null;

    // Generate proactive message via CoreSelf
    const goal = communicationGoals[0];
    const result = await this.pipeline.processWithCoreSelf(
      `Generate a brief proactive message based on this goal: ${goal.description}`,
      'You are initiating a conversation, not responding. Be concise and purposeful.'
    );

    if (result.content && result.source !== 'none') {
      this.lastProactiveTime = now;
      this.stats.proactiveMessages++;

      return {
        chatId: 0, // Caller must determine the appropriate chat
        text: result.content,
      };
    }

    return null;
  }

  // ─── Helpers ─────────────────────────────────────────────────

  /**
   * Compute salience of an incoming message.
   * Higher salience = more attention from the cognitive system.
   */
  private computeSalience(message: IncomingMessage): number {
    let salience = 0.5;

    // Direct messages are more salient than group messages
    if (!message.isGroup) salience += 0.2;

    // Questions are more salient
    if (message.text.includes('?')) salience += 0.1;

    // Mentions of self are highly salient
    const selfNames = ['echo', 'dte', 'deep tree', 'deeptree'];
    if (selfNames.some(n => message.text.toLowerCase().includes(n))) {
      salience += 0.3;
    }

    // Longer messages may be more important
    if (message.text.length > 200) salience += 0.1;

    // Commands are high salience
    if (message.text.startsWith('/') || message.text.startsWith('!')) {
      salience += 0.2;
    }

    return Math.min(1.0, salience);
  }

  // ─── Accessors ───────────────────────────────────────────────

  getStats(): BridgeStats {
    return { ...this.stats };
  }

  getConfig(): BridgeConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<BridgeConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
