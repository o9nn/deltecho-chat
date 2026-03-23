/**
 * @fileoverview LucyInferenceDriver — Local GGUF model inference via llama.cpp HTTP API
 *
 * Wraps any OpenAI-compatible local inference server (llama.cpp, KoboldCpp,
 * Ollama, etc.) to provide persistent local LLM inference for the DTE core self.
 *
 * The driver is designed to work with the Lucy-128k Qwen3-1.7B model but is
 * generic enough for any GGUF model served via an OpenAI-compatible API.
 *
 * Key features:
 *   - OpenAI-compatible chat completions API
 *   - Streaming token generation
 *   - Health monitoring and automatic reconnection
 *   - Inference metrics tracking
 *   - System prompt injection for identity embedding
 */

import { EventEmitter } from 'events';

// ─── Types ─────────────────────────────────────────────────────────────

export interface LucyDriverConfig {
  /** Base URL of the inference server */
  baseUrl: string;
  /** Model name (for API compatibility) */
  modelName: string;
  /** Maximum tokens to generate per request */
  maxTokens: number;
  /** Default temperature */
  temperature: number;
  /** Top-p sampling */
  topP: number;
  /** Repetition penalty */
  repetitionPenalty: number;
  /** Request timeout in ms */
  timeout: number;
  /** Health check interval in ms (0 = disabled) */
  healthCheckInterval: number;
  /** Maximum context length */
  contextLength: number;
  /** Number of retries on failure */
  retries: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InferenceResult {
  content: string;
  tokensGenerated: number;
  tokensPrompt: number;
  durationMs: number;
  tokensPerSecond: number;
  finishReason: 'stop' | 'length' | 'error';
}

export interface InferenceMetrics {
  totalRequests: number;
  totalTokensGenerated: number;
  totalTokensPrompt: number;
  totalDurationMs: number;
  averageTokensPerSecond: number;
  errors: number;
  lastRequestAt: number;
  isHealthy: boolean;
}

// ─── Default Configuration ─────────────────────────────────────────────

const DEFAULT_CONFIG: LucyDriverConfig = {
  baseUrl: 'http://localhost:8080',
  modelName: 'lucy-128k',
  maxTokens: 512,
  temperature: 0.7,
  topP: 0.9,
  repetitionPenalty: 1.1,
  timeout: 60000,
  healthCheckInterval: 30000,
  contextLength: 131072,
  retries: 2,
};

// ─── Lucy Inference Driver ─────────────────────────────────────────────

export class LucyInferenceDriver extends EventEmitter {
  private config: LucyDriverConfig;
  private metrics: InferenceMetrics;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private abortControllers: Set<AbortController> = new Set();

  constructor(config: Partial<LucyDriverConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalRequests: 0,
      totalTokensGenerated: 0,
      totalTokensPrompt: 0,
      totalDurationMs: 0,
      averageTokensPerSecond: 0,
      errors: 0,
      lastRequestAt: 0,
      isHealthy: false,
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────

  async start(): Promise<void> {
    // Check initial health
    this.metrics.isHealthy = await this.checkHealth();

    if (this.config.healthCheckInterval > 0) {
      this.healthTimer = setInterval(async () => {
        const wasHealthy = this.metrics.isHealthy;
        this.metrics.isHealthy = await this.checkHealth();
        if (!wasHealthy && this.metrics.isHealthy) {
          this.emit('reconnected');
        } else if (wasHealthy && !this.metrics.isHealthy) {
          this.emit('disconnected');
        }
      }, this.config.healthCheckInterval);
    }

    this.emit('started', { healthy: this.metrics.isHealthy });
  }

  async stop(): Promise<void> {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }

    // Abort all pending requests
    for (const controller of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();

    this.emit('stopped');
  }

  // ─── Inference ─────────────────────────────────────────────────────

  /**
   * Generate a chat completion using the local model.
   * This is the primary inference method.
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: Partial<{
      maxTokens: number;
      temperature: number;
      topP: number;
      stop: string[];
    }> = {},
  ): Promise<InferenceResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    this.abortControllers.add(controller);

    try {
      const body = {
        model: this.config.modelName,
        messages,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        temperature: options.temperature ?? this.config.temperature,
        top_p: options.topP ?? this.config.topP,
        repetition_penalty: this.config.repetitionPenalty,
        stop: options.stop,
        stream: false,
      };

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= this.config.retries; attempt++) {
        try {
          const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Inference server error ${response.status}: ${errorText}`);
          }

          const data = await response.json() as {
            choices: Array<{
              message: { content: string };
              finish_reason: string;
            }>;
            usage?: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
            };
          };

          const durationMs = Date.now() - startTime;
          const tokensGenerated = data.usage?.completion_tokens ?? 0;
          const tokensPrompt = data.usage?.prompt_tokens ?? 0;

          const result: InferenceResult = {
            content: data.choices[0]?.message?.content ?? '',
            tokensGenerated,
            tokensPrompt,
            durationMs,
            tokensPerSecond: tokensGenerated > 0 ? (tokensGenerated / durationMs) * 1000 : 0,
            finishReason: (data.choices[0]?.finish_reason as 'stop' | 'length') ?? 'stop',
          };

          // Update metrics
          this.metrics.totalRequests++;
          this.metrics.totalTokensGenerated += tokensGenerated;
          this.metrics.totalTokensPrompt += tokensPrompt;
          this.metrics.totalDurationMs += durationMs;
          this.metrics.averageTokensPerSecond =
            this.metrics.totalTokensGenerated > 0
              ? (this.metrics.totalTokensGenerated / this.metrics.totalDurationMs) * 1000
              : 0;
          this.metrics.lastRequestAt = Date.now();
          this.metrics.isHealthy = true;

          this.emit('inference_complete', result);
          return result;
        } catch (err) {
          lastError = err as Error;
          if (attempt < this.config.retries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      // All retries exhausted
      this.metrics.errors++;
      throw lastError ?? new Error('Inference failed after retries');
    } finally {
      this.abortControllers.delete(controller);
    }
  }

  /**
   * Generate a streaming chat completion.
   * Yields tokens as they are generated.
   */
  async *chatCompletionStream(
    messages: ChatMessage[],
    options: Partial<{
      maxTokens: number;
      temperature: number;
      stop: string[];
    }> = {},
  ): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    this.abortControllers.add(controller);

    try {
      const body = {
        model: this.config.modelName,
        messages,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        temperature: options.temperature ?? this.config.temperature,
        stream: true,
        stop: options.stop,
      };

      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6)) as {
                choices: Array<{ delta: { content?: string } }>;
              };
              const token = data.choices[0]?.delta?.content;
              if (token) {
                yield token;
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }

      this.metrics.totalRequests++;
      this.metrics.isHealthy = true;
    } catch (err) {
      this.metrics.errors++;
      throw err;
    } finally {
      this.abortControllers.delete(controller);
    }
  }

  /**
   * Simple text completion (non-chat format)
   */
  async textCompletion(
    prompt: string,
    options: Partial<{ maxTokens: number; temperature: number }> = {},
  ): Promise<InferenceResult> {
    return this.chatCompletion(
      [{ role: 'user', content: prompt }],
      options,
    );
  }

  /**
   * Generate embeddings using the local model (if supported)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.modelName,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding error: ${response.status}`);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
      };

      return data.data[0]?.embedding ?? [];
    } catch {
      // Embedding endpoint not available — return empty
      return [];
    }
  }

  // ─── Health ────────────────────────────────────────────────────────

  private async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.baseUrl}/health`, {
        signal: controller.signal,
      }).catch(() =>
        // Try alternative health endpoints
        fetch(`${this.config.baseUrl}/v1/models`, {
          signal: controller.signal,
        }),
      );

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  // ─── Accessors ─────────────────────────────────────────────────────

  isHealthy(): boolean {
    return this.metrics.isHealthy;
  }

  getMetrics(): Readonly<InferenceMetrics> {
    return { ...this.metrics };
  }

  getConfig(): Readonly<LucyDriverConfig> {
    return { ...this.config };
  }

  /**
   * Update the base URL (e.g., when the server restarts on a different port)
   */
  setBaseUrl(url: string): void {
    this.config.baseUrl = url;
    this.metrics.isHealthy = false;
  }
}
