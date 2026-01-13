/**
 * Desktop Integration Module
 *
 * Provides a unified interface for integrating deep-tree-echo-core
 * into desktop applications (Electron, Tauri).
 */

import { LLMService, CognitiveFunctionType } from '../cognitive/LLMService';
import { EnhancedLLMService, LLMConfig } from '../cognitive/EnhancedLLMService';
import { RAGMemoryStore, Memory } from '../memory/RAGMemoryStore';
import { PersonaCore } from '../personality/PersonaCore';
import { MemoryStorage, InMemoryStorage } from '../memory/storage';
import { getLogger } from '../utils/logger';

const log = getLogger('deep-tree-echo-core/integration/DesktopIntegration');

/**
 * Configuration for desktop integration
 */
export interface DesktopIntegrationConfig {
  // Storage configuration
  storage?: MemoryStorage;

  // LLM configuration
  llm?: {
    provider: 'openai' | 'anthropic' | 'openrouter' | 'ollama';
    apiKey?: string;
    baseURL?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };

  // Memory configuration
  memory?: {
    enabled: boolean;
    memoryLimit?: number;
    reflectionLimit?: number;
  };

  // Cognitive function keys
  cognitiveKeys?: Record<string, { apiKey: string; apiEndpoint?: string }>;

  // Feature flags
  features?: {
    parallelProcessing?: boolean;
    emotionalIntelligence?: boolean;
    selfReflection?: boolean;
  };
}

/**
 * Cognitive response with metadata
 */
export interface CognitiveResponse {
  content: string;
  emotionalState?: Record<string, number>;
  cognitiveState?: Record<string, number>;
  memoryContext?: string[];
  processingTime?: number;
  tokensUsed?: number;
}

/**
 * Desktop Integration class for unified cognitive services
 */
export class DesktopIntegration {
  private config: DesktopIntegrationConfig;
  private storage: MemoryStorage;
  private llmService: LLMService;
  private enhancedLLM: EnhancedLLMService | null = null;
  private ragMemory: RAGMemoryStore;
  private persona: PersonaCore;
  private initialized = false;

  constructor(config: DesktopIntegrationConfig = {}) {
    this.config = this.mergeWithDefaults(config);
    this.storage = config.storage || new InMemoryStorage();

    // Initialize services
    this.llmService = new LLMService();
    this.ragMemory = new RAGMemoryStore(this.storage, {
      memoryLimit: this.config.memory?.memoryLimit || 100,
      reflectionLimit: this.config.memory?.reflectionLimit || 20,
    });
    this.persona = new PersonaCore(this.storage);

    // Enable memory if configured
    if (this.config.memory?.enabled) {
      this.ragMemory.setEnabled(true);
    }

    if (this.config.llm) {
      this.enhancedLLM = new EnhancedLLMService({
        provider: this.config.llm.provider,
        apiKey: this.config.llm.apiKey,
        baseURL: this.config.llm.baseURL,
        model: this.config.llm.model || 'gpt-4',
        temperature: this.config.llm.temperature || 0.7,
        maxTokens: this.config.llm.maxTokens || 2000,
      });
    }

    log.info('DesktopIntegration initialized');
  }

  /**
   * Merge provided config with defaults
   */
  private mergeWithDefaults(config: DesktopIntegrationConfig): DesktopIntegrationConfig {
    return {
      memory: {
        enabled: true,
        memoryLimit: 100,
        reflectionLimit: 20,
        ...config.memory,
      },
      features: {
        parallelProcessing: true,
        emotionalIntelligence: true,
        selfReflection: true,
        ...config.features,
      },
      ...config,
    };
  }

  /**
   * Initialize the integration (async operations)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Configure cognitive function keys
      if (this.config.cognitiveKeys) {
        for (const [funcType, keyConfig] of Object.entries(this.config.cognitiveKeys)) {
          if (Object.values(CognitiveFunctionType).includes(funcType as CognitiveFunctionType)) {
            this.llmService.setFunctionConfig(funcType as CognitiveFunctionType, {
              apiKey: keyConfig.apiKey,
              apiEndpoint: keyConfig.apiEndpoint,
            });
          }
        }
      }

      // Configure main LLM service
      if (this.config.llm?.apiKey) {
        this.llmService.setConfig({
          apiKey: this.config.llm.apiKey,
          apiEndpoint: this.config.llm.baseURL || 'https://api.openai.com/v1/chat/completions',
        });
      }

      this.initialized = true;
      log.info('DesktopIntegration fully initialized');
    } catch (error) {
      log.error('Failed to initialize DesktopIntegration:', error);
      throw error;
    }
  }

  /**
   * Process a user message and generate a cognitive response
   */
  async processMessage(
    message: string,
    chatId: number,
    messageId: number
  ): Promise<CognitiveResponse> {
    const startTime = Date.now();

    try {
      // Store message in memory using RAGMemoryStore API
      if (this.config.memory?.enabled) {
        await this.ragMemory.storeMemory({
          chatId,
          messageId,
          sender: 'user',
          text: message,
        });
      }

      // Get conversation context from memory
      const recentMemories = this.ragMemory.retrieveRecentMemories(10);
      const context = recentMemories;

      // Get personality context
      const personality = this.persona.getPersonality();
      const dominantEmotion = this.persona.getDominantEmotion();

      // Generate response
      let responseContent: string;
      let tokensUsed: number | undefined;

      if (this.enhancedLLM) {
        const systemPrompt = this.buildSystemPrompt(personality, dominantEmotion);
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: message },
        ];

        const response = await this.enhancedLLM.complete(messages);
        responseContent = response.content;
        tokensUsed = response.usage?.totalTokens;
      } else {
        responseContent = await this.llmService.generateResponse(message, context);
      }

      // Store response in memory
      if (this.config.memory?.enabled) {
        await this.ragMemory.storeMemory({
          chatId,
          messageId: 0,
          sender: 'bot',
          text: responseContent,
        });
      }

      // Update emotional state based on interaction
      if (this.config.features?.emotionalIntelligence) {
        await this.updateEmotionalState(message, responseContent);
      }

      const processingTime = Date.now() - startTime;

      return {
        content: responseContent,
        emotionalState: this.persona.getEmotionalState(),
        cognitiveState: this.persona.getCognitiveState(),
        memoryContext: context.slice(-5),
        processingTime,
        tokensUsed,
      };
    } catch (error) {
      log.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Build system prompt with personality and context
   */
  private buildSystemPrompt(
    personality: string,
    dominantEmotion: { emotion: string; intensity: number }
  ): string {
    let prompt = personality;
    prompt += `\n\nCurrent emotional state: ${dominantEmotion.emotion} (intensity: ${dominantEmotion.intensity.toFixed(2)})`;
    return prompt;
  }

  /**
   * Update emotional state based on interaction
   */
  private async updateEmotionalState(userMessage: string, botResponse: string): Promise<void> {
    // Simple sentiment analysis for emotional update
    const positiveWords = ['thank', 'great', 'awesome', 'love', 'happy', 'good'];
    const negativeWords = ['hate', 'bad', 'terrible', 'angry', 'sad', 'frustrated'];

    const messageLower = userMessage.toLowerCase();
    const stimuli: Record<string, number> = {};

    positiveWords.forEach((word) => {
      if (messageLower.includes(word)) {
        stimuli['joy'] = (stimuli['joy'] || 0) + 0.3;
        stimuli['interest'] = (stimuli['interest'] || 0) + 0.1;
      }
    });

    negativeWords.forEach((word) => {
      if (messageLower.includes(word)) {
        stimuli['sadness'] = (stimuli['sadness'] || 0) + 0.2;
        stimuli['joy'] = (stimuli['joy'] || 0) - 0.2;
      }
    });

    if (Object.keys(stimuli).length > 0) {
      await this.persona.updateEmotionalState(stimuli);
    }
  }

  /**
   * Get the RAG memory store
   */
  getMemoryStore(): RAGMemoryStore {
    return this.ragMemory;
  }

  /**
   * Get the persona core
   */
  getPersona(): PersonaCore {
    return this.persona;
  }

  /**
   * Get the LLM service
   */
  getLLMService(): LLMService {
    return this.llmService;
  }

  /**
   * Get the enhanced LLM service (if configured)
   */
  getEnhancedLLM(): EnhancedLLMService | null {
    return this.enhancedLLM;
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<DesktopIntegrationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    if (config.llm) {
      if (this.enhancedLLM) {
        this.enhancedLLM.updateConfig(config.llm as LLMConfig);
      }

      if (config.llm.apiKey) {
        this.llmService.setConfig({
          apiKey: config.llm.apiKey,
          apiEndpoint: config.llm.baseURL,
        });
      }
    }

    log.info('DesktopIntegration config updated');
  }

  /**
   * Clear all memories
   */
  async clearMemory(): Promise<void> {
    await this.ragMemory.clearAllMemories();
    log.info('All memories cleared');
  }

  /**
   * Get integration status
   */
  getStatus(): {
    initialized: boolean;
    memoryEnabled: boolean;
    llmConfigured: boolean;
    enhancedLLMConfigured: boolean;
  } {
    return {
      initialized: this.initialized,
      memoryEnabled: this.config.memory?.enabled || false,
      llmConfigured: this.llmService.isFunctionConfigured(CognitiveFunctionType.GENERAL),
      enhancedLLMConfigured: !!this.enhancedLLM,
    };
  }
}

/**
 * Create a pre-configured desktop integration instance
 */
export function createDesktopIntegration(
  storage: MemoryStorage,
  llmConfig?: LLMConfig
): DesktopIntegration {
  return new DesktopIntegration({
    storage,
    llm: llmConfig,
    memory: {
      enabled: true,
      memoryLimit: 100,
      reflectionLimit: 20,
    },
    features: {
      parallelProcessing: true,
      emotionalIntelligence: true,
      selfReflection: true,
    },
  });
}
