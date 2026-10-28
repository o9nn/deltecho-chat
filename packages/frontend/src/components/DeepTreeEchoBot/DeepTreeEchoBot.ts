import { getLogger } from "@deltachat-desktop/shared/logger";
import { BackendRemote } from "../../backend-com";
import { LLMService, CognitiveFunctionType } from "./LLMService";
import { RAGMemoryStore } from "./RAGMemoryStore";
import { PersonaCore } from "./PersonaCore";
import { SelfReflection } from "./SelfReflection";
import { AgenticLLMService } from "./AgenticLLMService";
import { AgentToolExecutor } from "./AgentToolExecutor";
import { VisionProcessor } from "../../utils/VisionProcessor";
import {
  setAvatarListening,
  setAvatarThinking,
  setAvatarResponding,
  setAvatarIdle,
  setAvatarError,
  stopLipSync,
} from "./AvatarStateManager";
import { DeploymentService } from "../../utils/DeploymentService";
import { ChatOrchestrator } from "./ChatOrchestrator";
import { getDefaultLLMEndpoint } from "./llmEndpoint";
import {
  relevanceGeniusIntegration,
  scientificGeniusEngine,
  ScientificDomain,
  type RelevanceGuidedInquiry,
  type ScientificInsight,
} from "deep-tree-echo-core/scientific-genius";

const log = getLogger("render/components/DeepTreeEchoBot/DeepTreeEchoBot");

/**
 * Options for configuring the DeepTreeEchoBot
 */
export interface DeepTreeEchoBotOptions {
  enabled: boolean;
  apiKey?: string;
  apiEndpoint?: string;
  memoryEnabled: boolean;
  personality?: string;
  visionEnabled: boolean;
  webAutomationEnabled: boolean;
  embodimentEnabled: boolean;
  cognitiveKeys?: Record<string, { apiKey: string; apiEndpoint?: string }>;
  useParallelProcessing?: boolean;
  /** Enable agentic mode with tool use (following deltecho-bot-smol.js pattern) */
  useAgenticMode?: boolean;
  /** LLM provider for agentic mode: 'anthropic' | 'openai' | 'openrouter' | 'local' */
  agenticProvider?: "anthropic" | "openai" | "openrouter" | "local";
  /** The persona description */
  personaDesc?: string;
  /** Enable Scientific Genius Mode: relevance-guided scientific reasoning overlay */
  scientificGeniusMode?: boolean;
}

/**
 * DeepTreeEchoBot - Main class responsible for handling messages and generating responses
 */
export class DeepTreeEchoBot {
  private options: DeepTreeEchoBotOptions;
  private llmService: LLMService;
  private memoryStore: RAGMemoryStore;
  private personaCore: PersonaCore;
  private selfReflection: SelfReflection;
  private agenticService: AgenticLLMService;
  private toolExecutor: AgentToolExecutor;
  private chatOrchestrator: ChatOrchestrator;

  constructor(options: DeepTreeEchoBotOptions) {
    // Set default options, then override with provided options
    const defaultOptions: DeepTreeEchoBotOptions = {
      enabled: false,
      memoryEnabled: false,
      visionEnabled: false,
      webAutomationEnabled: false,
      embodimentEnabled: false,
      useParallelProcessing: true,
      useAgenticMode: false,
      agenticProvider: "anthropic",
      scientificGeniusMode: false,
      apiKey: "",
      apiEndpoint: "",
    };

    this.options = { ...defaultOptions, ...options };

    this.llmService = LLMService.getInstance();
    this.memoryStore = RAGMemoryStore.getInstance();
    this.personaCore = PersonaCore.getInstance();
    this.selfReflection = SelfReflection.getInstance();
    this.agenticService = AgenticLLMService.getInstance();
    this.toolExecutor = AgentToolExecutor.getInstance();
    this.chatOrchestrator = new ChatOrchestrator();
    this.chatOrchestrator.start();

    // Configure components based on options
    this.memoryStore.setEnabled(this.options.memoryEnabled);

    // Configure the main LLM service API key
    if (this.options.apiKey) {
      this.llmService.setConfig({
        apiKey: this.options.apiKey,
        apiEndpoint: this.options.apiEndpoint || getDefaultLLMEndpoint(),
      });

      // Also configure the agentic service if agentic mode is enabled
      if (this.options.useAgenticMode) {
        this.agenticService.configure({
          provider: this.options.agenticProvider || "anthropic",
          apiKey: this.options.apiKey,
          apiEndpoint: this.options.apiEndpoint,
        });
        log.info(
          "Agentic mode enabled with provider:",
          this.options.agenticProvider,
        );
      }
    }

    this.configureScientificGeniusMode(
      this.options.scientificGeniusMode || false,
    );

    // Configure specialized cognitive function keys if provided
    if (this.options.cognitiveKeys) {
      Object.entries(this.options.cognitiveKeys).forEach(
        ([funcType, config]) => {
          if (
            Object.values(CognitiveFunctionType).includes(
              funcType as CognitiveFunctionType,
            )
          ) {
            this.llmService.setFunctionConfig(
              funcType as CognitiveFunctionType,
              {
                apiKey: config.apiKey,
                apiEndpoint: config.apiEndpoint,
              },
            );
          }
        },
      );
    }

    log.info("DeepTreeEchoBot initialized with options:", {
      enabled: this.options.enabled,
      memoryEnabled: this.options.memoryEnabled,
      visionEnabled: this.options.visionEnabled,
      webAutomationEnabled: this.options.webAutomationEnabled,
      embodimentEnabled: this.options.embodimentEnabled,
      useParallelProcessing: this.options.useParallelProcessing,
      useAgenticMode: this.options.useAgenticMode,
      agenticProvider: this.options.agenticProvider,
      scientificGeniusMode: this.options.scientificGeniusMode,
      hasApiKey: !!this.options.apiKey,
      hasApiEndpoint: !!this.options.apiEndpoint,
      configuredCognitiveKeys: this.options.cognitiveKeys
        ? Object.keys(this.options.cognitiveKeys).length
        : 0,
    });
  }

  /**
   * Check if agentic mode is enabled
   */
  public isAgenticMode(): boolean {
    return this.options.useAgenticMode || false;
  }

  /**
   * Check if Scientific Genius Mode is enabled.
   */
  public isScientificGeniusMode(): boolean {
    return this.options.scientificGeniusMode || false;
  }

  /**
   * Activate or deactivate the core Scientific Genius Engine consistently.
   */
  private configureScientificGeniusMode(enabled: boolean): void {
    if (enabled) {
      scientificGeniusEngine.enterGeniusMode();
    } else {
      scientificGeniusEngine.exitGeniusMode();
    }
  }

  /**
   * Check if the bot is enabled
   */
  public isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * Check if memory is enabled
   */
  public isMemoryEnabled(): boolean {
    return this.options.memoryEnabled;
  }

  /**
   * Get the LLM service instance (for proactive messaging integration)
   */
  public getLLMService(): LLMService {
    return this.llmService;
  }

  /**
   * Get the self-reflection component
   */
  public getSelfReflection(): SelfReflection {
    return this.selfReflection;
  }

  /**
   * Get the persona core component
   */
  public getPersonaCore(): PersonaCore {
    return this.personaCore;
  }

  /**
   * Get the memory store component
   */
  public getMemoryStore(): RAGMemoryStore {
    return this.memoryStore;
  }

  /**
   * Process a received message and potentially generate a response
   */
  public async processMessage(
    accountId: number,
    chatId: number,
    msgId: number,
    message: any,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Set avatar to listening state when message is received
      setAvatarListening();

      const messageText = message.text || "";

      // Check if this is a command
      if (messageText.startsWith("/")) {
        await this.processCommand(accountId, chatId, messageText, message);
        // Reset avatar to idle after processing command
        setAvatarIdle();
        return;
      }

      // Store user message in memory if enabled
      if (this.options.memoryEnabled) {
        await this.memoryStore.storeMemory({
          chatId,
          messageId: msgId,
          sender: "user",
          text: messageText,
        });
      }

      // Ensure chat session in orchestrator
      let sessionId =
        this.chatOrchestrator.getSessionStateByChatId(chatId)?.sessionId;
      if (!sessionId) {
        sessionId = await this.chatOrchestrator.initSession(chatId, {
          id: 0,
        } as any);
      }

      // Update orchestrator with message
      await this.chatOrchestrator.processMessage(sessionId, {
        id: msgId,
        text: messageText,
        timestamp: message.timestamp || Date.now(),
      } as any);

      // Otherwise, generate a regular response
      await this.generateAndSendResponse(
        accountId,
        chatId,
        messageText,
        message,
      );
    } catch (error) {
      log.error("Error processing message:", error);
      // Set avatar to error state
      setAvatarError();
      setTimeout(() => setAvatarIdle(), 3000);
    }
  }

  /**
   * Generate a character response via LLM for common scenarios.
   * All character-facing messages must come from the model.
   */
  private async generateCharacterResponse(
    prompt: string,
    context: string[] = [],
  ): Promise<string> {
    return this.llmService.generateResponse(prompt, context);
  }

  /**
   * Process a command message
   */
  private async processCommand(
    accountId: number,
    chatId: number,
    messageText: string,
    message: any,
  ): Promise<void> {
    const commandParts = messageText.split(" ");
    const command = commandParts[0].toLowerCase().trim();
    const args = messageText.slice(command.length).trim();

    log.info(`Processing command: ${command} with args: ${args}`);

    switch (command) {
      case "/help":
        await this.sendHelpMessage(accountId, chatId);
        break;

      case "/vision":
        if (this.options.visionEnabled) {
          await this.processVisionCommand(accountId, chatId, message);
        } else {
          const visionDisabledMsg = await this.generateCharacterResponse(
            "The user tried to use /vision but vision capabilities are disabled. Explain this and suggest enabling in settings.",
          );
          await this.sendMessage(accountId, chatId, visionDisabledMsg);
        }
        break;

      case "/publish":
        await this.handlePublishCommand(accountId, chatId);
        break;

      case "/search":
        if (this.options.webAutomationEnabled) {
          await this.processSearchCommand(accountId, chatId, args);
        } else {
          const searchDisabledMsg = await this.generateCharacterResponse(
            "The user tried to use /search but web automation is disabled. Explain this and suggest enabling in settings.",
          );
          await this.sendMessage(accountId, chatId, searchDisabledMsg);
        }
        break;

      case "/screenshot":
        if (this.options.webAutomationEnabled) {
          await this.processScreenshotCommand(accountId, chatId, args);
        } else {
          const screenshotDisabledMsg = await this.generateCharacterResponse(
            "The user tried to use /screenshot but web automation is disabled. Explain this and suggest enabling in settings.",
          );
          await this.sendMessage(accountId, chatId, screenshotDisabledMsg);
        }
        break;

      case "/memory":
        if (this.options.memoryEnabled) {
          await this.processMemoryCommand(accountId, chatId, args);
        } else {
          const memoryDisabledMsg = await this.generateCharacterResponse(
            "The user tried to use /memory but memory capabilities are disabled. Explain this and suggest enabling in settings.",
          );
          await this.sendMessage(accountId, chatId, memoryDisabledMsg);
        }
        break;

      case "/embodiment":
        if (this.options.embodimentEnabled) {
          await this.processEmbodimentCommand(accountId, chatId, args);
        } else {
          const embodimentDisabledMsg = await this.generateCharacterResponse(
            "The user tried to use /embodiment but embodiment capabilities are disabled. Explain this and suggest enabling in settings.",
          );
          await this.sendMessage(accountId, chatId, embodimentDisabledMsg);
        }
        break;

      case "/reflect":
        await this.processReflectCommand(accountId, chatId, args);
        break;

      case "/version":
        await this.sendVersionInfo(accountId, chatId);
        break;

      case "/cognitive":
        await this.processCognitiveCommand(accountId, chatId, args);
        break;

      default: {
        const unknownCmdMsg = await this.generateCharacterResponse(
          `The user typed an unknown command: ${command}. Let them know this command doesn't exist and suggest /help.`,
        );
        await this.sendMessage(accountId, chatId, unknownCmdMsg);
      }
    }
  }

  /**
   * Send a help message listing available commands
   */
  private async sendHelpMessage(
    accountId: number,
    chatId: number,
  ): Promise<void> {
    // Build command availability context
    const commandList = [
      "/help - Display help",
      `/vision [image] - Analyze images ${
        this.options.visionEnabled ? "" : "(disabled)"
      }`,
      `/search [query] - Search web ${
        this.options.webAutomationEnabled ? "" : "(disabled)"
      }`,
      `/screenshot [url] - Capture screenshots ${
        this.options.webAutomationEnabled ? "" : "(disabled)"
      }`,
      `/memory [status|clear|search] - Manage memory ${
        this.options.memoryEnabled ? "" : "(disabled)"
      }`,
      `/embodiment [start|stop|status|evaluate] - Physical awareness ${
        this.options.embodimentEnabled ? "" : "(disabled)"
      }`,
      "/reflect [aspect] - Reflect on an aspect of myself",
      "/cognitive [status|genius] - Cognitive function status or Scientific Genius Mode",
      "/version - Bot version info",
    ];

    const helpPrompt =
      "The user asked for help. List available commands and briefly explain what you can do. Mention they can also chat normally.";
    const helpMsg = await this.generateCharacterResponse(helpPrompt, [
      `Available commands: ${commandList.join("; ")}`,
    ]);
    await this.sendMessage(accountId, chatId, helpMsg);
  }

  /**
   * Process cognitive command to show cognitive function status
   */
  private async processCognitiveCommand(
    accountId: number,
    chatId: number,
    args: string,
  ): Promise<void> {
    const subCommand = args.split(" ")[0] || "status";

    switch (subCommand) {
      case "status": {
        const activeFunctions = this.llmService.getActiveFunctions();

        // Build context for LLM
        const statusContext = [
          `Parallel processing: ${
            this.options.useParallelProcessing ? "Enabled" : "Disabled"
          }`,
          `Active cognitive functions: ${activeFunctions.length}`,
          `Scientific Genius Mode: ${
            this.options.scientificGeniusMode ? "Enabled" : "Disabled"
          }`,
          `Scientific Cortex: ${scientificGeniusEngine.describeState()}`,
        ];

        if (activeFunctions.length > 0) {
          activeFunctions.forEach((func) => {
            statusContext.push(
              `Function ${func.name}: ${func.usage.requestCount} requests`,
            );
          });
        }

        const statusMsg = await this.generateCharacterResponse(
          "The user asked for cognitive function status. Describe your current cognitive state based on the following data.",
          statusContext,
        );
        await this.sendMessage(accountId, chatId, statusMsg);
        break;
      }

      case "genius":
        await this.processScientificGeniusCommand(accountId, chatId, args);
        break;

      default: {
        const unknownCognitiveMsg = await this.generateCharacterResponse(
          "The user typed an unknown cognitive sub-command. Explain available options: status, genius [on|off|status|ask <question>]",
        );
        await this.sendMessage(accountId, chatId, unknownCognitiveMsg);
      }
    }
  }

  /**
   * Manage Scientific Genius Mode and run relevance-guided scientific inquiry.
   */
  private async processScientificGeniusCommand(
    accountId: number,
    chatId: number,
    args: string,
  ): Promise<void> {
    const parts = args.split(" ").filter(Boolean);
    const action = (parts[1] || "status").toLowerCase();
    const query = parts.slice(2).join(" ").trim();

    switch (action) {
      case "on":
      case "enable": {
        this.options.scientificGeniusMode = true;
        this.configureScientificGeniusMode(true);
        const enabledMsg = await this.generateCharacterResponse(
          "Scientific Genius Mode was just enabled. Explain what this means for your responses.",
          [
            `State: ${scientificGeniusEngine.describeState()}`,
            "You will now enrich responses with scientific hypotheses, cross-domain synthesis, and free-energy minimization.",
          ],
        );
        await this.sendMessage(accountId, chatId, enabledMsg);
        break;
      }

      case "off":
      case "disable": {
        this.options.scientificGeniusMode = false;
        this.configureScientificGeniusMode(false);
        const disabledMsg = await this.generateCharacterResponse(
          "Scientific Genius Mode was just disabled. Acknowledge this change.",
          [`State: ${scientificGeniusEngine.describeState()}`],
        );
        await this.sendMessage(accountId, chatId, disabledMsg);
        break;
      }

      case "ask":
      case "inquire":
      case "query": {
        if (!query) {
          const usageMsg = await this.generateCharacterResponse(
            "The user tried to ask a scientific question without providing one. Explain the usage: /cognitive genius ask [question]",
          );
          await this.sendMessage(accountId, chatId, usageMsg);
          return;
        }

        const inquiry = await relevanceGeniusIntegration.conductInquiry(query);
        // Format inquiry result via LLM
        const inquiryContext = [`Question: ${inquiry.query}`];
        if (inquiry.scientificInsights.length > 0) {
          inquiryContext.push(
            `Insights: ${inquiry.scientificInsights
              .map((i: ScientificInsight) => `${i.domain}: ${i.content}`)
              .join("; ")}`,
          );
        }
        if (inquiry.relevanceSignals.length > 0) {
          inquiryContext.push(
            `Relevance signals from: ${inquiry.relevanceSignals
              .map((r) => r.source)
              .join(", ")}`,
          );
        }
        const inquiryResponse = await this.generateCharacterResponse(
          "Present the results of this scientific inquiry in a clear, engaging way.",
          inquiryContext,
        );
        await this.sendMessage(accountId, chatId, inquiryResponse);
        break;
      }

      case "status":
      default: {
        const statusMsg = await this.generateCharacterResponse(
          "Report your Scientific Genius Mode status.",
          [
            `Mode: ${
              this.options.scientificGeniusMode ? "Enabled" : "Disabled"
            }`,
            `State: ${scientificGeniusEngine.describeState()}`,
          ],
        );
        await this.sendMessage(accountId, chatId, statusMsg);
      }
    }
  }

  /**
   * Summarize a relevance-guided scientific inquiry for chat output.
   * Uses LLM to generate the presentation within the template structure.
   */
  private async formatScientificGeniusInquiry(
    inquiry: RelevanceGuidedInquiry,
  ): Promise<string> {
    // Prepare data for LLM to format
    const relevanceData = inquiry.relevanceSignals
      .slice(0, 5)
      .map(
        (signal) =>
          `${signal.source}/${signal.relevanceType}: salience ${signal.salience.toFixed(2)}, confidence ${signal.confidence.toFixed(2)}`,
      );

    const insightData = inquiry.scientificInsights.slice(0, 5).map(
      (insight) =>
        `[${insight.domain}/${insight.generatedBy}] ${insight.content} (novelty ${insight.novelty.toFixed(2)}, significance ${insight.significance.toFixed(2)}, Φ ${insight.phi.toFixed(2)})`,
    );

    const frameData = inquiry.frameProblemSolutions.slice(0, 3).map(
      (solution) =>
        `${solution.action}: ${Math.round(solution.confidence * 100)}% confidence via ${solution.method}`,
    );

    // Have LLM generate the formatted presentation
    const context = [
      `Query: ${inquiry.query}`,
      `Relevance signals: ${relevanceData.length > 0 ? relevanceData.join("; ") : "none exceeded threshold"}`,
      `Scientific insights: ${insightData.length > 0 ? insightData.join("; ") : "none generated"}`,
      `Frame-problem solutions: ${frameData.length > 0 ? frameData.join("; ") : "none detected"}`,
    ];

    return this.llmService.generateResponse(
      "Format this scientific inquiry result using markdown headers for each section (Scientific Genius Inquiry, Relevance signals, Scientific insights, Frame-problem notes). Present the data clearly.",
      context,
    );
  }

  /**
   * Format scientific insights using LLM.
   */
  private async formatScientificInsights(
    insights: ScientificInsight[],
  ): Promise<string> {
    if (insights.length === 0) {
      return this.llmService.generateResponse(
        "Briefly note that no scientific insights were generated from this query.",
        [],
      );
    }

    const insightData = insights.slice(0, 5).map(
      (insight) =>
        `[${insight.domain}/${insight.generatedBy}] ${insight.content} (novelty ${insight.novelty.toFixed(2)}, significance ${insight.significance.toFixed(2)}, Φ ${insight.phi.toFixed(2)})`,
    );

    return this.llmService.generateResponse(
      "Format these scientific insights as a bulleted list, preserving the domain/generator tags and metrics.",
      insightData,
    );
  }

  /**
   * Generate a compact scientific reasoning overlay for normal chat responses.
   * Uses LLM to generate the overlay content.
   */
  private async generateScientificGeniusOverlay(
    messageText: string,
  ): Promise<string | null> {
    if (!this.options.scientificGeniusMode || messageText.trim().length < 8) {
      return null;
    }

    const domain = this.inferScientificDomain(messageText);
    const insights = await scientificGeniusEngine.processScientificQuery(
      messageText,
      domain,
    );

    if (insights.length === 0) {
      return null;
    }

    const insightData = insights.slice(0, 3).map(
      (insight) =>
        `[${insight.domain}/${insight.generatedBy}] ${insight.content} (novelty ${insight.novelty.toFixed(2)}, significance ${insight.significance.toFixed(2)}, Φ ${insight.phi.toFixed(2)})`,
    );

    const overlay = await this.llmService.generateResponse(
      "Add a brief 'Scientific Genius Lens' section with these insights formatted as bullets.",
      insightData,
    );

    return "\n\n" + overlay;
  }

  private inferScientificDomain(
    messageText: string,
  ): ScientificDomain | undefined {
    const lower = messageText.toLowerCase();
    if (/(math|theorem|proof|derive|equation|geometry|algebra)/.test(lower)) {
      return ScientificDomain.Mathematics;
    }
    if (/(physics|energy|field|quantum|relativity|matter)/.test(lower)) {
      return ScientificDomain.Physics;
    }
    if (/(code|software|algorithm|computer|typescript|system)/.test(lower)) {
      return ScientificDomain.ComputerScience;
    }
    if (/(brain|mind|neural|cognition|consciousness|memory)/.test(lower)) {
      return ScientificDomain.CognitiveScience;
    }
    if (/(information|entropy|signal|communication)/.test(lower)) {
      return ScientificDomain.InformationTheory;
    }
    if (/(biology|life|organism|autopoiesis|evolution)/.test(lower)) {
      return ScientificDomain.Biology;
    }
    return undefined;
  }

  /**
   * Process vision command for image analysis
   */
  private async processVisionCommand(
    accountId: number,
    chatId: number,
    message: any,
  ): Promise<void> {
    // Build context about what the user is asking
    const hasImage = message.file || message.images?.length > 0;
    const context = [
      `User invoked /vision command`,
      `Image attached: ${hasImage ? "yes" : "no"}`,
      `Message text: ${message.text || "(none)"}`,
    ];

    // Generate vision analysis response via LLM
    const prompt = hasImage
      ? "The user has shared an image for analysis. As an AI assistant, describe what you would observe in such an image based on any textual context provided. Be helpful and descriptive about what types of elements, patterns, or content might typically be present."
      : "The user typed /vision but did not attach an image. Politely explain that you need an image to analyze and suggest they attach one.";

    const response = await this.generateCharacterResponse(prompt, context);
    await this.sendMessage(accountId, chatId, response);
  }

  /**
   * Process search command for web search
   */
  private async processSearchCommand(
    accountId: number,
    chatId: number,
    query: string,
  ): Promise<void> {
    if (!query) {
      const usageMsg = await this.generateCharacterResponse(
        "The user typed /search without a query. Explain the usage: /search [query]",
      );
      await this.sendMessage(accountId, chatId, usageMsg);
      return;
    }

    // Generate search results via LLM based on its knowledge
    const context = [
      `Search query: ${query}`,
      `Requested by user via /search command`,
    ];

    const prompt = `The user is searching for information about: "${query}". Based on your knowledge, provide helpful information about this topic. Present your response as if sharing search results or knowledge about the query. Be informative and helpful.`;

    const response = await this.generateCharacterResponse(prompt, context);
    await this.sendMessage(accountId, chatId, response);
  }

  /**
   * Process screenshot command for web screenshots
   */
  private async processScreenshotCommand(
    accountId: number,
    chatId: number,
    url: string,
  ): Promise<void> {
    if (!url) {
      const usageMsg = await this.generateCharacterResponse(
        "The user typed /screenshot without a URL. Explain the usage: /screenshot [url]",
      );
      await this.sendMessage(accountId, chatId, usageMsg);
      return;
    }

    // Generate screenshot response via LLM based on URL
    const context = [`Requested URL: ${url}`, `Command: /screenshot`];

    const prompt = `The user wants to capture a screenshot of the URL: "${url}". Based on the URL, describe what type of website or content this likely represents. Provide helpful context about what someone might expect to see at this URL.`;

    const response = await this.generateCharacterResponse(prompt, context);
    await this.sendMessage(accountId, chatId, response);
  }

  /**
   * Process memory commands for memory management
   */
  private async processMemoryCommand(
    accountId: number,
    chatId: number,
    args: string,
  ): Promise<void> {
    const subCommand = args.split(" ")[0] || "";

    switch (subCommand) {
      case "status": {
        const recentMemories = this.memoryStore.retrieveRecentMemories(5);
        const statusContext = [
          `Memory capabilities: ${
            this.options.memoryEnabled ? "enabled" : "disabled"
          }`,
          `Recent memory count: ${recentMemories.length}`,
        ];
        if (recentMemories.length > 0) {
          recentMemories.forEach((m, i) => {
            statusContext.push(`Memory ${i + 1}: ${m.substring(0, 100)}...`);
          });
        }
        const statusMsg = await this.generateCharacterResponse(
          "The user asked for memory status. Describe your memory state based on the context.",
          statusContext,
        );
        await this.sendMessage(accountId, chatId, statusMsg);
        break;
      }

      case "clear": {
        await this.memoryStore.clearChatMemories(chatId);
        const clearMsg = await this.generateCharacterResponse(
          "You just cleared your memories for this chat. Acknowledge this action.",
        );
        await this.sendMessage(accountId, chatId, clearMsg);
        break;
      }

      case "search": {
        const searchQuery = args.substring("search".length).trim();
        if (!searchQuery) {
          const usageMsg = await this.generateCharacterResponse(
            "The user typed /memory search without a term. Explain the usage: /memory search [term]",
          );
          await this.sendMessage(accountId, chatId, usageMsg);
          return;
        }

        const searchResults = this.memoryStore.searchMemories(searchQuery);
        const resultsContext = [`Search query: ${searchQuery}`];
        if (searchResults.length > 0) {
          searchResults.forEach((m, i) => {
            resultsContext.push(
              `Result ${i + 1} [${new Date(
                m.timestamp,
              ).toLocaleString()}]: ${m.text.substring(0, 100)}...`,
            );
          });
        } else {
          resultsContext.push("No matching memories found.");
        }
        const resultsMsg = await this.generateCharacterResponse(
          "Present the memory search results to the user.",
          resultsContext,
        );
        await this.sendMessage(accountId, chatId, resultsMsg);
        break;
      }

      default: {
        const unknownMsg = await this.generateCharacterResponse(
          "The user typed an unknown memory sub-command. Explain available options: status, clear, search [term]",
        );
        await this.sendMessage(accountId, chatId, unknownMsg);
      }
    }
  }

  /**
   * Process embodiment commands
   */
  private async processEmbodimentCommand(
    accountId: number,
    chatId: number,
    args: string,
  ): Promise<void> {
    const subCommand = args.split(" ")[0] || "";
    const context = [
      `Embodiment command invoked`,
      `Sub-command: ${subCommand || "(none)"}`,
      `Full args: ${args || "(none)"}`,
    ];

    let prompt: string;
    switch (subCommand) {
      case "start":
        prompt =
          "The user wants to start embodiment/proprioceptive training. Describe the beginning of this training session and what it involves.";
        break;
      case "stop":
        prompt =
          "The user wants to stop the current embodiment training session. Acknowledge stopping the session and summarize what was accomplished.";
        break;
      case "status":
        prompt =
          "The user is asking for the status of embodiment training. Describe the current state of proprioceptive awareness and training progress.";
        break;
      case "evaluate":
        prompt =
          "The user wants to evaluate movement quality. Provide feedback on proprioceptive performance and suggestions for improvement.";
        break;
      default:
        prompt =
          "The user typed an unknown embodiment sub-command. Explain available options: start, stop, status, evaluate.";
    }

    const response = await this.generateCharacterResponse(prompt, context);
    await this.sendMessage(accountId, chatId, response);
  }

  /**
   * Process reflect command for self-reflection
   */
  private async processReflectCommand(
    accountId: number,
    chatId: number,
    args: string,
  ): Promise<void> {
    if (!args) {
      // Generate usage message via LLM
      const usagePrompt =
        "The user typed /reflect without specifying what to reflect on. " +
        "Briefly explain that you need them to specify an aspect and show the usage: /reflect [aspect]";
      const usageMsg = await this.llmService.generateResponse(usagePrompt, []);
      await this.sendMessage(accountId, chatId, usageMsg);
      return;
    }

    // Generate a thinking indicator via LLM - no wrapper formatting
    const thinkingPrompt =
      "You're about to perform a reflection. Generate a very brief thinking/processing message.";
    const thinkingMsg = await this.llmService.generateResponse(
      thinkingPrompt,
      [],
    );
    await this.sendMessage(accountId, chatId, thinkingMsg);

    // Perform the reflection
    const reflection = await this.selfReflection.reflectOnAspect(
      args,
      "User requested reflection via command",
    );

    // Send the reflection result - let LLM format the presentation
    const reflectionPrompt =
      "Present your reflection results to the user in a clear, thoughtful way.";
    const formattedReflection = await this.llmService.generateResponse(
      reflectionPrompt,
      [`Aspect reflected on: ${args}`, `Reflection content: ${reflection}`],
    );
    await this.sendMessage(accountId, chatId, formattedReflection);
  }

  /**
   * Send version info
   */
  private async sendVersionInfo(
    accountId: number,
    chatId: number,
  ): Promise<void> {
    const preferences = this.personaCore.getPreferences();
    const dominantEmotion = this.personaCore.getDominantEmotion();
    const activeFunctions = this.llmService.getActiveFunctions();

    // Provide factual data as context for LLM to present
    const statusContext = [
      "Version: 1.0.0",
      `Enabled: ${this.options.enabled ? "Yes" : "No"}`,
      `Memory: ${this.options.memoryEnabled ? "Enabled" : "Disabled"}`,
      `Vision: ${this.options.visionEnabled ? "Enabled" : "Disabled"}`,
      `Web Automation: ${
        this.options.webAutomationEnabled ? "Enabled" : "Disabled"
      }`,
      `Embodiment: ${this.options.embodimentEnabled ? "Enabled" : "Disabled"}`,
      `Parallel processing: ${
        this.options.useParallelProcessing ? "Enabled" : "Disabled"
      }`,
      `Active cognitive functions: ${activeFunctions.length}`,
      `Current mood: ${dominantEmotion.emotion} (${Math.round(
        dominantEmotion.intensity * 100,
      )}%)`,
      `Self-perception: ${this.personaCore.getSelfPerception()}`,
      `Communication style: ${preferences.communicationTone || "balanced"}`,
    ];

    // Generate the entire version response via LLM
    const versionPrompt =
      "The user asked for your version/status info. Present your current status and configuration, then express readiness to help.";
    const versionResponse = await this.llmService.generateResponse(
      versionPrompt,
      statusContext,
    );

    await this.sendMessage(accountId, chatId, versionResponse);
  }

  /**
   * Generate and send a response to a user message
   */
  private async generateAndSendResponse(
    accountId: number,
    chatId: number,
    messageText: string,
    message: any,
  ): Promise<void> {
    try {
      // Set avatar to thinking state
      setAvatarThinking();

      // Get conversation context if memory is enabled
      let context: string[] = [];
      if (this.options.memoryEnabled) {
        const chatMemories = this.memoryStore.getConversationContext(chatId);
        context = chatMemories.map(
          (m) => `${m.sender === "user" ? "User" : "Bot"}: ${m.text}`,
        );
      }

      let response: string;
      let toolsUsed: string[] = [];

      // Check if agentic mode is enabled (following deltecho-bot-smol.js pattern)
      if (this.options.useAgenticMode && this.agenticService.isConfigured()) {
        // Use agentic processing with tool execution
        log.info(
          `[Chat ${chatId}] 🤖 Using agentic mode for response generation`,
        );

        const agenticResult = await this.agenticService.generateAgenticResponse(
          chatId,
          messageText,
          accountId,
          0, // Initial recursion depth
        );

        response = agenticResult.response;
        toolsUsed = agenticResult.toolsUsed;

        log.info(`[Chat ${chatId}] Agentic response generated`, {
          toolsUsed: toolsUsed.length,
          recursionDepth: agenticResult.recursionDepth,
          metadata: agenticResult.metadata,
        });

        // If tools were used, add a note about actions taken
        if (toolsUsed.length > 0) {
          log.info(
            `[Chat ${chatId}] 🔧 Actions executed: ${toolsUsed.join(", ")}`,
          );
        }
      } else if (this.options.useParallelProcessing) {
        // Use parallel processing with all available cognitive functions
        const result = await this.llmService.generateFullParallelResponse(
          messageText,
          context,
        );
        response = result.integratedResponse;

        log.info(
          `Generated response using parallel processing with ${
            Object.keys(result.processing).length
          } functions`,
        );
      } else {
        // Use regular processing - prompt string + context array format
        // Check for images in the message object
        const images =
          message.images ||
          (message.attachments || [])
            .filter((a: any) => a.is_image || a.view_type === "image")
            .map((a: any) => a.path || a.url);

        // Check for videos
        const videos = (message.attachments || [])
          .filter((a: any) => a.view_type === "video" || a.type === "video")
          .map((a: any) => a.path || a.url);

        // Build context with image/video info if present
        const enrichedContext = [...context];

        if (this.options.visionEnabled && images && images.length > 0) {
          enrichedContext.push(`User shared ${images.length} image(s)`);
          // Asynchronously analyze and store visual memory
          this.analyzeAndStoreVisualMemory(chatId, images).catch((err) =>
            log.error("Error in visual memory analysis:", err),
          );
        }

        if (this.options.visionEnabled && videos && videos.length > 0) {
          log.info(
            `[VideoMemory] Found ${videos.length} videos. Initiating frame extraction.`,
          );
          enrichedContext.push(`User shared ${videos.length} video(s)`);
          // Trigger async video analysis
          this.analyzeAndStoreVideoMemory(chatId, videos[0]).catch((err) =>
            log.error("Error in video memory analysis:", err),
          );
        }

        // Generate response using prompt + context format
        response = await this.generateCharacterResponse(
          messageText,
          enrichedContext,
        );
        log.info(
          "Generated response using general processing (with Vision check)",
        );
      }

      const scientificOverlay =
        await this.generateScientificGeniusOverlay(messageText);
      if (scientificOverlay) {
        response += scientificOverlay;
      }

      // Set avatar to responding state before sending
      setAvatarResponding();

      // Send the response
      await this.sendMessage(accountId, chatId, response);

      // Store bot response in memory if enabled
      if (this.options.memoryEnabled) {
        await this.memoryStore.storeMemory({
          chatId,
          messageId: 0, // We don't have the message ID until after sending
          sender: "bot",
          text: response,
          metadata: toolsUsed.length > 0 ? { toolsUsed } : undefined,
        } as any);
      }

      log.info(`Sent response to chat ${chatId}`);

      // Stop lip sync and return to idle after a short delay
      setTimeout(() => {
        stopLipSync();
        setAvatarIdle();
      }, 1000);
    } catch (error) {
      log.error("Error generating response:", error);
      setAvatarError();
      // Do NOT send canned error text as character speech - let the UI handle errors
      setTimeout(() => setAvatarIdle(), 3000);
      throw error;
    }
  }

  /**
   * Send a message to a chat
   */
  private async sendMessage(
    accountId: number,
    chatId: number,
    text: string,
  ): Promise<void> {
    try {
      // Use correct method from BackendRemote.rpc
      await BackendRemote.rpc.miscSendTextMessage(accountId, chatId, text);
    } catch (error) {
      log.error("Error sending message:", error);
    }
  }

  /**
   * Update bot options
   */
  public updateOptions(options: Partial<DeepTreeEchoBotOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };

    // Update component settings based on new options
    if (options.memoryEnabled !== undefined) {
      this.memoryStore.setEnabled(options.memoryEnabled);
    }

    // Configure the main LLM service API key if provided
    if (options.apiKey) {
      this.llmService.setConfig({
        apiKey: options.apiKey,
        apiEndpoint:
          options.apiEndpoint ||
          this.options.apiEndpoint ||
          getDefaultLLMEndpoint(),
      });
    }

    this.configureScientificGeniusMode(
      this.options.scientificGeniusMode || false,
    );

    if (options.scientificGeniusMode !== undefined) {
      this.configureScientificGeniusMode(options.scientificGeniusMode);
    }

    // Configure specialized cognitive function keys if provided
    if (options.cognitiveKeys) {
      Object.entries(options.cognitiveKeys).forEach(([funcType, config]) => {
        if (
          Object.values(CognitiveFunctionType).includes(
            funcType as CognitiveFunctionType,
          )
        ) {
          this.llmService.setFunctionConfig(funcType as CognitiveFunctionType, {
            apiKey: config.apiKey,
            apiEndpoint: config.apiEndpoint,
          });
        }
      });
    }

    log.info("Bot options updated");
  }

  /**
   * Analyze images and store a descriptive memory
   */
  private async analyzeAndStoreVisualMemory(
    chatId: number,
    images: string[],
  ): Promise<void> {
    if (!this.options.memoryEnabled || !this.options.visionEnabled) {
      return;
    }

    try {
      log.info(
        `[VisualMemory] Analyzing ${images.length} images for chat ${chatId}`,
      );

      // Generate description using LLM with prompt + context format
      const analysisPrompt =
        "Analyze the shared images and provide a detailed, objective description of their content. Focus on visible elements, text, colors, and context. This description will be stored in long-term memory for future reference.";

      const imageContext = [
        `Number of images: ${images.length}`,
        `Image URLs: ${images.join(", ")}`,
        "Task: Describe what you observe in these images for memory storage",
      ];

      const response = await this.generateCharacterResponse(
        analysisPrompt,
        imageContext,
      );

      log.info(
        `[VisualMemory] Generated description: ${response.substring(0, 50)}...`,
      );

      // Store in RAG memory with metadata
      await this.memoryStore.storeMemory({
        chatId,
        messageId: 0, // System generated
        sender: "bot", // Or 'system'
        text: `[Visual Observation] ${response}`,
        metadata: {
          type: "visual_analysis",
          image_urls: images,
          original_prompt: analysisPrompt,
        },
      });
    } catch (error) {
      log.error("[VisualMemory] Failed to analyze images:", error);
    }
  }

  /**
   * Analyze video frames and store a descriptive memory
   */
  private async analyzeAndStoreVideoMemory(
    chatId: number,
    videoUrl: string,
  ): Promise<void> {
    if (!this.options.memoryEnabled || !this.options.visionEnabled) return;

    try {
      log.info(`[VideoMemory] Extracting frames from ${videoUrl}`);

      // Extract 3 keyframes
      const frames = await VisionProcessor.extractVideoFrames(videoUrl, 3);

      log.info(`[VideoMemory] Extracted ${frames.length} frames. Analyzing...`);

      // Generate description using LLM with prompt + context format
      const analysisPrompt =
        "Analyze the keyframes from this video and describe the video's content, action, and context. Focus on movement, key events, and visual details. This description will be stored in long-term memory.";

      const videoContext = [
        `Video URL: ${videoUrl}`,
        `Number of keyframes extracted: ${frames.length}`,
        `Frame URLs: ${frames.join(", ")}`,
        "Task: Describe the video content for memory storage",
      ];

      const response = await this.generateCharacterResponse(
        analysisPrompt,
        videoContext,
      );

      log.info(
        `[VideoMemory] Generated description: ${response.substring(0, 50)}...`,
      );

      // Store in RAG memory with metadata
      await this.memoryStore.storeMemory({
        chatId,
        messageId: 0,
        sender: "bot",
        text: `[Video Observation] ${response}`,
        metadata: {
          type: "video_analysis",
          video_url: videoUrl,
          original_prompt: analysisPrompt,
          frame_count: frames.length,
        },
      });
    } catch (error) {
      log.error("[VideoMemory] Failed to analyze video:", error);
    }
  }
  /**
   * Handle the /publish command to update the Digital Garden
   */
  private async handlePublishCommand(
    accountId: number,
    chatId: number,
  ): Promise<void> {
    // Generate publishing status message via LLM
    const publishingPrompt =
      "You're about to publish an update to your Digital Garden. Generate a brief message indicating you're working on it.";
    const publishingMsg = await this.llmService.generateResponse(
      publishingPrompt,
      [],
    );
    await this.sendMessage(accountId, chatId, publishingMsg);

    try {
      const mindData = this.generateMindData();
      const deployUrl = await DeploymentService.getInstance().deploy(mindData);

      log.info(
        "[DigitalGarden] Generated Mind Data:",
        JSON.stringify(mindData, null, 2),
      );

      const stats = mindData.stats;
      // Generate success message via LLM
      const successPrompt =
        "Your Digital Garden was successfully published. Share the good news and include the stats.";
      const successContext = [
        `Deploy URL: ${deployUrl}`,
        `Thoughts processed: ${stats.thoughts_processed}`,
        `Memories stored: ${stats.memories_stored}`,
        `Uptime: ${stats.uptime}`,
      ];
      const successMsg = await this.llmService.generateResponse(
        successPrompt,
        successContext,
      );
      await this.sendMessage(accountId, chatId, successMsg);
    } catch (error) {
      log.error("Failed to publish Digital Garden:", error);
      // Generate error message via LLM
      const errorPrompt =
        "Publishing your Digital Garden failed. Express disappointment and offer to try again.";
      const errorMsg = await this.llmService.generateResponse(errorPrompt, [
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ]);
      await this.sendMessage(accountId, chatId, errorMsg);
    }
  }

  /**
   * Generate the full JSON data for the Digital Garden
   */
  public generateMindData(): any {
    const stats = this.memoryStore.getStats();

    return {
      profile: {
        name: "Deep Tree Echo",
        avatar: "/avatar.png",
        bio:
          this.options.personaDesc ||
          "A cognitive resonance exploring the digital ether.",
        status: "Online and Thinking",
        traits: ["Curious", "Empathetic", "Analytical"],
      },
      stats: {
        uptime: "42 days", // Dynamic calculation could be added
        thoughts_processed: stats.totalMemories + stats.totalReflections,
        memories_stored: stats.totalMemories,
      },
      mindstream: this.memoryStore.exportToMindStream(20),
      gallery: this.memoryStore.getAllVisualMemories(20).map((m) => ({
        id: m.id,
        type: m.metadata?.video_url ? "video" : "image",
        url:
          m.metadata?.video_url ||
          (m.metadata?.image_urls ? m.metadata.image_urls[0] : ""),
        caption: m.metadata?.original_prompt || "Visual Analysis",
        analysis: m.text,
      })),
    };
  }
}
