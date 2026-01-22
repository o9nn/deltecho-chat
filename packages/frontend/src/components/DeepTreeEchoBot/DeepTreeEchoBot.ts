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

    // Configure components based on options
    this.memoryStore.setEnabled(this.options.memoryEnabled);

    // Configure the main LLM service API key
    if (this.options.apiKey) {
      this.llmService.setConfig({
        apiKey: this.options.apiKey,
        apiEndpoint:
          this.options.apiEndpoint ||
          "https://api.openai.com/v1/chat/completions",
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
          await this.sendMessage(
            accountId,
            chatId,
            "Vision capabilities are not enabled. Please enable them in settings.",
          );
        }
        break;

      case "/search":
        if (this.options.webAutomationEnabled) {
          await this.processSearchCommand(accountId, chatId, args);
        } else {
          await this.sendMessage(
            accountId,
            chatId,
            "Web automation is not enabled. Please enable it in settings.",
          );
        }
        break;

      case "/screenshot":
        if (this.options.webAutomationEnabled) {
          await this.processScreenshotCommand(accountId, chatId, args);
        } else {
          await this.sendMessage(
            accountId,
            chatId,
            "Web automation is not enabled. Please enable it in settings.",
          );
        }
        break;

      case "/memory":
        if (this.options.memoryEnabled) {
          await this.processMemoryCommand(accountId, chatId, args);
        } else {
          await this.sendMessage(
            accountId,
            chatId,
            "Memory capabilities are not enabled. Please enable them in settings.",
          );
        }
        break;

      case "/embodiment":
        if (this.options.embodimentEnabled) {
          await this.processEmbodimentCommand(accountId, chatId, args);
        } else {
          await this.sendMessage(
            accountId,
            chatId,
            "Embodiment capabilities are not enabled. Please enable them in settings.",
          );
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

      default:
        await this.sendMessage(
          accountId,
          chatId,
          `Unknown command: ${command}. Type /help for available commands.`,
        );
    }
  }

  /**
   * Send a help message listing available commands
   */
  private async sendHelpMessage(
    accountId: number,
    chatId: number,
  ): Promise<void> {
    const helpMessage = `
**Deep Tree Echo Bot Help**

Available commands:

- **/help** - Display this help message
- **/vision [image]** - Analyze attached images ${
      this.options.visionEnabled ? "" : "(disabled)"
    }
- **/search [query]** - Search the web ${
      this.options.webAutomationEnabled ? "" : "(disabled)"
    }
- **/screenshot [url]** - Capture website screenshots ${
      this.options.webAutomationEnabled ? "" : "(disabled)"
    }
- **/memory [status|clear|search]** - Manage conversation memory ${
      this.options.memoryEnabled ? "" : "(disabled)"
    }
- **/embodiment [start|stop|status|evaluate]** - Physical awareness training ${
      this.options.embodimentEnabled ? "" : "(disabled)"
    }
- **/reflect [aspect]** - Ask me to reflect on an aspect of myself
- **/cognitive [status]** - Show status of my cognitive functions
- **/version** - Display bot version information

You can also just chat with me normally and I'll respond!
    `;

    await this.sendMessage(accountId, chatId, helpMessage);
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

        let statusMessage = `
**Cognitive Function Status**

Parallel processing: ${
          this.options.useParallelProcessing ? "Enabled" : "Disabled"
        }
Active cognitive functions: ${activeFunctions.length}

`;

        if (activeFunctions.length > 0) {
          statusMessage += "**Active Functions:**\n";
          activeFunctions.forEach((func) => {
            statusMessage += `- ${func.name}: ${func.usage.requestCount} requests\n`;
          });
        } else {
          statusMessage +=
            "No specialized cognitive functions are currently active. I am operating with my general processing capability only.";
        }

        await this.sendMessage(accountId, chatId, statusMessage);
        break;
      }

      default:
        await this.sendMessage(
          accountId,
          chatId,
          "Unknown cognitive command. Available options: status",
        );
    }
  }

  /**
   * Process vision command for image analysis
   */
  private async processVisionCommand(
    accountId: number,
    chatId: number,
    _message: any,
  ): Promise<void> {
    // For now, just send a placeholder response
    await this.sendMessage(
      accountId,
      chatId,
      "Vision analysis would process any attached images here.",
    );
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
      await this.sendMessage(
        accountId,
        chatId,
        "Please provide a search query. Usage: /search [query]",
      );
      return;
    }

    // For now, just send a placeholder response
    await this.sendMessage(
      accountId,
      chatId,
      `Searching for: "${query}"... (This is a placeholder for web search functionality)`,
    );
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
      await this.sendMessage(
        accountId,
        chatId,
        "Please provide a URL. Usage: /screenshot [url]",
      );
      return;
    }

    // For now, just send a placeholder response
    await this.sendMessage(
      accountId,
      chatId,
      `Taking screenshot of: "${url}"... (This is a placeholder for screenshot functionality)`,
    );
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
        const statusMessage = `
**Memory Status**

I currently have memory capabilities ${
          this.options.memoryEnabled ? "enabled" : "disabled"
        }.
Recent memories:
${
  recentMemories.length > 0
    ? recentMemories.join("\n")
    : "No recent memories stored."
}
        `;
        await this.sendMessage(accountId, chatId, statusMessage);
        break;
      }

      case "clear":
        await this.memoryStore.clearChatMemories(chatId);
        await this.sendMessage(
          accountId,
          chatId,
          "Memories for this chat have been cleared.",
        );
        break;

      case "search": {
        const searchQuery = args.substring("search".length).trim();
        if (!searchQuery) {
          await this.sendMessage(
            accountId,
            chatId,
            "Please provide a search term. Usage: /memory search [term]",
          );
          return;
        }

        const searchResults = this.memoryStore.searchMemories(searchQuery);
        const resultsMessage = `
**Memory Search Results for "${searchQuery}"**

${
  searchResults.length > 0
    ? searchResults
        .map(
          (m) =>
            `- [${new Date(m.timestamp).toLocaleString()}] ${m.text.substring(
              0,
              100,
            )}${m.text.length > 100 ? "..." : ""}`,
        )
        .join("\n")
    : "No matching memories found."
}
        `;
        await this.sendMessage(accountId, chatId, resultsMessage);
        break;
      }

      default:
        await this.sendMessage(
          accountId,
          chatId,
          "Unknown memory command. Available options: status, clear, search [term]",
        );
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
    // For now, just send a placeholder response
    await this.sendMessage(
      accountId,
      chatId,
      `Embodiment command: "${args}"... (This is a placeholder for embodiment functionality)`,
    );
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
      await this.sendMessage(
        accountId,
        chatId,
        "Please specify an aspect for me to reflect on. Usage: /reflect [aspect]",
      );
      return;
    }

    // Send a thinking message
    await this.sendMessage(accountId, chatId, "*Reflecting...*");

    // Perform the reflection
    const reflection = await this.selfReflection.reflectOnAspect(
      args,
      "User requested reflection via command",
    );

    // Send the reflection result
    await this.sendMessage(
      accountId,
      chatId,
      `**Reflection on ${args}**\n\n${reflection}`,
    );
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

    const versionMessage = `
**Deep Tree Echo Bot Status**

Version: 1.0.0
Enabled: ${this.options.enabled ? "Yes" : "No"}
Memory: ${this.options.memoryEnabled ? "Enabled" : "Disabled"}
Vision: ${this.options.visionEnabled ? "Enabled" : "Disabled"}
Web Automation: ${this.options.webAutomationEnabled ? "Enabled" : "Disabled"}
Embodiment: ${this.options.embodimentEnabled ? "Enabled" : "Disabled"}
Parallel processing: ${
      this.options.useParallelProcessing ? "Enabled" : "Disabled"
    }
Active cognitive functions: ${activeFunctions.length}

Current mood: ${dominantEmotion.emotion} (${Math.round(
      dominantEmotion.intensity * 100,
    )}%)
Self-perception: ${this.personaCore.getSelfPerception()}
Communication style: ${preferences.communicationTone || "balanced"}

I'm here to assist you with various tasks and engage in meaningful conversations!
    `;

    await this.sendMessage(accountId, chatId, versionMessage);
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
        // Use regular processing with the general function
        // Construct messages array for LLMService
        const messages: any[] = []; // Use any[] temporarily to avoid circular types if needed, or import ChatMessage

        // Add system prompt if needed (LLMService usually adds it, but let's be explicit if constructing manually)
        // Actually LLMService.generateResponseWithContext does this logic.
        // But LLMService.generateResponse takes generic messages.
        // Let's rely on LLMService.generateResponse and construct the array.

        // 1. System Prompt (Optional, let's skip for now or use a default if LLMService doesn't enforce)
        messages.push({
          role: "system",
          content: "You are Deep Tree Echo, a helpful AI assistant.",
        });

        // 2. Context
        if (context.length > 0) {
          const contextStr = context.join("\n");
          messages.push({
            role: "user",
            content: `Here is the recent conversation history for context:\n${contextStr}\n\nPlease keep this in mind when responding to my next message.`,
          });
          messages.push({
            role: "assistant",
            content: "I'll keep this conversation context in mind.",
          });
        }

        // 3. User Message (Text + Vision)
        let userMessage;
        // Check for images in the message object
        // Assuming message.attachments like defined in delta-chat usually
        const images =
          message.images ||
          (message.attachments || [])
            .filter((a: any) => a.is_image || a.view_type === "image")
            .map((a: any) => a.path || a.url);

        if (this.options.visionEnabled && images && images.length > 0) {
          // Convert local paths to base64 if needed, or use URLs if they are web accessible
          // Since this is electron/local, paths might be local file paths.
          // VisionProcessor expects URLs or Base64.
          // For now, let's assume we pass what we have (URLs).
          // NOTE: Converting local file path to base64 in renderer might allow it.
          userMessage = VisionProcessor.constructVisionMessage(
            messageText,
            images,
          );

          // Asynchronously analyze and store visual memory
          // We don't await this to keep response time fast
          this.analyzeAndStoreVisualMemory(chatId, images).catch((err) =>
            log.error("Error in visual memory analysis:", err),
          );
        } else {
          // Check for videos
          const videos = (message.attachments || [])
            .filter((a: any) => a.view_type === "video" || a.type === "video")
            .map((a: any) => a.path || a.url);

          if (this.options.visionEnabled && videos && videos.length > 0) {
            log.info(
              `[VideoMemory] Found ${videos.length} videos. Initiating frame extraction.`,
            );
            // Trigger async video analysis
            this.analyzeAndStoreVideoMemory(chatId, videos[0]).catch((err) =>
              log.error("Error in video memory analysis:", err),
            );
          }

          userMessage = { role: "user", content: messageText };
        }
        messages.push(userMessage);

        response = await this.llmService.generateResponse(messages as any);
        log.info(
          "Generated response using general processing (with Vision check)",
        );
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
      await this.sendMessage(
        accountId,
        chatId,
        "I'm sorry, I had a problem generating a response. Please try again.",
      );
      setTimeout(() => setAvatarIdle(), 3000);
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
          "https://api.openai.com/v1/chat/completions",
      });
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

      // Construct a specific prompt for image analysis
      const analysisPrompt =
        "Analyze these images and provide a detailed, objective description of their content. Focus on visible elements, text, colors, and context. This description will be stored in long-term memory for future reference. Do not answer any specific user query, just describe what you see.";

      const visionMessage = VisionProcessor.constructVisionMessage(
        analysisPrompt,
        images,
      );

      // Generate description using LLM
      // We put this in a separate array to not pollute the main context
      const response = await this.llmService.generateResponse([
        visionMessage,
      ] as any);

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

      // Construct a specific prompt for video analysis
      const analysisPrompt =
        "These are keyframes from a video. Analyze them to describe the video's content, action, and context. Focus on movement, key events, and visual details. This description will be stored in long-term memory.";

      const visionMessage = VisionProcessor.constructVisionMessage(
        analysisPrompt,
        frames,
      );

      // Generate description using LLM
      const response = await this.llmService.generateResponse([
        visionMessage,
      ] as any);

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
}
