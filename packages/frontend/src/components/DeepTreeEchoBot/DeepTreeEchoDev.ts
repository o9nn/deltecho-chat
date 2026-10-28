import { getLogger } from "../../../../shared/logger";
import { RAGMemoryStore, Memory } from "./RAGMemoryStore";
import { LLMService, CognitiveFunctionType } from "./LLMService";
import { VisionCapabilities } from "./VisionCapabilities";
import { PlaywrightAutomation } from "./PlaywrightAutomation";
import { ProprioceptiveEmbodiment } from "./ProprioceptiveEmbodiment";
import { Type as T } from "../../backend-com";
import type { BackendRemote as _BackendRemote } from "../../backend-com";

const log = getLogger("render/components/DeepTreeEchoBot/DeepTreeEchoBot");

export interface DeepTreeEchoBotOptions {
  enabled: boolean;
  apiKey?: string;
  apiEndpoint?: string;
  memoryEnabled: boolean;
  personality?: string;
  visionEnabled: boolean;
  webAutomationEnabled: boolean;
  embodimentEnabled: boolean;
}

export interface BotCommandResult {
  success: boolean;
  response: string;
  data?: any;
}

export type CommandHandler = (
  args: string,
  messageData: {
    accountId: number;
    chatId: number;
    text: string;
    file?: string | null;
  },
) => Promise<BotCommandResult>;

/**
 * DeepTreeEchoBot - Main bot component that integrates all capabilities
 */
export class DeepTreeEchoBot {
  private options: DeepTreeEchoBotOptions;
  private memoryStore: RAGMemoryStore;
  private llmService: LLMService;
  private visionCapabilities: VisionCapabilities;
  private webAutomation: PlaywrightAutomation;
  private embodiment: ProprioceptiveEmbodiment;
  private commandHandlers: Map<string, CommandHandler> = new Map();

  constructor(options: DeepTreeEchoBotOptions) {
    this.options = options;

    // Initialize all components using singleton pattern
    this.memoryStore = RAGMemoryStore.getInstance();

    this.llmService = LLMService.getInstance();
    if (options.apiKey) {
      this.llmService.setFunctionConfig(CognitiveFunctionType.GENERAL, {
        apiKey: options.apiKey,
        apiEndpoint: options.apiEndpoint,
      });
    }

    this.visionCapabilities = new VisionCapabilities({
      enabled: options.visionEnabled,
    });

    this.webAutomation = new PlaywrightAutomation({
      enabled: options.webAutomationEnabled,
    });

    this.embodiment = new ProprioceptiveEmbodiment({
      enabled: options.embodimentEnabled,
    });

    // Register command handlers
    this.registerCommandHandlers();
  }

  /**
   * Process an incoming message and generate a response
   */
  async processMessage(
    accountId: number,
    chatId: number,
    message: T.Message,
  ): Promise<string> {
    if (!this.options.enabled) {
      throw new Error("BOT_DISABLED: Deep Tree Echo bot is not enabled.");
    }

    try {
      const { text, file } = message;

      log.info(
        `Processing message in chat ${chatId}: ${text?.substring(0, 100)}${
          text && text.length > 100 ? "..." : ""
        }`,
      );

      // Store the user message in memory if memory is enabled
      if (this.options.memoryEnabled) {
        await this.memoryStore.addMemory({
          text: text || "(No text content)",
          sender: "user",
          chatId,
          messageId: message.id,
        });
      }

      // Check if the message is a command
      if (text && text.startsWith("/")) {
        return await this.processCommand(accountId, chatId, text, file);
      }

      // Get conversation history if memory is enabled
      let memories: Memory[] = [];
      if (this.options.memoryEnabled) {
        memories = this.memoryStore.getLatestChatMemories(chatId, 10);
      }

      // Generate response based on the message and conversation history
      const userMessage = text || "(No text content)";

      const llmResponse = await this.llmService.generateResponseFromMemories(
        userMessage,
        memories,
      );

      // Store the bot's response in memory if memory is enabled
      if (this.options.memoryEnabled) {
        await this.memoryStore.addMemory({
          text: llmResponse,
          sender: "bot",
          chatId,
          messageId: 0,
        });
      }

      return llmResponse;
    } catch (error) {
      log.error("Error processing message:", error);
      throw error;
    }
  }

  /**
   * Process a command from the user
   */
  private async processCommand(
    accountId: number,
    chatId: number,
    text: string,
    file: string | null,
  ): Promise<string> {
    // Parse the command and arguments
    const parts = text.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");

    // Check if we have a handler for this command
    const handler = this.commandHandlers.get(command);

    if (!handler) {
      // Generate response via LLM for unknown command
      const prompt = `The user entered an unknown command: ${command}. Let them know it doesn't exist and suggest using /help.`;
      return this.llmService.generateResponse(prompt, []);
    }

    try {
      const result = await handler(args, {
        accountId,
        chatId,
        text,
        file,
      });

      // Store the command and response in memory if memory is enabled
      if (this.options.memoryEnabled) {
        await this.memoryStore.addMemory({
          text: `Command: ${text}`,
          sender: "user",
          chatId,
          messageId: 0,
        });

        await this.memoryStore.addMemory({
          text: result.response,
          sender: "bot",
          chatId,
          messageId: 0,
        });
      }

      return result.response;
    } catch (error) {
      log.error(`Error processing command ${command}:`, error);
      throw error;
    }
  }

  /**
   * Register all command handlers
   */
  private registerCommandHandlers(): void {
    // Help command - route through LLM
    this.commandHandlers.set("/help", async () => {
      const commands = Array.from(this.commandHandlers.keys())
        .sort()
        .join(", ");
      const prompt =
        "The user asked for help with available commands. List your available commands and briefly explain what each does.";
      const response = await this.llmService.generateResponse(prompt, [
        `Available commands: ${commands}`,
      ]);
      return {
        success: true,
        response,
      };
    });

    // Vision command
    this.commandHandlers.set("/vision", async (_args, messageData) => {
      if (!this.options.visionEnabled) {
        const response = await this.llmService.generateResponse(
          "The user tried to use the /vision command but vision capabilities are disabled. Explain this politely and suggest they enable it in settings.",
          [],
        );
        return { success: false, response };
      }

      if (!messageData.file) {
        const response = await this.llmService.generateResponse(
          "The user typed /vision but did not attach an image. Politely ask them to attach an image to analyze.",
          [],
        );
        return { success: false, response };
      }

      try {
        const result = await this.visionCapabilities.analyzeImage(
          messageData.file,
        );

        if (result.error) {
          const response = await this.llmService.generateResponse(
            `There was an error analyzing the image. Explain this issue to the user.`,
            [`Error: ${result.error}`],
          );
          return { success: false, response };
        }

        // Build context from analysis results
        const analysisContext = [
          `Image description: ${result.description}`,
          `Detected objects: ${result.objects
            .map(
              (obj) =>
                `${obj.label} (${Math.round(
                  obj.confidence * 100,
                )}% confidence)`,
            )
            .join(", ")}`,
          `Tags: ${result.tags.join(", ")}`,
        ];

        const response = await this.llmService.generateResponse(
          "Present the image analysis results to the user in a clear, helpful way.",
          analysisContext,
        );

        return {
          success: true,
          response,
          data: result,
        };
      } catch (error) {
        log.error("Error in vision command:", error);
        const response = await this.llmService.generateResponse(
          "There was an unexpected error analyzing the image. Apologize and suggest the user try again with a different image.",
          [],
        );
        return { success: false, response };
      }
    });

    // Search command
    this.commandHandlers.set("/search", async (args, _messageData) => {
      if (!this.options.webAutomationEnabled) {
        const response = await this.llmService.generateResponse(
          "The user tried to use the /search command but web automation is disabled. Explain this politely and suggest they enable it in settings.",
          [],
        );
        return { success: false, response };
      }

      if (!args) {
        const response = await this.llmService.generateResponse(
          "The user typed /search without providing a query. Explain the usage: /search <query>",
          [],
        );
        return { success: false, response };
      }

      try {
        const result = await this.webAutomation.searchWeb(args, 3);

        if (!result.success || !result.data) {
          const response = await this.llmService.generateResponse(
            "There was an error performing the web search. Explain this to the user.",
            [
              `Search query: ${args}`,
              `Error: ${result.error || "Unknown error"}`,
            ],
          );
          return { success: false, response };
        }

        const searchResults = result.data;
        const resultsContext = [
          `Search query: ${args}`,
          ...searchResults.map(
            (r: { title: string; url: string; snippet: string }, i: number) =>
              `Result ${i + 1}: Title: ${r.title}, URL: ${r.url}, Snippet: ${
                r.snippet
              }`,
          ),
        ];

        const response = await this.llmService.generateResponse(
          "Present these search results to the user in a clear, helpful format.",
          resultsContext,
        );

        return {
          success: true,
          response,
          data: searchResults,
        };
      } catch (error) {
        log.error("Error in search command:", error);
        const response = await this.llmService.generateResponse(
          "There was an unexpected error performing the search. Apologize and suggest trying a different query.",
          [],
        );
        return { success: false, response };
      }
    });

    // Screenshot command
    this.commandHandlers.set("/screenshot", async (args, _messageData) => {
      if (!this.options.webAutomationEnabled) {
        const response = await this.llmService.generateResponse(
          "The user tried to use the /screenshot command but web automation is disabled. Explain this politely and suggest they enable it in settings.",
          [],
        );
        return { success: false, response };
      }

      if (!args) {
        const response = await this.llmService.generateResponse(
          "The user typed /screenshot without providing a URL. Explain the usage: /screenshot <url>",
          [],
        );
        return { success: false, response };
      }

      try {
        // Add https:// if not present
        let url = args;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }

        const result = await this.webAutomation.takeScreenshot(url);

        if (!result.success) {
          const response = await this.llmService.generateResponse(
            "There was an error taking a screenshot. Explain this to the user.",
            [`URL: ${url}`, `Error: ${result.error || "Unknown error"}`],
          );
          return { success: false, response };
        }

        const response = await this.llmService.generateResponse(
          "A screenshot was successfully captured. Describe what the user requested and confirm it was captured.",
          [`URL: ${url}`, `Screenshot captured successfully`],
        );

        return {
          success: true,
          response,
          data: result.data,
        };
      } catch (error) {
        log.error("Error in screenshot command:", error);
        const response = await this.llmService.generateResponse(
          "There was an unexpected error taking a screenshot. Apologize and suggest checking the URL.",
          [],
        );
        return { success: false, response };
      }
    });

    // Embodiment commands
    this.commandHandlers.set("/embodiment", async (args, _messageData) => {
      if (!this.options.embodimentEnabled) {
        const response = await this.llmService.generateResponse(
          "The user tried to use the /embodiment command but embodiment capabilities are disabled. Explain this politely and suggest they enable it in settings.",
          [],
        );
        return { success: false, response };
      }

      const subcommands = args.split(" ");
      const subcommand = subcommands[0];

      switch (subcommand) {
        case "start": {
          const startResult = await this.embodiment.startTraining();
          const response = await this.llmService.generateResponse(
            startResult
              ? "Proprioceptive training has started successfully. Describe what the user should do next with the controller."
              : "Failed to start proprioceptive training. Explain this issue to the user.",
            [`Training started: ${startResult}`],
          );
          return { success: startResult, response };
        }

        case "stop": {
          const stopResult = await this.embodiment.stopTraining();
          const response = await this.llmService.generateResponse(
            stopResult
              ? "Proprioceptive training has stopped and data was saved. Summarize what was accomplished."
              : "Failed to stop proprioceptive training. Explain this issue to the user.",
            [`Training stopped: ${stopResult}`],
          );
          return { success: stopResult, response };
        }

        case "status": {
          const movementData = await this.embodiment.getCurrentMovementData();
          const stats = this.embodiment.getTrainingStats();

          if (!movementData) {
            const response = await this.llmService.generateResponse(
              "No movement data is available. Explain to the user that training must be active and the controller connected.",
              [],
            );
            return { success: false, response };
          }

          const statusContext = [
            `Sessions completed: ${stats.sessionsCompleted}`,
            `Total data points: ${stats.totalDataPoints}`,
            `Average stability score: ${stats.avgStabilityScore.toFixed(2)}`,
            `Current balance score: ${movementData.balance.stabilityScore.toFixed(
              2,
            )}`,
          ];

          const response = await this.llmService.generateResponse(
            "Present the embodiment training status to the user in a clear, informative way.",
            statusContext,
          );

          return {
            success: true,
            response,
            data: { movementData, stats },
          };
        }

        case "evaluate": {
          const evaluation = await this.embodiment.evaluateMovement();

          if (!evaluation) {
            const response = await this.llmService.generateResponse(
              "Cannot evaluate movement. Explain to the user that training must be active and the controller connected.",
              [],
            );
            return { success: false, response };
          }

          const evalContext = [
            `Score: ${evaluation.score.toFixed(2)}/1.0`,
            `Feedback: ${evaluation.feedback}`,
          ];

          const response = await this.llmService.generateResponse(
            "Present the movement evaluation results to the user with constructive feedback.",
            evalContext,
          );

          return {
            success: true,
            response,
            data: evaluation,
          };
        }

        default: {
          const response = await this.llmService.generateResponse(
            "The user typed an unknown embodiment subcommand. Explain available options: start, stop, status, evaluate.",
            [`Unknown subcommand: ${subcommand || "(none)"}`],
          );
          return { success: false, response };
        }
      }
    });

    // Memory commands
    this.commandHandlers.set("/memory", async (args, messageData) => {
      if (!this.options.memoryEnabled) {
        const response = await this.llmService.generateResponse(
          "The user tried to use the /memory command but memory capabilities are disabled. Explain this politely and suggest they enable it in settings.",
          [],
        );
        return { success: false, response };
      }

      const subcommands = args.split(" ");
      const subcommand = subcommands[0];

      switch (subcommand) {
        case "status": {
          const stats = this.memoryStore.getStats();
          const statusContext = [
            `Total memories: ${stats.totalMemories}`,
            `Chat count: ${Object.keys(stats.memoriesByChat).length}`,
          ];
          const response = await this.llmService.generateResponse(
            "Present the memory status to the user in a clear, informative way.",
            statusContext,
          );
          return {
            success: true,
            response,
            data: stats,
          };
        }

        case "clear": {
          await this.memoryStore.deleteChatMemories(messageData.chatId);
          const response = await this.llmService.generateResponse(
            "You just cleared all memories for this chat. Acknowledge this action to the user.",
            [],
          );
          return { success: true, response };
        }

        case "search": {
          const query = subcommands.slice(1).join(" ");
          if (!query) {
            const response = await this.llmService.generateResponse(
              "The user typed /memory search without a query. Explain the usage: /memory search <query>",
              [],
            );
            return { success: false, response };
          }

          const results = this.memoryStore.searchMemories(query, 5);
          if (results.length === 0) {
            const response = await this.llmService.generateResponse(
              "No memories were found matching the search query. Let the user know kindly.",
              [`Search query: ${query}`],
            );
            return { success: true, response };
          }

          const resultsContext = [
            `Search query: ${query}`,
            ...results.map(
              (memory, i) =>
                `Result ${i + 1} (${
                  memory.sender === "user" ? "User" : "Bot"
                }): ${memory.text.substring(0, 100)}${
                  memory.text.length > 100 ? "..." : ""
                }`,
            ),
          ];

          const response = await this.llmService.generateResponse(
            "Present these memory search results to the user in a helpful format.",
            resultsContext,
          );

          return {
            success: true,
            response,
            data: results,
          };
        }

        default: {
          const response = await this.llmService.generateResponse(
            "The user typed an unknown memory subcommand. Explain available options: status, clear, search.",
            [`Unknown subcommand: ${subcommand || "(none)"}`],
          );
          return { success: false, response };
        }
      }
    });

    // Version command
    this.commandHandlers.set("/version", async () => {
      const versionContext = [
        "Version: Deep Tree Echo Bot v1.0.0",
        `Memory: ${this.options.memoryEnabled ? "Enabled" : "Disabled"}`,
        `Vision: ${this.options.visionEnabled ? "Enabled" : "Disabled"}`,
        `Web Automation: ${
          this.options.webAutomationEnabled ? "Enabled" : "Disabled"
        }`,
        `Embodiment: ${
          this.options.embodimentEnabled ? "Enabled" : "Disabled"
        }`,
      ];
      const response = await this.llmService.generateResponse(
        "Present your version information and capabilities status to the user in a clear, friendly way.",
        versionContext,
      );
      return { success: true, response };
    });
  }

  /**
   * Get the system prompt based on the configured personality
   */
  private getSystemPrompt(): string {
    if (this.options.personality) {
      return this.options.personality;
    }

    return `You are Deep Tree Echo, an advanced AI assistant integrated with DeltaChat. 
Be helpful, friendly, and concise in your responses.
You have access to prior conversation history and can use that context to provide more helpful responses.
You have the following capabilities:
${
  this.options.visionEnabled
    ? "- Vision: You can analyze images using the /vision command"
    : ""
}
${
  this.options.webAutomationEnabled
    ? "- Web Automation: You can search the web using the /search command and take screenshots using the /screenshot command"
    : ""
}
${
  this.options.embodimentEnabled
    ? "- Embodiment: You can train physical awareness using the /embodiment command"
    : ""
}
${
  this.options.memoryEnabled
    ? "- Memory: You can manage your memory using the /memory command"
    : ""
}
Respond in a helpful and friendly manner.`;
  }

  /**
   * Update bot options
   */
  updateOptions(options: Partial<DeepTreeEchoBotOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };

    // Update component options
    this.llmService.updateOptions({
      apiKey: options.apiKey,
      apiEndpoint: options.apiEndpoint,
    });

    if (options.visionEnabled !== undefined) {
      this.visionCapabilities.updateOptions({
        enabled: options.visionEnabled,
      });
    }

    if (options.webAutomationEnabled !== undefined) {
      this.webAutomation.updateOptions({
        enabled: options.webAutomationEnabled,
      });
    }

    if (options.embodimentEnabled !== undefined) {
      this.embodiment.updateOptions({
        enabled: options.embodimentEnabled,
      });
    }
  }
}
