/**
 * LLM Adapter for Cognitive Package
 *
 * Provides cognitive interface integration with LLMService
 * for inference with cognitive context enrichment.
 */

import { EmotionalVector, LLMProcessorFn } from "../types";
import type { UnifiedMessage as _UnifiedMessage } from "../types";

/**
 * LLM response structure
 */
export interface LLMResponse {
  /** Generated text */
  content: string;
  /** Token count */
  tokens?: number;
  /** Model used */
  model?: string;
  /** Processing time (ms) */
  processingTime?: number;
  /** Finish reason */
  finishReason?: "stop" | "length" | "content_filter" | "error";
}

/**
 * LLMService interface
 */
export interface ILLMService {
  generateResponse(
    userMessage: string,
    conversationHistory?: { role: string; content: string }[],
    systemPrompt?: string,
  ): Promise<string>;
}

/**
 * LLM adapter configuration
 */
export interface LLMAdapterConfig {
  /** Include emotional context in prompts */
  includeEmotionalContext: boolean;
  /** Include memory context in prompts */
  includeMemoryContext: boolean;
  /** Maximum context length */
  maxContextLength: number;
  /** Temperature for generation */
  temperature: number;
  /** Enable response caching */
  enableCache: boolean;
  /** Cache TTL (ms) */
  cacheTTL: number;
}

/**
 * Default LLM config
 */
export const DEFAULT_LLM_CONFIG: LLMAdapterConfig = {
  includeEmotionalContext: true,
  includeMemoryContext: true,
  maxContextLength: 4000,
  temperature: 0.7,
  enableCache: false,
  cacheTTL: 60000,
};

/**
 * Prompt context for LLM generation
 */
export interface PromptContext {
  /** User message */
  message: string;
  /** System prompt */
  systemPrompt: string;
  /** Conversation history */
  history: { role: string; content: string }[];
  /** Memory context */
  memoryContext?: string;
  /** Emotional state */
  emotionalState?: EmotionalVector;
  /** Cognitive parameters */
  cognitiveParams?: Record<string, number>;
}

/**
 * LLMAdapter bridges LLMService with cognitive processing
 */
export class LLMAdapter {
  private llm: ILLMService | null = null;
  private customProcessor: LLMProcessorFn | null = null;
  private config: LLMAdapterConfig;
  private cache: Map<string, { response: string; timestamp: number }> =
    new Map();

  constructor(config: Partial<LLMAdapterConfig> = {}) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
  }

  /**
   * Connect to LLMService instance
   */
  connect(llm: ILLMService): void {
    this.llm = llm;
  }

  /**
   * Set custom LLM processor function
   */
  setProcessor(processor: LLMProcessorFn): void {
    this.customProcessor = processor;
  }

  /**
   * Disconnect from LLM service
   */
  disconnect(): void {
    this.llm = null;
    this.customProcessor = null;
    this.clearCache();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.llm !== null || this.customProcessor !== null;
  }

  /**
   * Generate response with cognitive context
   */
  async generate(context: PromptContext): Promise<LLMResponse> {
    const startTime = Date.now();

    // Build enriched prompt
    const enrichedSystemPrompt = this.buildEnrichedPrompt(context);
    const enrichedHistory = this.buildEnrichedHistory(context);

    // Check cache
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(context.message, enrichedSystemPrompt);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          content: cached,
          processingTime: Date.now() - startTime,
          finishReason: "stop",
        };
      }
    }

    let content: string;

    try {
      if (this.customProcessor) {
        // Use custom processor
        content = await this.customProcessor(
          context.message,
          this.formatContext(context),
          enrichedSystemPrompt,
        );
      } else if (this.llm) {
        // Use LLM service
        content = await this.llm.generateResponse(
          context.message,
          enrichedHistory,
          enrichedSystemPrompt,
        );
      } else {
        // Fallback response
        content = this.getFallbackResponse(context);
      }
    } catch (_error) {
      return {
        content:
          "I apologize, but I encountered an error processing your message. Please try again.",
        processingTime: Date.now() - startTime,
        finishReason: "error",
      };
    }

    // Cache result
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(context.message, enrichedSystemPrompt);
      this.addToCache(cacheKey, content);
    }

    return {
      content,
      processingTime: Date.now() - startTime,
      finishReason: "stop",
    };
  }

  /**
   * Build enriched system prompt with cognitive context
   */
  private buildEnrichedPrompt(context: PromptContext): string {
    let prompt = context.systemPrompt;

    // Add emotional context
    if (this.config.includeEmotionalContext && context.emotionalState) {
      const emotionalPrompt = this.buildEmotionalPrompt(context.emotionalState);
      if (emotionalPrompt) {
        prompt += "\n\n" + emotionalPrompt;
      }
    }

    // Add cognitive parameters
    if (context.cognitiveParams) {
      const cognitivePrompt = this.buildCognitivePrompt(
        context.cognitiveParams,
      );
      if (cognitivePrompt) {
        prompt += "\n\n" + cognitivePrompt;
      }
    }

    // Add memory context
    if (this.config.includeMemoryContext && context.memoryContext) {
      prompt += "\n\n" + context.memoryContext;
    }

    // Truncate if too long
    if (prompt.length > this.config.maxContextLength) {
      prompt = prompt.slice(0, this.config.maxContextLength) + "...";
    }

    return prompt;
  }

  /**
   * Build emotional context for prompt
   */
  private buildEmotionalPrompt(state: EmotionalVector): string {
    if (state.dominant === "neutral") return "";

    const intensity = this.getEmotionIntensity(state);
    let prompt = `Current emotional context: feeling ${state.dominant}`;

    if (intensity !== "mild") {
      prompt += ` (${intensity} intensity)`;
    }

    // Add guidance based on emotion
    switch (state.dominant) {
      case "joy":
        prompt += "\nRespond with warmth and enthusiasm.";
        break;
      case "sadness":
        prompt += "\nRespond with empathy and comfort.";
        break;
      case "anger":
        prompt +=
          "\nRemain calm and understanding while acknowledging frustration.";
        break;
      case "fear":
        prompt += "\nProvide reassurance and support.";
        break;
      case "surprise":
        prompt += "\nAcknowledge the unexpected and provide clarity.";
        break;
      case "interest":
        prompt += "\nEngage with intellectual curiosity.";
        break;
    }

    return prompt;
  }

  /**
   * Get emotion intensity level
   */
  private getEmotionIntensity(state: EmotionalVector): string {
    const key = state.dominant as keyof EmotionalVector;
    const value = state[key];
    if (typeof value === "number") {
      return value > 0.7 ? "high" : value > 0.4 ? "moderate" : "mild";
    }
    return "mild";
  }

  /**
   * Build cognitive parameters prompt
   */
  private buildCognitivePrompt(params: Record<string, number>): string {
    const parts: string[] = [];

    if (params.creativity > 0.7) {
      parts.push("Be creative and exploratory in responses.");
    } else if (params.creativity < 0.3) {
      parts.push("Be precise and focused in responses.");
    }

    if (params.analyticalDepth > 0.7) {
      parts.push("Provide detailed analytical depth.");
    }

    if (params.empathy > 0.7) {
      parts.push("Emphasize emotional understanding.");
    }

    if (parts.length === 0) return "";
    return "Response style guidelines:\n" + parts.join("\n");
  }

  /**
   * Build enriched conversation history
   */
  private buildEnrichedHistory(
    context: PromptContext,
  ): { role: string; content: string }[] {
    // Limit history length
    const maxMessages = 10;
    return context.history.slice(-maxMessages);
  }

  /**
   * Format context as string
   */
  private formatContext(context: PromptContext): string {
    let formatted = "";

    if (context.history.length > 0) {
      formatted += context.history
        .slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      formatted += "\n\n";
    }

    if (context.memoryContext) {
      formatted += context.memoryContext + "\n\n";
    }

    return formatted;
  }

  /**
   * Get fallback response when no LLM available
   */
  private getFallbackResponse( _context: PromptContext): string {
    const responses = [
      "I understand you're reaching out. While I'm currently in a limited mode, I'm here to help.",
      "Thank you for your message. I'm processing in a simplified mode right now.",
      "I hear you. Let me think about that...",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Get cache key
   */
  private getCacheKey(message: string, systemPrompt: string): string {
    return `${message.slice(0, 100)}::${systemPrompt.slice(0, 50)}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  /**
   * Add to cache
   */
  private addToCache(key: string, response: string): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.cache.size > 50) {
      const oldest = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      )[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMAdapterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMAdapterConfig {
    return { ...this.config };
  }
}

/**
 * Create an LLM adapter
 */
export function createLLMAdapter(
  config?: Partial<LLMAdapterConfig>,
): LLMAdapter {
  return new LLMAdapter(config);
}
