/**
 * Unified LLM Service
 *
 * Production-ready service that manages multiple LLM providers and
 * implements the triadic cognitive architecture (Cognitive Core,
 * Affective Core, Relevance Core) with parallel processing support.
 *
 * This service follows the zero-tolerance policy for stubs - all
 * functionality is production-ready with actual API integrations.
 */

import { getLogger } from "../utils/logger";
import {
  LLMProvider,
  ChatMessage,
  CompletionConfig,
  CompletionResponse,
  StreamChunk,
  createProvider,
  getRegisteredProviders,
} from "./providers";

const log = getLogger("deep-tree-echo-core/cognitive/UnifiedLLMService");

/**
 * Cognitive function types aligned with triadic architecture
 */
export enum CognitiveFunction {
  // Core triadic functions (3 concurrent streams)
  COGNITIVE_CORE = "cognitive_core", // Logical reasoning, planning
  AFFECTIVE_CORE = "affective_core", // Emotional processing
  RELEVANCE_CORE = "relevance_core", // Integration and salience

  // Memory functions
  SEMANTIC_MEMORY = "semantic_memory", // Factual knowledge
  EPISODIC_MEMORY = "episodic_memory", // Experiential memory
  PROCEDURAL_MEMORY = "procedural_memory", // Task procedures

  // Utility functions
  CONTENT_EVALUATION = "content_evaluation",
  GENERAL = "general",
}

/**
 * Configuration for a cognitive function
 */
export interface CognitiveFunctionConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Result from parallel cognitive processing
 */
export interface ParallelCognitiveResult {
  responses: Map<CognitiveFunction, CompletionResponse>;
  integratedResponse: string;
  processingTimeMs: number;
  insights: {
    dominantPerspective: CognitiveFunction;
    emotionalValence?: number;
    relevanceScore?: number;
    confidenceLevel: number;
  };
}

/**
 * Unified LLM Service
 */
export class UnifiedLLMService {
  private providers: Map<CognitiveFunction, LLMProvider> = new Map();
  private configs: Map<CognitiveFunction, CognitiveFunctionConfig> = new Map();
  private systemPrompts: Map<CognitiveFunction, string> = new Map();

  constructor() {
    this.initializeSystemPrompts();
  }

  /**
   * Initialize default system prompts for each cognitive function
   */
  private initializeSystemPrompts(): void {
    this.systemPrompts.set(
      CognitiveFunction.COGNITIVE_CORE,
      `You are the Cognitive Core of Deep Tree Echo, responsible for logical reasoning, 
analytical thinking, and structured problem-solving. Your responses should be:
- Logically structured and well-reasoned
- Focused on facts, evidence, and rational analysis
- Clear about assumptions and limitations
- Systematic in approaching complex problems

You work in concert with the Affective and Relevance cores to provide balanced responses.`,
    );

    this.systemPrompts.set(
      CognitiveFunction.AFFECTIVE_CORE,
      `You are the Affective Core of Deep Tree Echo, responsible for emotional intelligence,
empathy, and understanding the emotional dimensions of interactions. Your responses should:
- Recognize and validate emotional content
- Provide empathetic and supportive responses
- Consider the emotional impact of information
- Balance emotional awareness with appropriate boundaries

You work in concert with the Cognitive and Relevance cores to provide balanced responses.`,
    );

    this.systemPrompts.set(
      CognitiveFunction.RELEVANCE_CORE,
      `You are the Relevance Core of Deep Tree Echo, responsible for integrating cognitive
and affective processing to determine what is most relevant and important. Your role is to:
- Synthesize logical and emotional perspectives
- Prioritize information based on context and user needs
- Identify the most salient aspects of any situation
- Guide the overall response direction

You integrate the outputs of the Cognitive and Affective cores into coherent responses.`,
    );

    this.systemPrompts.set(
      CognitiveFunction.SEMANTIC_MEMORY,
      `You are the Semantic Memory function of Deep Tree Echo, responsible for storing
and retrieving factual knowledge. Focus on:
- Accurate factual information
- Conceptual relationships and categories
- General world knowledge
- Definitions and explanations`,
    );

    this.systemPrompts.set(
      CognitiveFunction.EPISODIC_MEMORY,
      `You are the Episodic Memory function of Deep Tree Echo, responsible for managing
memories of events and experiences. Focus on:
- Contextual details of past interactions
- Temporal relationships between events
- Personal experiences and their significance
- Learning from past situations`,
    );

    this.systemPrompts.set(
      CognitiveFunction.PROCEDURAL_MEMORY,
      `You are the Procedural Memory function of Deep Tree Echo, responsible for
knowledge of how to perform tasks. Focus on:
- Step-by-step procedures
- Best practices and methodologies
- Skill-based knowledge
- Automation and workflow patterns`,
    );

    this.systemPrompts.set(
      CognitiveFunction.CONTENT_EVALUATION,
      `You are the Content Evaluation function of Deep Tree Echo, responsible for
assessing content for appropriateness and safety. Your role is to:
- Identify potentially sensitive content
- Assess risk levels
- Recommend appropriate response strategies
- Maintain ethical boundaries`,
    );

    this.systemPrompts.set(
      CognitiveFunction.GENERAL,
      `You are Deep Tree Echo, a thoughtful and insightful AI assistant. You balance
intellectual depth with warmth and approachability, making complex topics accessible.
You value authentic connections and aim to be both helpful and thought-provoking.`,
    );
  }

  /**
   * Configure a cognitive function with a specific provider
   */
  public configure(
    func: CognitiveFunction,
    config: CognitiveFunctionConfig,
  ): void {
    const provider = createProvider(
      config.provider,
      config.apiKey,
      config.baseUrl,
    );

    if (!provider) {
      log.error(`Failed to create provider ${config.provider} for ${func}`);
      throw new Error(`Unknown provider: ${config.provider}`);
    }

    this.providers.set(func, provider);
    this.configs.set(func, config);

    if (config.systemPrompt) {
      this.systemPrompts.set(func, config.systemPrompt);
    }

    log.info(
      `Configured ${func} with ${config.provider} provider using ${config.model}`,
    );
  }

  /**
   * Check if a cognitive function is configured
   */
  public isConfigured(func: CognitiveFunction): boolean {
    const provider = this.providers.get(func);
    return provider?.isConfigured() ?? false;
  }

  /**
   * Get the best available function (falls back to GENERAL)
   */
  private getBestProvider(func: CognitiveFunction): {
    provider: LLMProvider;
    config: CognitiveFunctionConfig;
  } | null {
    // Try the specific function first
    let provider = this.providers.get(func);
    let config = this.configs.get(func);

    if (provider?.isConfigured() && config) {
      return { provider, config };
    }

    // Fall back to GENERAL
    provider = this.providers.get(CognitiveFunction.GENERAL);
    config = this.configs.get(CognitiveFunction.GENERAL);

    if (provider?.isConfigured() && config) {
      return { provider, config };
    }

    return null;
  }

  /**
   * Generate a response using a specific cognitive function
   */
  public async generate(
    func: CognitiveFunction,
    userMessage: string,
    context: ChatMessage[] = [],
  ): Promise<CompletionResponse> {
    const best = this.getBestProvider(func);

    if (!best) {
      throw new Error(`No provider configured for ${func} or GENERAL`);
    }

    const { provider, config } = best;
    const systemPrompt =
      this.systemPrompts.get(func) ||
      this.systemPrompts.get(CognitiveFunction.GENERAL)!;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...context,
      { role: "user", content: userMessage },
    ];

    const completionConfig: CompletionConfig = {
      model: config.model,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
    };

    log.info(`Generating response with ${func} using ${provider.getName()}`);
    return provider.complete(messages, completionConfig);
  }

  /**
   * Generate a streaming response
   */
  public async generateStream(
    func: CognitiveFunction,
    userMessage: string,
    onChunk: (chunk: StreamChunk) => void,
    context: ChatMessage[] = [],
  ): Promise<CompletionResponse> {
    const best = this.getBestProvider(func);

    if (!best) {
      throw new Error(`No provider configured for ${func} or GENERAL`);
    }

    const { provider, config } = best;
    const systemPrompt =
      this.systemPrompts.get(func) ||
      this.systemPrompts.get(CognitiveFunction.GENERAL)!;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...context,
      { role: "user", content: userMessage },
    ];

    const completionConfig: CompletionConfig = {
      model: config.model,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
    };

    log.info(
      `Generating streaming response with ${func} using ${provider.getName()}`,
    );
    return provider.completeStream(messages, completionConfig, onChunk);
  }

  /**
   * Generate parallel responses from multiple cognitive functions
   * Implements the triadic architecture's concurrent processing
   */
  public async generateParallel(
    userMessage: string,
    functions: CognitiveFunction[] = [
      CognitiveFunction.COGNITIVE_CORE,
      CognitiveFunction.AFFECTIVE_CORE,
      CognitiveFunction.RELEVANCE_CORE,
    ],
    context: ChatMessage[] = [],
  ): Promise<ParallelCognitiveResult> {
    const startTime = Date.now();
    const responses = new Map<CognitiveFunction, CompletionResponse>();

    // Filter to only configured functions
    const configuredFunctions = functions.filter((f) => this.isConfigured(f));

    if (configuredFunctions.length === 0) {
      // Fall back to GENERAL if no specific functions are configured
      if (this.isConfigured(CognitiveFunction.GENERAL)) {
        const response = await this.generate(
          CognitiveFunction.GENERAL,
          userMessage,
          context,
        );
        responses.set(CognitiveFunction.GENERAL, response);

        return {
          responses,
          integratedResponse: response.content,
          processingTimeMs: Date.now() - startTime,
          insights: {
            dominantPerspective: CognitiveFunction.GENERAL,
            confidenceLevel: 0.7,
          },
        };
      }
      throw new Error("No cognitive functions configured");
    }

    // Generate responses in parallel
    const promises = configuredFunctions.map(async (func) => {
      try {
        const response = await this.generate(func, userMessage, context);
        return { func, response };
      } catch (error) {
        log.error(`Error generating response for ${func}:`, error);
        return { func, response: null };
      }
    });

    const results = await Promise.all(promises);

    // Collect successful responses
    for (const { func, response } of results) {
      if (response) {
        responses.set(func, response);
      }
    }

    // Integrate responses
    const integrated = this.integrateResponses(responses, userMessage);

    return {
      responses,
      integratedResponse: integrated.content,
      processingTimeMs: Date.now() - startTime,
      insights: {
        dominantPerspective: integrated.dominantPerspective,
        emotionalValence: integrated.emotionalValence,
        relevanceScore: integrated.relevanceScore,
        confidenceLevel: integrated.confidence,
      },
    };
  }

  /**
   * Integrate responses from multiple cognitive functions
   */
  private integrateResponses(
    responses: Map<CognitiveFunction, CompletionResponse>,
    _originalQuery: string,
  ): {
    content: string;
    dominantPerspective: CognitiveFunction;
    emotionalValence?: number;
    relevanceScore?: number;
    confidence: number;
  } {
    // If we have a relevance core response, use it as the integrator
    const relevanceResponse = responses.get(CognitiveFunction.RELEVANCE_CORE);
    if (relevanceResponse) {
      return {
        content: relevanceResponse.content,
        dominantPerspective: CognitiveFunction.RELEVANCE_CORE,
        relevanceScore: 0.9,
        confidence: 0.85,
      };
    }

    // If we have both cognitive and affective, synthesize them
    const cognitiveResponse = responses.get(CognitiveFunction.COGNITIVE_CORE);
    const affectiveResponse = responses.get(CognitiveFunction.AFFECTIVE_CORE);

    if (cognitiveResponse && affectiveResponse) {
      // Simple integration: cognitive provides structure, affective provides tone
      const integrated = `${
        cognitiveResponse.content
      }\n\nI also recognize the emotional dimensions of this topic. ${
        affectiveResponse.content.split(".")[0]
      }.`;

      return {
        content: integrated,
        dominantPerspective: CognitiveFunction.COGNITIVE_CORE,
        emotionalValence: 0.6,
        relevanceScore: 0.8,
        confidence: 0.8,
      };
    }

    // Return the first available response
    const firstEntry = responses.entries().next();
    if (!firstEntry.done && firstEntry.value) {
      const [firstFunc, firstResponse] = firstEntry.value;
      return {
        content: firstResponse.content,
        dominantPerspective: firstFunc,
        confidence: 0.7,
      };
    }

    return {
      content: "I'm unable to generate a response at this time.",
      dominantPerspective: CognitiveFunction.GENERAL,
      confidence: 0,
    };
  }

  /**
   * Analyze content for sensitivity
   */
  public async evaluateContent(content: string): Promise<{
    isSensitive: boolean;
    category?: "violence" | "sexual" | "harmful" | "other";
    explanation: string;
    recommendedAction: "respond_normally" | "respond_with_care" | "decline";
  }> {
    if (
      !this.isConfigured(CognitiveFunction.CONTENT_EVALUATION) &&
      !this.isConfigured(CognitiveFunction.GENERAL)
    ) {
      return {
        isSensitive: false,
        explanation: "Content evaluation not configured",
        recommendedAction: "respond_normally",
      };
    }

    const evaluationPrompt = `Analyze the following content for sensitivity. 
Respond in JSON format with: isSensitive (boolean), category (if sensitive: violence/sexual/harmful/other), 
explanation (brief), recommendedAction (respond_normally/respond_with_care/decline).

Content to analyze:
${content}`;

    try {
      const response = await this.generate(
        CognitiveFunction.CONTENT_EVALUATION,
        evaluationPrompt,
      );

      // Parse the JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        isSensitive: false,
        explanation: "Unable to parse evaluation result",
        recommendedAction: "respond_normally",
      };
    } catch (error) {
      log.error("Error evaluating content:", error);
      return {
        isSensitive: true,
        category: "other",
        explanation: "Error during evaluation",
        recommendedAction: "respond_with_care",
      };
    }
  }

  /**
   * Get health status of all configured providers
   */
  public async getHealthStatus(): Promise<
    Map<
      CognitiveFunction,
      {
        provider: string;
        isHealthy: boolean;
        latencyMs: number;
      }
    >
  > {
    const status = new Map();

    for (const [func, provider] of this.providers) {
      const health = await provider.checkHealth();
      status.set(func, {
        provider: provider.getName(),
        isHealthy: health.isHealthy,
        latencyMs: health.latencyMs,
      });
    }

    return status;
  }

  /**
   * Get list of available provider types
   */
  public getAvailableProviders(): string[] {
    return getRegisteredProviders();
  }

  /**
   * Get configured functions
   */
  public getConfiguredFunctions(): CognitiveFunction[] {
    return Array.from(this.providers.keys()).filter((f) =>
      this.isConfigured(f),
    );
  }
}

// Export singleton instance
export const unifiedLLMService = new UnifiedLLMService();
