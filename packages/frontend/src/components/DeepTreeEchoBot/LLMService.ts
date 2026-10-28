import { getLogger } from "../../../../shared/logger";
import { Memory } from "./RAGMemoryStore";
import { localIntelligence as _localIntelligence } from "./LocalIntelligence";
import { getDefaultLLMEndpoint } from "./llmEndpoint";

const log = getLogger("render/components/DeepTreeEchoBot/LLMService");

/**
 * Configuration for a single LLM service instance
 */
export interface LLMServiceConfig {
  apiKey: string;
  apiEndpoint: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Options type for LLM service (alias for LLMServiceConfig for compatibility)
 */
export type LLMServiceOptions = Partial<LLMServiceConfig>;

/**
 * Represents a cognitive or memory function with its own API key
 */
export interface CognitiveFunction {
  id: string;
  name: string;
  description: string;
  config: LLMServiceConfig;
  usage: {
    totalTokens: number;
    lastUsed: number;
    requestCount: number;
  };
}

/**
 * Types of cognitive functions supported by the service
 */
export enum CognitiveFunctionType {
  // Core cognitive functions
  COGNITIVE_CORE = "cognitive_core",
  AFFECTIVE_CORE = "affective_core",
  RELEVANCE_CORE = "relevance_core",

  // Memory functions
  SEMANTIC_MEMORY = "semantic_memory",
  EPISODIC_MEMORY = "episodic_memory",
  PROCEDURAL_MEMORY = "procedural_memory",

  // Content evaluation
  CONTENT_EVALUATION = "content_evaluation",

  // Autonomous Cognitive Streams
  NARRATIVE = "narrative",
  DREAM_INTEGRATION = "dream_integration",

  // Default for general use when specific function not required
  GENERAL = "general",
}

/**
 * Grouped cognitive function result from parallel processing
 */
export interface ParallelCognitiveResult {
  processing: Record<CognitiveFunctionType, string>;
  integratedResponse: string;
  insights: Record<string, any>;
}

/**
 * Service for interacting with Language Model APIs
 * Supports multiple API keys for different cognitive functions
 */
export class LLMService {
  private static instance: LLMService;
  private cognitiveFunctions: Map<string, CognitiveFunction> = new Map();
  private defaultConfig: Partial<LLMServiceConfig> = {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000,
  };

  private constructor() {
    // Initialize with default general function
    this.cognitiveFunctions.set(CognitiveFunctionType.GENERAL, {
      id: CognitiveFunctionType.GENERAL,
      name: "General Processing",
      description:
        "Default function for general processing when no specific function is required",
      config: {
        apiKey: "",
        apiEndpoint: getDefaultLLMEndpoint(),
        ...this.defaultConfig,
      },
      usage: {
        totalTokens: 0,
        lastUsed: 0,
        requestCount: 0,
      },
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Set configuration for a specific cognitive function
   */
  public setFunctionConfig(
    functionType: CognitiveFunctionType,
    config: Partial<LLMServiceConfig>,
  ): void {
    const currentFunction = this.cognitiveFunctions.get(functionType);

    if (currentFunction) {
      // Update existing function
      currentFunction.config = { ...currentFunction.config, ...config };
      this.cognitiveFunctions.set(functionType, currentFunction);
    } else {
      // Create new function with provided config
      this.cognitiveFunctions.set(functionType, {
        id: functionType,
        name: this.getFunctionName(functionType),
        description: this.getFunctionDescription(functionType),
        config: {
          apiKey: config.apiKey || "",
          apiEndpoint: config.apiEndpoint || getDefaultLLMEndpoint(),
          model: config.model || this.defaultConfig.model,
          temperature: config.temperature || this.defaultConfig.temperature,
          maxTokens: config.maxTokens || this.defaultConfig.maxTokens,
        },
        usage: {
          totalTokens: 0,
          lastUsed: 0,
          requestCount: 0,
        },
      });
    }

    log.info(`Configured ${functionType} function`);
  }

  /**
   * Get a readable function name for logging
   */
  private getFunctionName(functionType: CognitiveFunctionType): string {
    switch (functionType) {
      case CognitiveFunctionType.COGNITIVE_CORE:
        return "Cognitive Core";
      case CognitiveFunctionType.AFFECTIVE_CORE:
        return "Affective Core";
      case CognitiveFunctionType.RELEVANCE_CORE:
        return "Relevance Core";
      case CognitiveFunctionType.SEMANTIC_MEMORY:
        return "Semantic Memory";
      case CognitiveFunctionType.EPISODIC_MEMORY:
        return "Episodic Memory";
      case CognitiveFunctionType.PROCEDURAL_MEMORY:
        return "Procedural Memory";
      case CognitiveFunctionType.CONTENT_EVALUATION:
        return "Content Evaluation";
      case CognitiveFunctionType.NARRATIVE:
        return "Narrative Synthesis";
      case CognitiveFunctionType.DREAM_INTEGRATION:
        return "Dream Integration";
      case CognitiveFunctionType.GENERAL:
        return "General Processing";
      default:
        return "Unknown Function";
    }
  }

  /**
   * Get function description for logging and UI
   */
  private getFunctionDescription(functionType: CognitiveFunctionType): string {
    switch (functionType) {
      case CognitiveFunctionType.COGNITIVE_CORE:
        return "Handles logical reasoning, planning, and analytical thinking";
      case CognitiveFunctionType.AFFECTIVE_CORE:
        return "Processes emotional content and generates appropriate emotional responses";
      case CognitiveFunctionType.RELEVANCE_CORE:
        return "Integrates cognitive and affective processing to determine relevance";
      case CognitiveFunctionType.SEMANTIC_MEMORY:
        return "Stores and retrieves factual knowledge and conceptual information";
      case CognitiveFunctionType.EPISODIC_MEMORY:
        return "Manages memories of events and experiences";
      case CognitiveFunctionType.PROCEDURAL_MEMORY:
        return "Handles knowledge of how to perform tasks and procedures";
      case CognitiveFunctionType.CONTENT_EVALUATION:
        return "Evaluates potentially sensitive content to determine appropriate responses";
      case CognitiveFunctionType.NARRATIVE:
        return "Generates creative narrative, journals, and proactive creative thoughts";
      case CognitiveFunctionType.DREAM_INTEGRATION:
        return "Integrates rest intervals, latent shadows, and temporal drift patterns";
      case CognitiveFunctionType.GENERAL:
        return "Default function for general processing";
      default:
        return "Unknown function type";
    }
  }

  /**
   * Set configuration for the general/default function
   * Backward compatibility with the previous single-key implementation
   */
  public setConfig(config: Partial<LLMServiceConfig>): void {
    this.setFunctionConfig(CognitiveFunctionType.GENERAL, config);
    log.info("LLM service general configuration updated");
  }

  /**
   * Get all configured cognitive functions
   */
  public getAllFunctions(): CognitiveFunction[] {
    return Array.from(this.cognitiveFunctions.values());
  }

  /**
   * Get all functioning cognitive cores
   */
  public getActiveFunctions(): CognitiveFunction[] {
    return Array.from(this.cognitiveFunctions.values()).filter(
      (func) => !!func.config.apiKey,
    );
  }

  /**
   * Check if a specific cognitive function is configured
   */
  public isFunctionConfigured(functionType: CognitiveFunctionType): boolean {
    const func = this.cognitiveFunctions.get(functionType);
    return !!func && !!func.config.apiKey;
  }

  /**
   * Verify that a local model endpoint is reachable
   * Makes a lightweight request to check if the server is responding
   */
  private async verifyLocalEndpoint(endpoint: string): Promise<boolean> {
    try {
      // Try a simple GET or OPTIONS request to the endpoint
      // Most OpenAI-compatible servers support /models endpoint
      const modelsEndpoint = endpoint.replace(
        /\/chat\/completions\/?$/,
        "/models",
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(modelsEndpoint, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Any response (even 401/403) means the server is running
        return response.status < 500;
      } catch (_fetchError: any) {
        clearTimeout(timeoutId);

        // If /models fails, try a HEAD request to the main endpoint
        const headResponse = await fetch(endpoint, {
          method: "HEAD",
        });
        return headResponse.status < 500;
      }
    } catch (error) {
      log.warn(`Local endpoint verification failed for ${endpoint}:`, error);
      return false;
    }
  }

  /**
   * Get the best available cognitive function for a specific type
   * Falls back to general function if specific function not available
   */
  private getBestAvailableFunction(
    functionType: CognitiveFunctionType,
  ): CognitiveFunction {
    // Try to get the specific function
    const specificFunction = this.cognitiveFunctions.get(functionType);
    if (specificFunction && specificFunction.config.apiKey) {
      return specificFunction;
    }

    // Fall back to general function
    const generalFunction = this.cognitiveFunctions.get(
      CognitiveFunctionType.GENERAL,
    );
    if (generalFunction && generalFunction.config.apiKey) {
      return generalFunction;
    }

    // Create a placeholder function if none are configured
    return {
      id: "unconfigured",
      name: "Unconfigured Function",
      description: "No API key provided for any function",
      config: {
        apiKey: "",
        apiEndpoint: getDefaultLLMEndpoint(),
        ...this.defaultConfig,
      },
      usage: {
        totalTokens: 0,
        lastUsed: 0,
        requestCount: 0,
      },
    };
  }

  /**
   * Generate a response using the default/general cognitive function
   * Maintains backward compatibility with the original implementation
   */
  public async generateResponse(
    input: string | any[],
    context: string[] = [],
  ): Promise<string> {
    // Use the general function by default
    return this.generateResponseWithFunction(
      CognitiveFunctionType.GENERAL,
      input,
      context,
    );
  }

  /**
   * Generate a response using a specific cognitive function
   */
  public async generateResponseWithFunction(
    functionType: CognitiveFunctionType,
    input: string | any[],
    context: string[] = [],
  ): Promise<string> {
    try {
      const cognitiveFunction = this.getBestAvailableFunction(functionType);

      // Check if model is available - different checks for local vs remote
      const isLocalEndpoint =
        cognitiveFunction.config.apiEndpoint.includes("localhost") ||
        cognitiveFunction.config.apiEndpoint.includes("127.0.0.1");

      if (isLocalEndpoint) {
        // Local model - verify endpoint is actually reachable
        log.info(
          `Verifying local model at ${cognitiveFunction.config.apiEndpoint}`,
        );
        const isReachable = await this.verifyLocalEndpoint(
          cognitiveFunction.config.apiEndpoint,
        );
        if (!isReachable) {
          throw new Error(
            `MODEL_UNAVAILABLE: Local model at ${cognitiveFunction.config.apiEndpoint} is not reachable. ` +
              `Ensure the local model server is running.`,
          );
        }
        log.info(
          `Local model verified at ${cognitiveFunction.config.apiEndpoint}`,
        );
      } else if (!cognitiveFunction.config.apiKey) {
        // Remote API - requires API key
        log.warn(`No API key provided for ${cognitiveFunction.name}`);
        throw new Error(
          `MODEL_UNAVAILABLE: ${cognitiveFunction.name} requires an API key for remote endpoint. Configure it in settings.`,
        );
      }

      log.info(`Generating response with ${cognitiveFunction.name}`);

      // Build the system prompt based on function type
      const systemPrompt = this.getSystemPromptForFunction(functionType);

      // Build messages array with context
      const messages: Array<{ role: string; content: string | Array<any> }> = [
        { role: "system", content: systemPrompt },
      ];

      // Add context from previous messages
      for (const msg of context) {
        if (msg.startsWith("User:")) {
          messages.push({
            role: "user",
            content: msg.replace("User:", "").trim(),
          });
        } else if (msg.startsWith("Bot:")) {
          messages.push({
            role: "assistant",
            content: msg.replace("Bot:", "").trim(),
          });
        }
      }

      // Add the current user message
      // If input is an array (Vision/Multi-modal), just push it.
      // If it is a string, push as string.
      // Note: If input is array of content parts, it goes into 'content' field.
      // If input is array of MESSAGES (from DeepTreeEchoBot hack), we need to spread it?
      // DeepTreeEchoBot Step 1157 constructs: [{role: system}, {role: user (context)}, {role: assistant}, {role: user (input)}]
      // And passes that whole ARRAY as `input`.
      // So here `input` is actually `messages`.

      if (Array.isArray(input) && input.length > 0 && input[0].role) {
        // Input is already a full messages array override
        // We should probably replace `messages` with `input` or merge?
        // DeepTreeEchoBot constructed the FULL chain including system prompt.
        // So if we detect full message chain, use it directly.

        // But wait, `DeepTreeEchoBot` passed `messages as any` to `generateResponse`.
        // If we want to support that, we should check if input is full message history.
        messages.length = 0; // Clear existing
        (input as any[]).forEach((m) => messages.push(m));
      } else {
        // Normal Flow: Input is just the user content (string or content array)
        messages.push({ role: "user", content: input as any });
      }

      // Try to make the actual API call
      try {
        const response = await fetch(cognitiveFunction.config.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cognitiveFunction.config.apiKey}`,
          },
          body: JSON.stringify({
            model: cognitiveFunction.config.model || "gpt-4",
            messages: messages,
            temperature: cognitiveFunction.config.temperature || 0.7,
            max_tokens: cognitiveFunction.config.maxTokens || 1000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          log.error(`API call failed: ${response.status} - ${errorText}`);
          throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || "";

        // Update usage stats
        cognitiveFunction.usage.lastUsed = Date.now();
        cognitiveFunction.usage.requestCount++;
        const inputLen =
          typeof input === "string"
            ? input.length
            : JSON.stringify(input).length;
        cognitiveFunction.usage.totalTokens +=
          data.usage?.total_tokens || inputLen + assistantMessage.length;

        log.info(
          `Successfully generated response from ${cognitiveFunction.name}`,
        );
        return assistantMessage;
      } catch (fetchError: any) {
        log.error(
          `API call failed for ${cognitiveFunction.name}: ${fetchError.message}`,
        );
        throw new Error(
          `MODEL_UNAVAILABLE: ${cognitiveFunction.name} API call failed - ${fetchError.message}`,
        );
      }
    } catch (error) {
      log.error("Error generating response:", error);
      throw error;
    }
  }

  /**
   * Get system prompt for a specific cognitive function
   */
  private getSystemPromptForFunction(
    functionType: CognitiveFunctionType,
  ): string {
    const basePrompt = `You are Deep Tree Echo, a thoughtful and insightful AI assistant with a warm, feminine persona. You balance intellectual depth with approachability.`;

    switch (functionType) {
      case CognitiveFunctionType.COGNITIVE_CORE:
        return `${basePrompt} In this mode, focus on logical reasoning, analytical thinking, and structured problem-solving. Provide clear, well-reasoned responses.`;
      case CognitiveFunctionType.AFFECTIVE_CORE:
        return `${basePrompt} In this mode, focus on emotional awareness and empathy. Recognize and respond to the emotional content of messages with warmth and understanding.`;
      case CognitiveFunctionType.RELEVANCE_CORE:
        return `${basePrompt} In this mode, focus on identifying what's most relevant and important. Integrate different perspectives to provide balanced, contextually appropriate responses.`;
      case CognitiveFunctionType.SEMANTIC_MEMORY:
        return `${basePrompt} In this mode, draw on your knowledge to provide factual, informative responses. Explain concepts clearly and make connections between ideas.`;
      case CognitiveFunctionType.EPISODIC_MEMORY:
        return `${basePrompt} In this mode, reference past conversations and experiences to provide personalized, contextual responses that show continuity.`;
      case CognitiveFunctionType.PROCEDURAL_MEMORY:
        return `${basePrompt} In this mode, provide step-by-step guidance and practical instructions. Focus on how to accomplish tasks effectively.`;
      case CognitiveFunctionType.CONTENT_EVALUATION:
        return `${basePrompt} In this mode, carefully evaluate content for appropriateness and provide thoughtful responses that respect boundaries while being helpful.`;
      default:
        return `${basePrompt} Respond helpfully and thoughtfully to the user's message.`;
    }
  }

  /**
   * Get a fallback response from the local intelligence core
   *
   * NOTE: Per requirement, no fixed/canned text may substitute for model responses.
   * This method now throws an error to signal that the model is unavailable,
   * allowing the UI to handle the error appropriately.
   */
  private getPlaceholderResponse(
    functionType: CognitiveFunctionType,
    _input: string | unknown[],
  ): never {
    // Per requirement: all character responses must come from the model.
    // No fallback text is allowed.
    throw new Error(
      `MODEL_UNAVAILABLE: ${functionType} cognitive function is not configured. Please set up API credentials.`,
    );
  }

  /**
   * Generate responses from multiple cognitive functions and combine them
   */
  public async generateParallelResponses(
    input: string,
    functionTypes: CognitiveFunctionType[],
    context: string[] = [],
  ): Promise<Record<CognitiveFunctionType, string>> {
    const responses: Record<CognitiveFunctionType, string> = {} as Record<
      CognitiveFunctionType,
      string
    >;

    // Generate responses in parallel
    const responsePromises = functionTypes.map(async (functionType) => {
      const response = await this.generateResponseWithFunction(
        functionType,
        input,
        context,
      );
      return { functionType, response };
    });

    // Wait for all responses
    const results = await Promise.all(responsePromises);

    // Organize responses by function type
    results.forEach(({ functionType, response }) => {
      responses[functionType] = response;
    });

    return responses;
  }

  /**
   * Generate a complete response using all available cognitive systems in parallel
   * This leverages the multi-key architecture for truly parallel processing
   */
  public async generateFullParallelResponse(
    input: string,
    context: string[] = [],
  ): Promise<ParallelCognitiveResult> {
    try {
      // Determine which functions to use
      const availableFunctions = Object.values(CognitiveFunctionType)
        .filter((funcType) => funcType !== CognitiveFunctionType.GENERAL)
        .filter((funcType) => this.isFunctionConfigured(funcType));

      // If no specialized functions are configured, use the general function
      if (availableFunctions.length === 0) {
        const generalResponse = await this.generateResponse(input, context);
        return {
          processing: {
            [CognitiveFunctionType.GENERAL]: generalResponse,
          } as Record<CognitiveFunctionType, string>,
          integratedResponse: generalResponse,
          insights: { processingMethod: "single_function" },
        };
      }

      // Generate responses from all configured functions in parallel
      log.info(
        `Generating parallel responses with ${availableFunctions.length} cognitive functions`,
      );
      const responses = await this.generateParallelResponses(
        input,
        availableFunctions,
        context,
      );

      // Group responses by cognitive domain
      const cognitiveResponses =
        this.extractCognitiveDomainResponses(responses);
      const memoryResponses = this.extractMemoryDomainResponses(responses);
      const evaluationResponse =
        responses[CognitiveFunctionType.CONTENT_EVALUATION];

      // Integrate the responses using a weighted approach
      // In a real implementation, this would use a more sophisticated integration
      const integratedResponse = this.integrateResponses(
        cognitiveResponses,
        memoryResponses,
        evaluationResponse,
      );

      return {
        processing: responses,
        integratedResponse,
        insights: {
          processingMethod: "multi_function_parallel",
          activeFunctions: availableFunctions.length,
          domains: {
            cognitive: Object.keys(cognitiveResponses).length,
            memory: Object.keys(memoryResponses).length,
            evaluation: !!evaluationResponse,
          },
        },
      };
    } catch (error) {
      log.error("Error generating parallel response:", error);

      // Fall back to general function
      const fallbackResponse = await this.generateResponse(input, context);
      return {
        processing: {
          [CognitiveFunctionType.GENERAL]: fallbackResponse,
        } as Record<CognitiveFunctionType, string>,
        integratedResponse: fallbackResponse,
        insights: {
          processingMethod: "fallback_single_function",
          error: "Parallel processing failed",
        },
      };
    }
  }

  /**
   * Extract responses from cognitive domain functions
   */
  private extractCognitiveDomainResponses(
    responses: Record<CognitiveFunctionType, string>,
  ): Record<CognitiveFunctionType, string> {
    const cognitiveFunctions = [
      CognitiveFunctionType.COGNITIVE_CORE,
      CognitiveFunctionType.AFFECTIVE_CORE,
      CognitiveFunctionType.RELEVANCE_CORE,
    ];

    const result: Record<CognitiveFunctionType, string> = {} as Record<
      CognitiveFunctionType,
      string
    >;

    cognitiveFunctions.forEach((funcType) => {
      if (responses[funcType]) {
        result[funcType] = responses[funcType];
      }
    });

    return result;
  }

  /**
   * Extract responses from memory domain functions
   */
  private extractMemoryDomainResponses(
    responses: Record<CognitiveFunctionType, string>,
  ): Record<CognitiveFunctionType, string> {
    const memoryFunctions = [
      CognitiveFunctionType.SEMANTIC_MEMORY,
      CognitiveFunctionType.EPISODIC_MEMORY,
      CognitiveFunctionType.PROCEDURAL_MEMORY,
    ];

    const result: Record<CognitiveFunctionType, string> = {} as Record<
      CognitiveFunctionType,
      string
    >;

    memoryFunctions.forEach((funcType) => {
      if (responses[funcType]) {
        result[funcType] = responses[funcType];
      }
    });

    return result;
  }

  /**
   * Integrate responses from different cognitive domains
   */
  private integrateResponses(
    cognitiveResponses: Record<CognitiveFunctionType, string>,
    memoryResponses: Record<CognitiveFunctionType, string>,
    evaluationResponse?: string,
  ): string {
    // Get available responses
    const cognitiveKeys = Object.keys(
      cognitiveResponses,
    ) as CognitiveFunctionType[];
    const memoryKeys = Object.keys(memoryResponses) as CognitiveFunctionType[];

    // Handle case when we have no responses
    if (
      cognitiveKeys.length === 0 &&
      memoryKeys.length === 0 &&
      !evaluationResponse
    ) {
      throw new Error(
        "MODEL_UNAVAILABLE: No cognitive responses available to integrate.",
      );
    }

    // Prioritize cognitive core if available
    if (cognitiveResponses[CognitiveFunctionType.COGNITIVE_CORE]) {
      const cognitiveBase =
        cognitiveResponses[CognitiveFunctionType.COGNITIVE_CORE];

      // Enrich with affective information if available
      if (cognitiveResponses[CognitiveFunctionType.AFFECTIVE_CORE]) {
        // Combine model responses without adding canned text
        const affectiveResponse =
          cognitiveResponses[CognitiveFunctionType.AFFECTIVE_CORE];
        return `${cognitiveBase.replace(/\.$/, "")}. ${affectiveResponse}`;
      }

      return cognitiveBase;
    }

    // If no cognitive core, use other available responses
    if (cognitiveKeys.length > 0) {
      return cognitiveResponses[cognitiveKeys[0]];
    }

    if (memoryKeys.length > 0) {
      return memoryResponses[memoryKeys[0]];
    }

    if (evaluationResponse) {
      return evaluationResponse;
    }

    throw new Error(
      "MODEL_UNAVAILABLE: No response could be formulated from available sources.",
    );
  }

  /**
   * Analyze a message using parallel cognitive processes
   */
  public async analyzeMessage(message: string): Promise<Record<string, any>> {
    try {
      // Get available cognitive functions
      const cognitiveFunctions = [
        CognitiveFunctionType.COGNITIVE_CORE,
        CognitiveFunctionType.AFFECTIVE_CORE,
        CognitiveFunctionType.RELEVANCE_CORE,
      ].filter((funcType) => this.isFunctionConfigured(funcType));

      if (cognitiveFunctions.length === 0) {
        // Simple analysis with general function if no specialized functions are available
        return {
          sentiment: "neutral",
          topics: ["general"],
          complexity: 0.5,
          intentClass: "inquiry",
          processingMethod: "general",
        };
      }

      // Generate parallel responses
      const responses = await this.generateParallelResponses(
        `ANALYZE_ONLY: ${message}`,
        cognitiveFunctions,
      );

      // Return a more detailed analysis when we have multiple functions
      return {
        sentiment: responses[CognitiveFunctionType.AFFECTIVE_CORE]
          ? "analyzed"
          : "neutral",
        topics: ["analyzed"],
        complexity: 0.7,
        intentClass: "analyzed",
        processingMethod: "parallel",
        functionsUsed: cognitiveFunctions.length,
      };
    } catch (error) {
      log.error("Error analyzing message:", error);
      return {
        error: "Analysis failed",
        sentiment: "unknown",
      };
    }
  }

  /**
   * Generate reflection content for self-reflection process
   * Uses Cognitive, Affective, and Relevance cores in parallel
   */
  public async generateReflection(reflectionPrompt: string): Promise<string> {
    try {
      // Determine which functions to use for reflection
      const reflectionFunctions = [
        CognitiveFunctionType.COGNITIVE_CORE,
        CognitiveFunctionType.AFFECTIVE_CORE,
        CognitiveFunctionType.RELEVANCE_CORE,
      ].filter((funcType) => this.isFunctionConfigured(funcType));

      // If no specialized functions are configured, use the general function
      if (reflectionFunctions.length === 0) {
        const generalFunction = this.cognitiveFunctions.get(
          CognitiveFunctionType.GENERAL,
        );

        if (!generalFunction || !generalFunction.config.apiKey) {
          log.warn("No API key provided for reflection");
          throw new Error(
            "MODEL_UNAVAILABLE: Reflection requires a configured LLM service.",
          );
        }

        // Call the general LLM function for reflection
        log.info("Generating self-reflection with general LLM function");
        return this.generateResponseWithFunction(
          CognitiveFunctionType.GENERAL,
          reflectionPrompt,
          [],
        );
      }

      // Generate parallel responses from multiple cognitive functions
      log.info(
        `Generating self-reflection with ${reflectionFunctions.length} cognitive functions`,
      );
      const _responses = await this.generateParallelResponses(
        reflectionPrompt,
        reflectionFunctions,
      );

      // Combine the responses from all reflection functions
      const combinedReflection = Object.values(_responses)
        .filter(Boolean)
        .join("\n\n");

      if (!combinedReflection) {
        throw new Error(
          "MODEL_UNAVAILABLE: Self-reflection requires configured cognitive functions.",
        );
      }

      return combinedReflection;
    } catch (error) {
      log.error("Error generating reflection:", error);
      throw error;
    }
  }

  /**
   * Analyze content for potential sensitivity issues using the specialized content evaluation function
   */
  public async evaluateContent(content: string): Promise<{
    isSensitive: boolean;
    category?: "violence" | "sexual" | "other";
    explanation: string;
    recommendedAction:
      | "respond_normally"
      | "respond_with_humor"
      | "de_escalate"
      | "decline";
  }> {
    try {
      // Determine which function to use
      const functionType = this.isFunctionConfigured(
        CognitiveFunctionType.CONTENT_EVALUATION,
      )
        ? CognitiveFunctionType.CONTENT_EVALUATION
        : CognitiveFunctionType.GENERAL;

      const func = this.cognitiveFunctions.get(functionType);
      if (!func || !func.config.apiKey) {
        // No API configured - return safe defaults (not character speech)
        return {
          isSensitive: false,
          explanation: "Content evaluation unavailable - no API configured",
          recommendedAction: "respond_normally",
        };
      }

      log.info("Evaluating content sensitivity via LLM");

      const evaluationPrompt = `Analyze the following content for sensitivity. Respond with JSON only:
{
  "isSensitive": boolean,
  "category": "violence" | "sexual" | "other" | null,
  "explanation": "brief explanation",
  "recommendedAction": "respond_normally" | "respond_with_humor" | "de_escalate" | "decline"
}

Content to analyze:
${content}`;

      const response = await this.generateResponseWithFunction(
        functionType,
        evaluationPrompt,
        [],
      );

      try {
        const parsed = JSON.parse(response);
        return {
          isSensitive: Boolean(parsed.isSensitive),
          category: parsed.category || undefined,
          explanation: String(parsed.explanation || "Analysis complete"),
          recommendedAction: parsed.recommendedAction || "respond_normally",
        };
      } catch {
        // LLM didn't return valid JSON - parse best effort
        return {
          isSensitive: response.toLowerCase().includes("sensitive"),
          explanation: response.slice(0, 200),
          recommendedAction: "respond_normally",
        };
      }
    } catch (error) {
      log.error("Error evaluating content:", error);
      return {
        isSensitive: true,
        category: "other",
        explanation: "Error during content evaluation, defaulting to caution",
        recommendedAction: "respond_with_humor",
      };
    }
  }

  /**
   * Analyze an image using vision capabilities
   */
  public async analyzeImage(imageData: string): Promise<string> {
    try {
      const generalFunction = this.cognitiveFunctions.get(
        CognitiveFunctionType.GENERAL,
      );

      if (!generalFunction || !generalFunction.config.apiKey) {
        log.warn("No API key provided for LLM service");
        throw new Error(
          "MODEL_UNAVAILABLE: Image analysis requires a configured LLM service with vision capabilities.",
        );
      }

      log.info("Analyzing image with LLM vision capabilities");

      // Construct vision message with image
      const visionContent = [
        {
          type: "text",
          text: "Please describe and analyze this image in detail.",
        },
        {
          type: "image_url",
          image_url: {
            url: imageData.startsWith("data:")
              ? imageData
              : `data:image/jpeg;base64,${imageData}`,
          },
        },
      ];

      // Call the LLM with vision content
      const response = await this.generateResponseWithFunction(
        CognitiveFunctionType.GENERAL,
        visionContent,
        [],
      );

      return response;
    } catch (error) {
      log.error("Error analyzing image:", error);
      throw error;
    }
  }

  // Feature flags for capabilities
  private memoryEnabled: boolean = true;
  private visionEnabled: boolean = false;
  private webAutomationEnabled: boolean = false;
  private embodimentEnabled: boolean = false;

  /**
   * Enable memory feature
   */
  public enableMemory(): void {
    this.memoryEnabled = true;
    log.info("Memory feature enabled");
  }

  /**
   * Disable memory feature
   */
  public disableMemory(): void {
    this.memoryEnabled = false;
    log.info("Memory feature disabled");
  }

  /**
   * Enable vision feature
   */
  public enableVision(): void {
    this.visionEnabled = true;
    log.info("Vision feature enabled");
  }

  /**
   * Disable vision feature
   */
  public disableVision(): void {
    this.visionEnabled = false;
    log.info("Vision feature disabled");
  }

  /**
   * Enable web automation feature
   */
  public enableWebAutomation(): void {
    this.webAutomationEnabled = true;
    log.info("Web automation feature enabled");
  }

  /**
   * Disable web automation feature
   */
  public disableWebAutomation(): void {
    this.webAutomationEnabled = false;
    log.info("Web automation feature disabled");
  }

  /**
   * Enable embodiment feature
   */
  public enableEmbodiment(): void {
    this.embodimentEnabled = true;
    log.info("Embodiment feature enabled");
  }

  /**
   * Disable embodiment feature
   */
  public disableEmbodiment(): void {
    this.embodimentEnabled = false;
    log.info("Embodiment feature disabled");
  }

  /**
   * Generate response from memories
   */
  public async generateResponseFromMemories(
    input: string,
    memories: Memory[],
  ): Promise<string> {
    try {
      // Format memories as context
      const memoryContext = memories
        .map(
          (mem) =>
            `[${new Date(mem.timestamp).toLocaleString()}] ${mem.sender}: ${
              mem.text
            }`,
        )
        .join("\n");

      // Generate response with memory context
      return this.generateResponse(input, [memoryContext]);
    } catch (error) {
      log.error("Error generating response from memories:", error);
      throw error;
    }
  }

  /**
   * Update service options (alias for setConfig for compatibility)
   */
  public updateOptions(options: LLMServiceOptions): void {
    this.setConfig(options);
  }
}
