import {
  getLogger,
  LLMService,
  RAGMemoryStore,
  PersonaCore,
  InMemoryStorage,
} from "deep-tree-echo-core";
import {
  CognitiveOrchestrator,
  createCognitiveOrchestrator,
} from "@deltecho/cognitive";
import {
  DeltaChatInterface,
  DeltaChatConfig,
  DeltaChatMessage,
} from "./deltachat-interface/index.js";
import { DovecotInterface, DovecotConfig } from "./dovecot-interface/index.js";
import { IPCServer } from "./ipc/server.js";
import { TaskScheduler } from "./scheduler/task-scheduler.js";
import { WebhookServer } from "./webhooks/webhook-server.js";
import {
  Dove9Integration,
  Dove9IntegrationConfig,
  Dove9Response,
} from "./dove9-integration.js";
import {
  DoubleMembraneIntegration,
  DoubleMembraneIntegrationConfig,
} from "./double-membrane-integration.js";
import {
  Sys6OrchestratorBridge,
  Sys6BridgeConfig,
} from "./sys6-bridge/Sys6OrchestratorBridge.js";
import { AARSystem, AARConfig, AARProcessingResult } from "./aar/index.js";
import { IPCMessageType } from "@deltecho/ipc";
import { registerCognitiveHandlers } from "./ipc/cognitive-handlers.js";

const log = getLogger("deep-tree-echo-orchestrator/Orchestrator");

/**
 * Cognitive tier processing mode
 *
 * - BASIC: Deep Tree Echo Core only (LLM + RAG + Personality)
 * - SYS6: Sys6-Triality 30-step cognitive cycle
 * - MEMBRANE: Double Membrane bio-inspired architecture
 * - ADAPTIVE: Auto-select tier based on message complexity
 * - FULL: All tiers active with cascading processing
 */
export type CognitiveTierMode =
  | "BASIC"
  | "SYS6"
  | "MEMBRANE"
  | "ADAPTIVE"
  | "FULL";

/**
 * Message complexity assessment result
 */
interface ComplexityAssessment {
  score: number; // 0-1
  tier: CognitiveTierMode;
  factors: {
    length: number;
    questionCount: number;
    technicalTerms: number;
    emotionalContent: number;
    contextDependency: number;
  };
}

/**
 * Email response from Dovecot interface
 */
interface EmailResponse {
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Enable DeltaChat integration */
  enableDeltaChat: boolean;
  /** DeltaChat configuration */
  deltachat?: Partial<DeltaChatConfig>;
  /** Enable Dovecot integration */
  enableDovecot: boolean;
  /** Dovecot configuration */
  dovecot?: Partial<DovecotConfig>;
  /** Enable IPC server */
  enableIPC: boolean;
  /** Enable task scheduler */
  enableScheduler: boolean;
  /** Enable webhook server */
  enableWebhooks: boolean;
  /** Default account ID to use for sending messages */
  defaultAccountId?: number;
  /** Process incoming DeltaChat messages */
  processIncomingMessages: boolean;
  /** Enable Dove9 cognitive OS integration */
  enableDove9: boolean;
  /** Dove9 configuration */
  dove9?: Partial<Dove9IntegrationConfig>;
  /** Cognitive tier processing mode */
  cognitiveTierMode: CognitiveTierMode;
  /** Enable Sys6-Triality cognitive cycle integration */
  enableSys6: boolean;
  /** Sys6 configuration */
  sys6?: Partial<Sys6BridgeConfig>;
  /** Enable Double Membrane bio-inspired architecture */
  enableDoubleMembrane: boolean;
  /** Double Membrane configuration */
  doubleMembrane?: Partial<DoubleMembraneIntegrationConfig>;
  /** Enable AAR (Agent-Arena-Relation) nested membrane architecture */
  enableAAR: boolean;
  /** AAR configuration */
  aar?: Partial<AARConfig>;
  /** Complexity threshold for ADAPTIVE mode to escalate from BASIC to SYS6 */
  sys6ComplexityThreshold: number;
  /** Complexity threshold for ADAPTIVE mode to escalate from SYS6 to MEMBRANE */
  membraneComplexityThreshold: number;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  enableDeltaChat: true,
  enableDovecot: true,
  enableIPC: true,
  enableScheduler: true,
  enableWebhooks: true,
  processIncomingMessages: true,
  enableDove9: true,
  cognitiveTierMode: "ADAPTIVE",
  enableSys6: true,
  enableDoubleMembrane: true,
  enableAAR: true,
  sys6ComplexityThreshold: 0.4,
  membraneComplexityThreshold: 0.7,
};

/**
 * Main orchestrator that coordinates all Deep Tree Echo services
 */
export class Orchestrator {
  private config: OrchestratorConfig;
  private deltachatInterface?: DeltaChatInterface;
  private dovecotInterface?: DovecotInterface;
  private ipcServer?: IPCServer;
  private scheduler?: TaskScheduler;
  private webhookServer?: WebhookServer;
  private dove9Integration?: Dove9Integration;
  private sys6Bridge?: Sys6OrchestratorBridge;
  private doubleMembraneIntegration?: DoubleMembraneIntegration;
  private aarSystem?: AARSystem;
  private running: boolean = false;

  // Cognitive services for processing messages
  private llmService: LLMService;
  private memoryStore: RAGMemoryStore;
  private personaCore: PersonaCore;
  private cognitiveOrchestrator: CognitiveOrchestrator;
  private storage = new InMemoryStorage();

  // Track email to chat mappings for routing responses
  private emailToChatMap: Map<string, { accountId: number; chatId: number }> =
    new Map();

  // Processing statistics
  private processingStats = {
    totalMessages: 0,
    basicTierMessages: 0,
    sys6TierMessages: 0,
    membraneTierMessages: 0,
    aarEnhancedMessages: 0,
    averageComplexity: 0,
  };

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize cognitive services
    this.memoryStore = new RAGMemoryStore(this.storage);
    this.memoryStore.setEnabled(true);
    this.personaCore = new PersonaCore(this.storage);
    this.llmService = new LLMService();

    // Initialize unified cognitive orchestrator
    this.cognitiveOrchestrator = createCognitiveOrchestrator({
      enableSentiment: true,
      enableMemory: true,
      enableEmotion: true,
    });
  }

  /**
   * Start the orchestrator and all its services
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn("Orchestrator is already running");
      return;
    }

    log.info("Initializing orchestrator services...");

    try {
      // Connect cognitive orchestrator to services
      await this.cognitiveOrchestrator.initialize({
        persona: this.personaCore,
        memory: this.memoryStore,
        llm: {
          generateResponse: async (
            userMessage: string,
            history: Array<{ role: string; content: string }> | undefined,
            _systemPrompt: string | undefined,
          ) => {
            // Convert history to string array for core LLMService
            const context = (history || []).map(
              (m: { role: string; content: string }) => `${m.role}: ${m.content}`,
            );
            return this.llmService.generateResponse(userMessage, context);
          },
        },
      });

      // Initialize DeltaChat interface
      if (this.config.enableDeltaChat) {
        this.deltachatInterface = new DeltaChatInterface(this.config.deltachat);

        // Set up event handlers before connecting
        this.setupDeltaChatEventHandlers();

        try {
          await this.deltachatInterface.connect();
          log.info("DeltaChat interface connected");
        } catch (error) {
          log.warn(
            "Failed to connect to DeltaChat RPC server, will retry automatically:",
            error,
          );
        }
      }

      // Initialize Dovecot interface for email processing
      if (this.config.enableDovecot) {
        this.dovecotInterface = new DovecotInterface(this.config.dovecot);

        // Connect Dovecot responses to DeltaChat for sending
        this.dovecotInterface.on(
          "response",
          async (response: EmailResponse) => {
            await this.handleEmailResponse(response);
          },
        );

        await this.dovecotInterface.start();
      }

      // Initialize IPC server for desktop app communication
      if (this.config.enableIPC) {
        this.ipcServer = new IPCServer();
        this.registerIPCHandlers();
        await this.ipcServer.start();
      }

      // Initialize task scheduler
      if (this.config.enableScheduler) {
        this.scheduler = new TaskScheduler();
        await this.scheduler.start();
      }

      // Initialize webhook server
      if (this.config.enableWebhooks) {
        this.webhookServer = new WebhookServer();
        await this.webhookServer.start();
      }

      // Initialize Dove9 cognitive OS integration
      if (this.config.enableDove9) {
        this.dove9Integration = new Dove9Integration(this.config.dove9);
        await this.dove9Integration.initialize();

        // Set up Dove9 response handler to route through DeltaChat
        this.dove9Integration.onResponse(async (response: Dove9Response) => {
          await this.handleDove9Response(response);
        });

        await this.dove9Integration.start();
        log.info("Dove9 cognitive OS started with triadic loop architecture");
      }

      // Initialize Sys6-Triality cognitive cycle integration
      if (this.config.enableSys6) {
        this.sys6Bridge = new Sys6OrchestratorBridge(this.config.sys6);
        await this.sys6Bridge.start();
        log.info(
          "Sys6-Triality cognitive cycle started with 30-step architecture",
        );
      }

      // Initialize Double Membrane bio-inspired architecture
      if (this.config.enableDoubleMembrane) {
        this.doubleMembraneIntegration = new DoubleMembraneIntegration({
          enabled: true,
          ...this.config.doubleMembrane,
        });
        await this.doubleMembraneIntegration.start();
        log.info(
          "Double Membrane integration started with bio-inspired architecture",
        );
      }

      // Initialize AAR (Agent-Arena-Relation) nested membrane architecture
      if (this.config.enableAAR) {
        this.aarSystem = new AARSystem({
          instanceName: "DeepTreeEcho",
          ...this.config.aar,
        });
        await this.aarSystem.start();
        log.info(
          "AAR (Agent-Arena-Relation) nested membrane architecture started",
        );
      }

      this.running = true;
      log.info(
        `All orchestrator services started successfully (cognitive tier mode: ${this.config.cognitiveTierMode})`,
      );
    } catch (error) {
      log.error("Failed to start orchestrator services:", error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Set up DeltaChat event handlers
   */
  private setupDeltaChatEventHandlers(): void {
    if (!this.deltachatInterface) return;

    // Handle incoming messages
    this.deltachatInterface.on(
      "incoming_message",
      async (event: { accountId: number; chatId: number; msgId: number }) => {
        if (this.config.processIncomingMessages) {
          await this.handleIncomingMessage(
            event.accountId,
            event.chatId,
            event.msgId,
          );
        }
      },
    );

    // Handle connection events
    this.deltachatInterface.on("connected", () => {
      log.info("DeltaChat connection established");
    });

    this.deltachatInterface.on("disconnected", () => {
      log.warn("DeltaChat connection lost");
    });

    // Handle errors
    this.deltachatInterface.on(
      "error",
      (event: { accountId: number; kind: string; message: string }) => {
        log.error(
          `DeltaChat error on account ${event.accountId}: ${event.message}`,
        );
      },
    );
  }

  /**
   * Handle incoming DeltaChat message
   */
  private async handleIncomingMessage(
    accountId: number,
    chatId: number,
    msgId: number,
  ): Promise<void> {
    if (!this.deltachatInterface) return;

    try {
      // Get message details
      const message = await this.deltachatInterface.getMessage(
        accountId,
        msgId,
      );

      // Skip messages from self (ID 1 is the logged-in user)
      if (message.fromId === 1) return;

      // Skip info messages
      if (message.isInfo) return;

      log.info(
        `Processing message in chat ${chatId}: ${message.text?.substring(
          0,
          50,
        )}...`,
      );

      // Get sender's email for mapping
      const contact = await this.deltachatInterface.getContact(
        accountId,
        message.fromId,
      );
      if (contact?.address) {
        // Store email to chat mapping for routing responses
        this.emailToChatMap.set(contact.address.toLowerCase(), {
          accountId,
          chatId,
        });
      }

      // Get chat info for group detection
      const chat = await this.deltachatInterface.getChat(accountId, chatId);
      const isGroup =
        chat?.chatType === "Group" ||
        chat?.chatType === "Mailinglist" ||
        chat?.chatType === "Broadcast";

      // Process the message through cognitive system
      const response = await this.processMessage(
        message,
        accountId,
        chatId,
        msgId,
        contact?.displayName || contact?.address || "Unknown",
        isGroup,
      );

      if (response) {
        // Send response back to the chat
        await this.deltachatInterface.sendMessage(accountId, chatId, response);
      }
    } catch (error) {
      log.error("Error handling incoming message:", error);
    }
  }

  /**
   * Assess the complexity of a message to determine which cognitive tier to use
   */
  private assessComplexity(messageText: string): ComplexityAssessment {
    const factors = {
      length: Math.min(1, messageText.length / 500),
      questionCount: (messageText.match(/\?/g) || []).length * 0.2,
      technicalTerms: this.countTechnicalTerms(messageText) * 0.15,
      emotionalContent: this.assessEmotionalContent(messageText),
      contextDependency: this.assessContextDependency(messageText),
    };

    // Calculate weighted complexity score
    const score = Math.min(
      1,
      factors.length * 0.2 +
        factors.questionCount * 0.2 +
        factors.technicalTerms * 0.25 +
        factors.emotionalContent * 0.15 +
        factors.contextDependency * 0.2,
    );

    // Determine tier based on score and thresholds
    let tier: CognitiveTierMode;
    if (score < this.config.sys6ComplexityThreshold) {
      tier = "BASIC";
    } else if (score < this.config.membraneComplexityThreshold) {
      tier = "SYS6";
    } else {
      tier = "MEMBRANE";
    }

    return { score, tier, factors };
  }

  /**
   * Count technical terms in the message
   */
  private countTechnicalTerms(text: string): number {
    const technicalPatterns = [
      /\b(API|SDK|JSON|XML|HTTP|SQL|REST|CRUD)\b/gi,
      /\b(function|class|method|variable|algorithm)\b/gi,
      /\b(cognitive|neural|memory|processing|inference)\b/gi,
      /\b(architecture|system|module|component|interface)\b/gi,
    ];
    let count = 0;
    for (const pattern of technicalPatterns) {
      count += (text.match(pattern) || []).length;
    }
    return Math.min(1, count / 5);
  }

  /**
   * Assess emotional content in the message
   */
  private assessEmotionalContent(text: string): number {
    const emotionalWords = [
      "feel",
      "happy",
      "sad",
      "angry",
      "frustrated",
      "love",
      "hate",
      "worried",
      "excited",
      "anxious",
      "grateful",
      "disappointed",
      "confused",
      "hopeful",
      "afraid",
    ];
    const lowerText = text.toLowerCase();
    let count = 0;
    for (const word of emotionalWords) {
      if (lowerText.includes(word)) count++;
    }
    return Math.min(1, count / 3);
  }

  /**
   * Assess context dependency of the message
   */
  private assessContextDependency(text: string): number {
    const contextMarkers = [
      "this",
      "that",
      "these",
      "those",
      "it",
      "they",
      "previous",
      "before",
      "earlier",
      "mentioned",
      "said",
      "above",
      "following",
    ];
    const lowerText = text.toLowerCase();
    let count = 0;
    for (const marker of contextMarkers) {
      if (lowerText.includes(marker)) count++;
    }
    return Math.min(1, count / 4);
  }

  /**
   * Process a message through the cognitive system with tier routing
   */
  private async processMessage(
    message: DeltaChatMessage,
    _accountId: number,
    chatId: number,
    msgId: number,
    senderName: string = "Unknown",
    isGroup: boolean = false,
  ): Promise<string | null> {
    const messageText = message.text || "";

    // Skip empty messages
    if (!messageText.trim()) return null;

    // Check if this is a command
    if (messageText.startsWith("/")) {
      return this.processCommand(messageText);
    }

    try {
      // Store user message in memory
      await this.memoryStore.storeMemory({
        chatId,
        messageId: msgId,
        sender: "user",
        text: messageText,
      });

      // Process through AAR (Agent-Arena-Relation) if enabled
      let aarResult: AARProcessingResult | undefined;
      if (this.aarSystem?.isRunning()) {
        aarResult = await this.aarSystem.processMessage({
          messageId: String(msgId),
          senderId: String(message.fromId),
          senderName,
          chatId: String(chatId),
          content: messageText,
          timestamp: Date.now(),
          isGroup,
        });
        this.processingStats.aarEnhancedMessages++;
        log.debug(
          `AAR processed: facet=${aarResult.agentState.dominantFacet}, phase=${aarResult.arenaState.currentPhase}`,
        );
      }

      // Determine cognitive tier based on mode
      let targetTier: CognitiveTierMode;
      let complexity: ComplexityAssessment | undefined;

      switch (this.config.cognitiveTierMode) {
        case "ADAPTIVE":
          complexity = this.assessComplexity(messageText);
          targetTier = complexity.tier;
          log.debug(
            `ADAPTIVE mode: complexity=${complexity.score.toFixed(
              2,
            )}, tier=${targetTier}`,
          );
          break;
        case "FULL":
          targetTier = "MEMBRANE"; // FULL mode uses highest tier
          break;
        default:
          targetTier = this.config.cognitiveTierMode;
      }

      // Update statistics
      this.processingStats.totalMessages++;
      if (complexity) {
        this.processingStats.averageComplexity =
          (this.processingStats.averageComplexity *
            (this.processingStats.totalMessages - 1) +
            complexity.score) /
          this.processingStats.totalMessages;
      }

      // Route to appropriate tier
      let response: string;
      switch (targetTier) {
        case "MEMBRANE":
          if (this.doubleMembraneIntegration?.isRunning()) {
            response = await this.processWithMembrane(messageText, chatId);
            this.processingStats.membraneTierMessages++;
          } else {
            log.warn(
              "MEMBRANE tier requested but not available, falling back to SYS6",
            );
            response = await this.processWithSys6(messageText, chatId);
            this.processingStats.sys6TierMessages++;
          }
          break;

        case "SYS6":
          if (this.sys6Bridge) {
            response = await this.processWithSys6(messageText, chatId);
            this.processingStats.sys6TierMessages++;
          } else {
            log.warn(
              "SYS6 tier requested but not available, falling back to BASIC",
            );
            response = await this.processWithBasic(messageText, chatId, msgId);
            this.processingStats.basicTierMessages++;
          }
          break;

        case "BASIC":
        default:
          response = await this.processWithBasic(
            messageText,
            chatId,
            msgId,
            aarResult,
          );
          this.processingStats.basicTierMessages++;
          break;
      }

      // Store bot response in memory
      await this.memoryStore.storeMemory({
        chatId,
        messageId: 0,
        sender: "bot",
        text: response,
      });

      // Update emotional state based on interaction
      await this.updateEmotionalState(messageText);

      return response;
    } catch (error) {
      log.error("Error processing message:", error);
      return "I'm sorry, I had a problem processing your message. Please try again.";
    }
  }

  /**
   * Process message with BASIC tier (Deep Tree Echo Core)
   */
  private async processWithBasic(
    messageText: string,
    _chatId: number,
    _msgId: number,
    _aarResult?: AARProcessingResult,
  ): Promise<string> {
    log.debug(
      "Processing with BASIC tier (delegating to CognitiveOrchestrator)",
    );

    const result = await this.cognitiveOrchestrator.processMessage(messageText);

    // Logic to incorporate AAR context if needed, but for now CognitiveOrchestrator handles the core
    return result.response.content;
  }

  /**
   * Process message with SYS6 tier (30-step cognitive cycle)
   */
  private async processWithSys6(
    messageText: string,
    _chatId: number,
  ): Promise<string> {
    log.debug("Processing with SYS6 tier (30-step cognitive cycle)");

    if (!this.sys6Bridge) {
      throw new Error("Sys6 bridge not initialized");
    }

    return this.sys6Bridge.processMessage(messageText);
  }

  /**
   * Process message with MEMBRANE tier (bio-inspired double membrane)
   */
  private async processWithMembrane(
    messageText: string,
    _chatId: number,
  ): Promise<string> {
    log.debug("Processing with MEMBRANE tier (bio-inspired architecture)");

    if (!this.doubleMembraneIntegration) {
      throw new Error("Double membrane integration not initialized");
    }

    const history = this.memoryStore.retrieveRecentMemories(10);

    return this.doubleMembraneIntegration.chat(
      messageText,
      history.map((h: string, i: number) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: h,
      })),
    );
  }

  /**
   * Process a command message
   */
  private processCommand(messageText: string): string {
    const command = messageText.split(" ")[0].toLowerCase();

    switch (command) {
      case "/help":
        return `**Deep Tree Echo Bot Help**

Available commands:
- **/help** - Display this help message
- **/status** - Show bot status
- **/version** - Display version information

You can also just chat with me normally and I'll respond!`;

      case "/status": {
        const emotionalState = this.personaCore.getDominantEmotion();
        const dove9State = this.dove9Integration?.getCognitiveState();
        const sys6State = this.sys6Bridge?.getState();
        const membraneStatus = this.doubleMembraneIntegration?.getStatus();
        const aarState = this.aarSystem?.getState();
        const stats = this.processingStats;
        return `**Deep Tree Echo Status**

Current mood: ${emotionalState.emotion} (${Math.round(
          emotionalState.intensity * 100,
        )}%)
Orchestrator running: ${this.running ? "Yes" : "No"}

**Cognitive Tier Mode: ${this.config.cognitiveTierMode}**
- BASIC tier: ${
          this.config.cognitiveTierMode === "BASIC" ? "Active" : "Standby"
        }
- SYS6 tier: ${
          this.sys6Bridge
            ? sys6State?.running
              ? "Active"
              : "Ready"
            : "Disabled"
        }
- MEMBRANE tier: ${
          this.doubleMembraneIntegration
            ? membraneStatus?.running
              ? "Active"
              : "Ready"
            : "Disabled"
        }
- AAR (Nested Membrane): ${this.aarSystem?.isRunning() ? "Active" : "Disabled"}

**Processing Statistics**
- Total messages: ${stats.totalMessages}
- BASIC tier: ${stats.basicTierMessages}
- SYS6 tier: ${stats.sys6TierMessages}
- MEMBRANE tier: ${stats.membraneTierMessages}
- AAR enhanced: ${stats.aarEnhancedMessages}
- Avg complexity: ${stats.averageComplexity.toFixed(2)}

**Service Status**
- DeltaChat: ${
          this.deltachatInterface?.isConnected() ? "Connected" : "Disconnected"
        }
- Dovecot: ${this.dovecotInterface?.isRunning() ? "Running" : "Stopped"}
- Dove9: ${dove9State?.running ? "Running" : "Stopped"}
${
  sys6State?.running
    ? `
**Sys6-Triality (30-step cycle)**
- Cycle: ${sys6State.cycleNumber}
- Step: ${sys6State.currentStep}/30
- Stream saliences: [${sys6State.streams
        .map((s) => s.salience.toFixed(2))
        .join(", ")}]`
    : ""
}
${
  membraneStatus?.running
    ? `
**Double Membrane**
- Identity energy: ${membraneStatus.identityEnergy.toFixed(2)}
- Native requests: ${membraneStatus.stats.nativeRequests}
- External requests: ${membraneStatus.stats.externalRequests}
- Hybrid requests: ${membraneStatus.stats.hybridRequests}`
    : ""
}
${
  aarState
    ? `
**AAR (Agent-Arena-Relation)**
- Character Facet: ${aarState.agent.dominantFacet}
- Narrative Phase: ${
        Object.entries(aarState.arena.phases).sort(
          ([, a], [, b]) => b.intensity - a.intensity,
        )[0]?.[0] || "engagement"
      }
- Identity Coherence: ${aarState.relation.emergentIdentity.coherence.toFixed(2)}
- Active Themes: ${aarState.relation.emergentIdentity.activeThemes
        .slice(0, 3)
        .join(", ")}
- Yggdrasil Lore: ${aarState.arena.yggdrasilReservoir.length} entries
- Sync Cycle: ${aarState.cycle}`
    : ""
}`;
      }

      case "/version":
        return `**Deep Tree Echo Orchestrator v2.1.0**
**Phase 7: AAR Nested Membrane Architecture**

**Cognitive Tiers:**
- Tier 1 (BASIC): Deep Tree Echo Core - LLM + RAG + Personality
- Tier 2 (SYS6): Sys6-Triality - 30-step cognitive cycle
- Tier 3 (MEMBRANE): Double Membrane - Bio-inspired architecture
- Cross-tier: AAR - Agent-Arena-Relation nested membrane

**Components:**
- DeltaChat Interface: ${this.deltachatInterface ? "Enabled" : "Disabled"}
- Dovecot Interface: ${this.dovecotInterface ? "Enabled" : "Disabled"}
- Dove9 Cognitive OS: ${this.dove9Integration ? "Enabled" : "Disabled"}
- Sys6-Triality: ${this.sys6Bridge ? "Enabled" : "Disabled"}
- Double Membrane: ${this.doubleMembraneIntegration ? "Enabled" : "Disabled"}
- AAR System: ${this.aarSystem ? "Enabled" : "Disabled"}
- IPC Server: ${this.ipcServer ? "Enabled" : "Disabled"}
- Task Scheduler: ${this.scheduler ? "Enabled" : "Disabled"}
- Webhook Server: ${this.webhookServer ? "Enabled" : "Disabled"}

**Architecture:**
- 3 concurrent cognitive streams (Dove9)
- 30-step cognitive cycle (Sys6)
- 120° phase offset between streams
- Adaptive tier routing based on complexity
- Bio-inspired double membrane processing
- AAR nested membrane (Agent/Arena/Relation)
- Yggdrasil Echo Reservoir for lore accumulation`;

      default:
        return `Unknown command: ${command}. Type /help for available commands.`;
    }
  }

  /**
   * Handle response from Dove9 cognitive OS
   */
  private async handleDove9Response(response: Dove9Response): Promise<void> {
    log.info(
      `Dove9 response ready for ${response.to} (process: ${response.processId})`,
    );
    log.debug(
      `Cognitive metrics: valence=${response.cognitiveMetrics.emotionalValence.toFixed(
        2,
      )}, arousal=${response.cognitiveMetrics.emotionalArousal.toFixed(
        2,
      )}, salience=${response.cognitiveMetrics.salienceScore.toFixed(2)}`,
    );

    // Route through DeltaChat
    const emailResponse: EmailResponse = {
      to: response.to,
      from: response.from,
      subject: response.subject,
      body: response.body,
      inReplyTo: response.inReplyTo,
    };

    await this.handleEmailResponse(emailResponse);
  }

  /**
   * Handle email response from Dovecot and route to DeltaChat
   */
  private async handleEmailResponse(response: EmailResponse): Promise<void> {
    log.info(`Routing email response to ${response.to}`);

    if (!this.deltachatInterface?.isConnected()) {
      log.warn("DeltaChat not connected, cannot send response");
      return;
    }

    try {
      // Check if we have a cached chat mapping for this email
      const emailLower = response.to.toLowerCase();
      let routing = this.emailToChatMap.get(emailLower);

      if (!routing) {
        // Need to find or create a chat for this email
        const accounts = await this.deltachatInterface.getAllAccounts();

        if (accounts.length === 0) {
          log.error("No DeltaChat accounts available");
          return;
        }

        // Use default account or first available
        const accountId = this.config.defaultAccountId || accounts[0].id;

        // Find or create chat for this email
        const chatId = await this.deltachatInterface.findOrCreateChatForEmail(
          accountId,
          response.to,
        );

        routing = { accountId, chatId };
        this.emailToChatMap.set(emailLower, routing);
      }

      // Format the response as an email reply
      const formattedResponse = `**Re: ${response.subject}**

${response.body}`;

      // Send through DeltaChat
      await this.deltachatInterface.sendMessage(
        routing.accountId,
        routing.chatId,
        formattedResponse,
      );

      log.info(`Response sent to chat ${routing.chatId}`);
    } catch (error) {
      log.error("Failed to route email response to DeltaChat:", error);
    }
  }

  /**
   * Update emotional state based on message content
   */
  private async updateEmotionalState(content: string): Promise<void> {
    const positiveWords = [
      "thank",
      "great",
      "good",
      "love",
      "appreciate",
      "happy",
      "excited",
    ];
    const negativeWords = [
      "sorry",
      "problem",
      "issue",
      "wrong",
      "bad",
      "angry",
      "frustrated",
    ];

    const lowerContent = content.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      if (lowerContent.includes(word)) positiveCount++;
    });

    negativeWords.forEach((word) => {
      if (lowerContent.includes(word)) negativeCount++;
    });

    const stimuli: Record<string, number> = {};

    if (positiveCount > negativeCount) {
      stimuli.joy = 0.2;
      stimuli.interest = 0.1;
    } else if (negativeCount > positiveCount) {
      stimuli.sadness = 0.1;
      stimuli.interest = 0.1;
    }

    // Always increase interest for new messages
    stimuli.interest = (stimuli.interest || 0) + 0.1;

    await this.personaCore.updateEmotionalState(stimuli);
  }

  /**
   * Stop the orchestrator and all its services
   */
  public async stop(): Promise<void> {
    if (!this.running) {
      log.warn("Orchestrator is not running");
      return;
    }

    log.info("Stopping orchestrator services...");

    // Stop all services in reverse order (newest first)
    if (this.doubleMembraneIntegration) {
      await this.doubleMembraneIntegration.stop();
    }

    if (this.sys6Bridge) {
      await this.sys6Bridge.stop();
    }

    if (this.dove9Integration) {
      await this.dove9Integration.stop();
    }

    if (this.webhookServer) {
      await this.webhookServer.stop();
    }

    if (this.scheduler) {
      await this.scheduler.stop();
    }

    if (this.ipcServer) {
      await this.ipcServer.stop();
    }

    if (this.dovecotInterface) {
      await this.dovecotInterface.stop();
    }

    if (this.deltachatInterface) {
      await this.deltachatInterface.disconnect();
    }

    this.running = false;
    log.info("Orchestrator stopped successfully");
  }

  /**
   * Get Dovecot interface for direct access
   */
  public getDovecotInterface(): DovecotInterface | undefined {
    return this.dovecotInterface;
  }

  /**
   * Get DeltaChat interface for direct access
   */
  public getDeltaChatInterface(): DeltaChatInterface | undefined {
    return this.deltachatInterface;
  }

  /**
   * Check if orchestrator is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get Dove9 integration for direct access
   */
  public getDove9Integration(): Dove9Integration | undefined {
    return this.dove9Integration;
  }

  /**
   * Get Dove9 cognitive state
   */
  public getDove9CognitiveState(): any {
    return this.dove9Integration?.getCognitiveState() || null;
  }

  /**
   * Configure LLM service API keys
   */
  public configureApiKeys(keys: Record<string, string>): void {
    if (keys.general) {
      this.llmService.setConfig({ apiKey: keys.general });
    }
    log.info("API keys configured");
  }

  /**
   * Send a message directly to a DeltaChat chat
   */
  public async sendMessage(
    accountId: number,
    chatId: number,
    text: string,
  ): Promise<number | null> {
    if (!this.deltachatInterface?.isConnected()) {
      log.error("DeltaChat not connected");
      return null;
    }

    return this.deltachatInterface.sendMessage(accountId, chatId, text);
  }

  /**
   * Send a message to an email address through DeltaChat
   */
  public async sendMessageToEmail(
    email: string,
    text: string,
    accountId?: number,
  ): Promise<boolean> {
    if (!this.deltachatInterface?.isConnected()) {
      log.error("DeltaChat not connected");
      return false;
    }

    try {
      // Get account to use
      let useAccountId = accountId || this.config.defaultAccountId;

      if (!useAccountId) {
        const accounts = await this.deltachatInterface.getAllAccounts();
        if (accounts.length === 0) {
          log.error("No DeltaChat accounts available");
          return false;
        }
        useAccountId = accounts[0].id;
      }

      // Find or create chat for email
      const chatId = await this.deltachatInterface.findOrCreateChatForEmail(
        useAccountId,
        email,
      );

      // Send message
      await this.deltachatInterface.sendMessage(useAccountId, chatId, text);

      // Update cache
      this.emailToChatMap.set(email.toLowerCase(), {
        accountId: useAccountId,
        chatId,
      });

      return true;
    } catch (error) {
      log.error("Failed to send message to email:", error);
      return false;
    }
  }

  /**
   * Get Sys6 bridge for direct access
   */
  public getSys6Bridge(): Sys6OrchestratorBridge | undefined {
    return this.sys6Bridge;
  }

  /**
   * Get Double Membrane integration for direct access
   */
  public getDoubleMembraneIntegration(): DoubleMembraneIntegration | undefined {
    return this.doubleMembraneIntegration;
  }

  /**
   * Get current cognitive tier mode
   */
  public getCognitiveTierMode(): CognitiveTierMode {
    return this.config.cognitiveTierMode;
  }

  /**
   * Set cognitive tier mode at runtime
   */
  public setCognitiveTierMode(mode: CognitiveTierMode): void {
    log.info(
      `Changing cognitive tier mode from ${this.config.cognitiveTierMode} to ${mode}`,
    );
    this.config.cognitiveTierMode = mode;
  }

  /**
   * Get processing statistics
   */
  public getProcessingStats(): typeof this.processingStats {
    return { ...this.processingStats };
  }

  /**
   * Get comprehensive cognitive system status
   */
  public getCognitiveSystemStatus(): {
    tierMode: CognitiveTierMode;
    sys6: {
      running: boolean;
      cycleNumber?: number;
      currentStep?: number;
    } | null;
    doubleMembrane: { running: boolean; identityEnergy?: number } | null;
    dove9: { running: boolean } | null;
    stats: {
      totalMessages: number;
      basicTierMessages: number;
      sys6TierMessages: number;
      membraneTierMessages: number;
      averageComplexity: number;
    };
  } {
    const sys6State = this.sys6Bridge?.getState();
    return {
      tierMode: this.config.cognitiveTierMode,
      sys6: this.sys6Bridge
        ? {
            running: sys6State?.running ?? false,
            cycleNumber: sys6State?.cycleNumber,
            currentStep: sys6State?.currentStep,
          }
        : null,
      doubleMembrane: this.doubleMembraneIntegration
        ? {
            running: this.doubleMembraneIntegration.isRunning(),
            identityEnergy:
              this.doubleMembraneIntegration.getStatus().identityEnergy,
          }
        : null,
      dove9: this.dove9Integration
        ? {
            running:
              this.dove9Integration.getCognitiveState()?.running || false,
          }
        : null,
      stats: { ...this.processingStats },
    };
  }

  /**
   * Register handlers for IPC server
   *
   * Registers comprehensive handlers for cognitive, memory, persona, and system operations.
   * Uses the strongly-typed protocol from ./ipc/protocol.ts
   */
  private registerIPCHandlers(): void {
    if (!this.ipcServer) return;

    // Register comprehensive cognitive handlers
    registerCognitiveHandlers(this.ipcServer, {
      cognitiveOrchestrator: this.cognitiveOrchestrator,
      personaCore: this.personaCore,
      memoryStore: this.memoryStore as any,
    });

    // Register system status handler
    this.ipcServer.registerHandler(IPCMessageType.SYSTEM_STATUS, async () => {
      const emotionalState = this.personaCore.getDominantEmotion();
      const _dove9State = this.dove9Integration?.getCognitiveState();
      const _sys6State = this.sys6Bridge?.getState();
      const _membraneStatus = this.doubleMembraneIntegration?.getStatus();
      const _aarState = this.aarSystem?.getState();

      return {
        running: this.running,
        uptime: process.uptime(),
        version: "2.1.0",
        components: {
          cognitive: {
            status: this.cognitiveOrchestrator.isReady()
              ? "ready"
              : "initializing",
            ready: this.cognitiveOrchestrator.isReady(),
          },
          memory: {
            status: this.memoryStore.isEnabled() ? "enabled" : "disabled",
            entryCount: 0, // Would need method to get count
          },
          persona: {
            status: "active",
            dominantEmotion: emotionalState.emotion,
          },
          ipc: {
            status: this.ipcServer?.isRunning() ? "running" : "stopped",
            clientCount: this.ipcServer?.getClientCount() || 0,
          },
          deltachat: {
            status: this.deltachatInterface?.isConnected()
              ? "connected"
              : "disconnected",
          },
          dovecot: {
            status: this.dovecotInterface?.isRunning() ? "running" : "stopped",
          },
        },
        processingStats: this.processingStats,
      };
    });

    // Register system metrics handler
    this.ipcServer.registerHandler(IPCMessageType.SYSTEM_METRICS, async () => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          cores: require("os").cpus().length,
        },
        memory: {
          used: memUsage.rss,
          total: require("os").totalmem(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
        },
        uptime: process.uptime(),
        clientsConnected: this.ipcServer?.getClientCount() || 0,
      };
    });

    log.info("IPC handlers registered (cognitive, memory, persona, system)");
  }
}
