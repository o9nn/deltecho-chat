/**
 * @fileoverview Double Membrane Integration for Orchestrator
 *
 * Integrates the bio-inspired double membrane architecture into the
 * Deep Tree Echo orchestrator, providing:
 * - Strong core identity with autonomous operation
 * - API acceleration when external services available
 * - Graceful degradation and fallback handling
 * - IPC bridge for desktop app communication
 * - Memory persistence with associative graph
 * - Cognitive processing with triadic streams
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/DoubleMembraneIntegration');

/**
 * Double Membrane Integration Configuration
 */
export interface DoubleMembraneIntegrationConfig {
  /** Enable double membrane processing */
  enabled: boolean;
  /** Instance name for identity */
  instanceName?: string;
  /** Persistence path for memory and state */
  persistencePath?: string;
  /** Enable API acceleration */
  enableAPIAcceleration: boolean;
  /** Prefer native processing over external APIs */
  preferNative: boolean;
  /** Maximum queue size for requests */
  maxQueueSize?: number;
  /** Timeout for external API calls (ms) */
  externalTimeoutMs?: number;
  /** LLM provider configurations */
  llmProviders?: {
    openai?: { apiKey: string; model?: string };
    anthropic?: { apiKey: string; model?: string };
    openrouter?: { apiKey: string; model?: string };
  };
  /** Enable verbose logging */
  verbose?: boolean;
}

const DEFAULT_CONFIG: DoubleMembraneIntegrationConfig = {
  enabled: true,
  instanceName: 'DeepTreeEcho',
  persistencePath: undefined,
  enableAPIAcceleration: true,
  preferNative: true,
  maxQueueSize: 100,
  externalTimeoutMs: 30000,
  verbose: false,
};

/**
 * Request for processing through double membrane
 */
export interface DoubleMembraneRequest {
  id: string;
  prompt: string;
  context?: {
    conversationHistory?: Array<{ role: string; content: string }>;
    systemPrompt?: string;
    metadata?: Record<string, any>;
  };
  priority?: 'low' | 'normal' | 'high' | 'critical';
  preferNative?: boolean;
}

/**
 * Response from double membrane processing
 */
export interface DoubleMembraneResponse {
  id: string;
  text: string;
  source: 'native' | 'external' | 'hybrid';
  metadata: {
    processingTimeMs: number;
    provider?: string;
    model?: string;
    energyCost: number;
    confidence: number;
    triadic?: {
      perception: number;
      evaluation: number;
      action: number;
    };
  };
}

/**
 * Integration status and metrics
 */
export interface IntegrationStatus {
  enabled: boolean;
  running: boolean;
  instanceName: string;
  uptime: number;
  identityEnergy: number;
  stats: {
    totalRequests: number;
    nativeRequests: number;
    externalRequests: number;
    hybridRequests: number;
    averageLatency: number;
    queueLength: number;
  };
  providers: Array<{
    name: string;
    healthy: boolean;
    model?: string;
  }>;
}

/**
 * Double Membrane Integration
 *
 * Provides orchestrator with double membrane cognitive capabilities
 */
export class DoubleMembraneIntegration extends EventEmitter {
  private config: DoubleMembraneIntegrationConfig;
  private doubleMembrane: any | null = null; // Will be DoubleMembrane if loaded
  private running: boolean = false;
  private startTime: number = 0;
  private requestCount: number = 0;

  // Stats tracking
  private stats = {
    totalRequests: 0,
    nativeRequests: 0,
    externalRequests: 0,
    hybridRequests: 0,
    totalLatency: 0,
  };

  constructor(config: Partial<DoubleMembraneIntegrationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize and start the double membrane system
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      log.info('Double membrane integration is disabled');
      return;
    }

    if (this.running) {
      log.warn('Double membrane integration already running');
      return;
    }

    log.info('Initializing double membrane integration...');

    try {
      // Lazy load the double-membrane package
      const membraneModule: any = await (
        new Function('return import("@deltecho/double-membrane")')() as Promise<any>
      ).catch((error) => {
        throw new Error(
          'Failed to load @deltecho/double-membrane package: ' +
            error +
            '. Install with: pnpm add @deltecho/double-membrane'
        );
      });

      // Create double membrane instance
      this.doubleMembrane = new membraneModule.DoubleMembrane({
        instanceName: this.config.instanceName,
        persistencePath: this.config.persistencePath,
        preferNativeProcessing: this.config.preferNative,
        maxQueueSize: this.config.maxQueueSize,
        externalTimeoutMs: this.config.externalTimeoutMs,
        enableHybridProcessing: this.config.enableAPIAcceleration,
        verbose: this.config.verbose,
      });

      // Configure LLM providers if API keys provided
      if (this.config.llmProviders) {
        const providers: any[] = [];

        if (this.config.llmProviders.openai?.apiKey) {
          providers.push({
            name: 'openai',
            type: 'openai',
            apiKey: this.config.llmProviders.openai.apiKey,
            model: this.config.llmProviders.openai.model || 'gpt-4',
            endpoint: 'https://api.openai.com/v1/chat/completions',
          });
        }

        if (this.config.llmProviders.anthropic?.apiKey) {
          providers.push({
            name: 'anthropic',
            type: 'anthropic',
            apiKey: this.config.llmProviders.anthropic.apiKey,
            model: this.config.llmProviders.anthropic.model || 'claude-3-opus-20240229',
            endpoint: 'https://api.anthropic.com/v1/messages',
          });
        }

        if (this.config.llmProviders.openrouter?.apiKey) {
          providers.push({
            name: 'openrouter',
            type: 'openai',
            apiKey: this.config.llmProviders.openrouter.apiKey,
            model: this.config.llmProviders.openrouter.model || 'anthropic/claude-3.5-sonnet:beta',
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          });
        }

        // Add providers to the double membrane
        for (const provider of providers) {
          await this.doubleMembrane.addProvider(provider);
          log.info(`Configured LLM provider: ${provider.name} (${provider.model})`);
        }
      }

      // Set up event forwarding
      this.doubleMembrane.on('started', () => {
        this.emit('started');
        log.info('Double membrane started');
      });

      this.doubleMembrane.on('stopped', () => {
        this.emit('stopped');
        log.info('Double membrane stopped');
      });

      this.doubleMembrane.on('processing', (data: any) => {
        this.emit('processing', data);
      });

      this.doubleMembrane.on('processed', (data: any) => {
        this.emit('processed', data);
        // Track statistics
        this.stats.totalRequests++;
        switch (data.source) {
          case 'native':
            this.stats.nativeRequests++;
            break;
          case 'external':
            this.stats.externalRequests++;
            break;
          case 'hybrid':
            this.stats.hybridRequests++;
            break;
        }
        this.stats.totalLatency += data.metadata.processingTimeMs;
      });

      this.doubleMembrane.on('error', (error: Error) => {
        this.emit('error', error);
        log.error('Double membrane error:', error);
      });

      // Start the membrane
      await this.doubleMembrane.start();

      this.running = true;
      this.startTime = Date.now();

      log.info('Double membrane integration started successfully');
    } catch (error) {
      log.error('Failed to start double membrane integration:', error);
      throw error;
    }
  }

  /**
   * Stop the double membrane system
   */
  async stop(): Promise<void> {
    if (!this.running || !this.doubleMembrane) {
      return;
    }

    log.info('Stopping double membrane integration...');

    await this.doubleMembrane.stop();
    this.running = false;

    log.info('Double membrane integration stopped');
  }

  /**
   * Process a request through the double membrane
   */
  async process(request: DoubleMembraneRequest): Promise<DoubleMembraneResponse> {
    if (!this.running || !this.doubleMembrane) {
      throw new Error('Double membrane integration not running');
    }

    const requestId = request.id || `req-${++this.requestCount}`;

    log.debug(`Processing request ${requestId}: ${request.prompt.substring(0, 50)}...`);

    const response = await this.doubleMembrane.process({
      id: requestId,
      prompt: request.prompt,
      context: request.context,
      priority: request.priority || 'normal',
      preferNative: request.preferNative ?? this.config.preferNative,
    });

    return {
      id: requestId,
      text: response.text,
      source: response.source,
      metadata: response.metadata,
    };
  }

  /**
   * Use chat interface for conversational processing
   */
  async chat(
    message: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    if (!this.running || !this.doubleMembrane) {
      throw new Error('Double membrane integration not running');
    }

    const response = await this.doubleMembrane.chat(message, conversationHistory);
    return response;
  }

  /**
   * Get current status and metrics
   */
  getStatus(): IntegrationStatus {
    const baseStatus = {
      enabled: this.config.enabled,
      running: this.running,
      instanceName: this.config.instanceName || 'DeepTreeEcho',
      uptime: this.running ? Date.now() - this.startTime : 0,
      identityEnergy: 0,
      stats: {
        totalRequests: this.stats.totalRequests,
        nativeRequests: this.stats.nativeRequests,
        externalRequests: this.stats.externalRequests,
        hybridRequests: this.stats.hybridRequests,
        averageLatency:
          this.stats.totalRequests > 0 ? this.stats.totalLatency / this.stats.totalRequests : 0,
        queueLength: 0,
      },
      providers: [],
    };

    if (!this.running || !this.doubleMembrane) {
      return baseStatus;
    }

    // Get detailed status from double membrane
    const membraneStatus = this.doubleMembrane.getStatus();

    return {
      ...baseStatus,
      identityEnergy: membraneStatus.identityState?.aarCore?.energy || 0,
      stats: {
        ...baseStatus.stats,
        queueLength: membraneStatus.queueLength,
        // Merge with membrane stats if available
        totalRequests: membraneStatus.stats?.totalRequests || baseStatus.stats.totalRequests,
        nativeRequests: membraneStatus.stats?.nativeRequests || baseStatus.stats.nativeRequests,
        externalRequests:
          membraneStatus.stats?.externalRequests || baseStatus.stats.externalRequests,
        hybridRequests: membraneStatus.stats?.hybridRequests || baseStatus.stats.hybridRequests,
        averageLatency: membraneStatus.stats?.averageLatency || baseStatus.stats.averageLatency,
      },
      providers: membraneStatus.availableProviders.map((p: any) => ({
        name: p.name,
        healthy: true, // Assume healthy if returned
        model: p.model,
      })),
    };
  }

  /**
   * Get identity state from the membrane
   */
  getIdentityState(): any {
    if (!this.running || !this.doubleMembrane) {
      return null;
    }
    return this.doubleMembrane.getIdentityState();
  }

  /**
   * Recharge identity energy
   */
  async rechargeEnergy(amount: number): Promise<void> {
    if (!this.running || !this.doubleMembrane) {
      throw new Error('Double membrane integration not running');
    }
    await this.doubleMembrane.rechargeEnergy(amount);
  }

  /**
   * Check if integration is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if integration is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * Factory function for creating a configured integration
 */
export function createDoubleMembraneIntegration(
  config: Partial<DoubleMembraneIntegrationConfig> = {}
): DoubleMembraneIntegration {
  return new DoubleMembraneIntegration(config);
}
