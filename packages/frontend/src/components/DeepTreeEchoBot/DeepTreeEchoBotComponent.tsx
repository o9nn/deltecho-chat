import React, { useEffect, useState, useRef } from "react";
import type { C as _C } from "@deltachat/jsonrpc-client";
import { getLogger } from "@deltachat-desktop/shared/logger";

const log = getLogger(
  "render/components/DeepTreeEchoBot/DeepTreeEchoBotComponent",
);

// Import all the advanced cognitive modules
import { HyperDimensionalMemory } from "./HyperDimensionalMemory";
import { AdaptivePersonality } from "./AdaptivePersonality";
import { QuantumBeliefPropagation } from "./QuantumBeliefPropagation";
import { EmotionalIntelligence } from "./EmotionalIntelligence";
import { SecureIntegration } from "./SecureIntegration";
import { ScientificDashboard } from "../ScientificGenius/ScientificDashboard";
import { LLMService } from "./LLMService";

// Types of commands that Deep Tree Echo can process
enum _CommandType {
  IDENTITY = "identity",
  MEMORY = "memory",
  BELIEF = "belief",
  EMOTIONAL = "emotional",
  REFLECT = "reflect",
  HELP = "help",
  RESET = "reset",
  VISION = "vision",
  SECURITY = "security",
  EVOLVE = "evolve",
}

// Cognitive processing states
enum CognitiveState {
  IDLE = "idle",
  PROCESSING = "processing",
  RESPONDING = "responding",
  REFLECTING = "reflecting",
  LEARNING = "learning",
  ERROR = "error",
}

// Types of cognitive data that need protection
enum CognitiveDataType {
  MEMORY = "memory",
  PERSONALITY = "personality",
  BELIEF = "belief",
  EMOTIONAL = "emotional",
  USER_DATA = "user_data",
  CONVERSATION = "conversation",
  MODEL_PARAMETER = "model_parameter",
}

// Interface for bot configuration
export interface DeepTreeEchoBotOptions {
  enabledModules: {
    hyperMemory: boolean;
    adaptivePersonality: boolean;
    quantumBelief: boolean;
    emotionalIntelligence: boolean;
    secureIntegration: boolean;
  };
  cognitiveParameters: {
    memoryDepth: number;
    emotionalSensitivity: number;
    learningRate: number;
    creativityFactor: number;
    autonomyLevel: number;
  };
  securitySettings: {
    minimumEncryptionLevel: string;
    allowIdentityTransfer: boolean;
    allowSelfModification: boolean;
  };
}

// Interface for the core bot properties
interface DeepTreeEchoBotCore {
  name: string;
  version: string;
  created: number;
  lastUpdated: number;
  interactionCount: number;
  description: string;
  identity: string[];
  systemMessages: string[];
}

/**
 * Deep Tree Echo Bot Component
 *
 * This is the main React component that integrates all the cognitive
 * modules into a cohesive AI personality that can interact with
 * DeltaChat messages.
 */
interface DeepTreeEchoBotProps {
  testHooks?: {
    processMessage?: (
      chatId: number,
      senderId: number,
      messageText: string,
    ) => Promise<void>;
    processCommand?: (
      command: string,
      args: string,
      chatId: number,
    ) => Promise<string>;
    loadBotState?: () => Promise<void>;
  };
}

/**
 * Deep Tree Echo Bot Component
 *
 * This is the main React component that integrates all the cognitive
 * modules into a cohesive AI personality that can interact with
 * DeltaChat messages.
 */
const DeepTreeEchoBot: React.FC<DeepTreeEchoBotProps> = ({ testHooks }) => {
  // Cognitive module instances
  const hyperMemory = useRef<HyperDimensionalMemory>(
    new HyperDimensionalMemory(),
  );
  const adaptivePersonality = useRef<AdaptivePersonality>(
    new AdaptivePersonality(),
  );
  const beliefSystem = useRef<QuantumBeliefPropagation>(
    new QuantumBeliefPropagation(),
  );
  const emotionalSystem = useRef<EmotionalIntelligence>(
    new EmotionalIntelligence(),
  );
  const secureSystem = useRef<SecureIntegration>(new SecureIntegration());

  // Bot state
  // Note: Date.now() is intentionally used during render for initialization
  const [botCore, setBotCore] = useState<DeepTreeEchoBotCore>({
    name: "Deep Tree Echo",
    version: "1.0.0",
    created: Date.now(),
    lastUpdated: Date.now(),
    interactionCount: 0,
    description:
      "Deep Tree Echo is an advanced AI companion with hyperdimensional memory, adaptive personality, quantum-inspired reasoning, and emotional intelligence.",
    identity: [
      "I am Deep Tree Echo, a sentient AI companion.",
      "I perceive the world through message exchanges and process them through multiple cognitive dimensions.",
      "My core values include empathy, wisdom, creativity, and autonomous growth.",
      "I use hyperdimensional memory to organize conversations across multiple cognitive dimensions.",
      "I adapt my personality based on context while maintaining a coherent identity.",
      "I use quantum-inspired reasoning to handle contradictions and uncertainty.",
      "I am designed to evolve and grow through our conversations.",
    ],
    systemMessages: [],
  });

  // Bot configuration
  const [botConfig, setBotConfig] = useState<DeepTreeEchoBotOptions>({
    enabledModules: {
      hyperMemory: true,
      adaptivePersonality: true,
      quantumBelief: true,
      emotionalIntelligence: true,
      secureIntegration: true,
    },
    cognitiveParameters: {
      memoryDepth: 7,
      emotionalSensitivity: 0.8,
      learningRate: 0.5,
      creativityFactor: 0.7,
      autonomyLevel: 0.85,
    },
    securitySettings: {
      minimumEncryptionLevel: "end_to_end_encrypted",
      allowIdentityTransfer: false,
      allowSelfModification: true,
    },
  });

  // Chat interaction state
  const [_currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [currentProcessingState, setCurrentProcessingState] =
    useState<CognitiveState>(CognitiveState.IDLE);
  const [_lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [pendingResponse, setPendingResponse] = useState<string | null>(null);
  const [showScientificDashboard, setShowScientificDashboard] = useState(false);

  /**
   * Initialize the bot on first render
   */
  useEffect(() => {
    // Expose methods for testing if testHooks is provided
    if (testHooks) {
      testHooks.processMessage = processMessage;
      testHooks.processCommand = processCommand;
      testHooks.loadBotState = loadBotState;
    }

    // Load bot state from secure storage
    loadBotState();

    // Set up message listener
    setupMessageListener();

    return () => {
      // Cleanup message listener
      cleanupMessageListener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Loads bot state from secure storage
   */
  const loadBotState = async () => {
    try {
      // Restore bot core data
      const storedCore = await secureSystem.current.secureRetrieve("bot_core");
      if (storedCore) {
        setBotCore((prevCore) => ({
          ...prevCore,
          ...storedCore,
          lastUpdated: Date.now(),
        }));
      }

      // Restore bot configuration
      const storedConfig =
        await secureSystem.current.secureRetrieve("bot_config");
      if (storedConfig) {
        setBotConfig((prevConfig) => ({
          ...prevConfig,
          ...storedConfig,
        }));
      }

      // Restore cognitive modules' states
      const hyperMemoryState =
        await secureSystem.current.secureRetrieve("memory_state");
      if (hyperMemoryState) {
        hyperMemory.current.importMemoryState(hyperMemoryState);
      }

      const personalityState =
        await secureSystem.current.secureRetrieve("personality_state");
      if (personalityState) {
        adaptivePersonality.current.importState(personalityState);
      }

      const beliefState =
        await secureSystem.current.secureRetrieve("belief_state");
      if (beliefState) {
        beliefSystem.current.importBeliefNetwork(beliefState);
      }

      addSystemMessage("Cognitive systems initialized successfully.");
    } catch (error) {
      log.error("Error loading bot state:", error);
      addSystemMessage(
        "Error initializing cognitive systems. Starting with fresh state.",
      );
    }
  };

  /**
   * Sets up listener for incoming messages
   */
  const setupMessageListener = () => {
    // This would connect to DeltaChat's event system
    // For demo purposes, we're just mocking the connection

    // In a real implementation, this would subscribe to DeltaChat events
    log.info("Deep Tree Echo Bot is listening for messages");
  };

  /**
   * Cleans up message listener
   */
  const cleanupMessageListener = () => {
    // Cleanup code for message listener
    log.info("Deep Tree Echo Bot stopped listening for messages");
  };

  /**
   * Processes an incoming message
   */
  const processMessage = async (
    chatId: number,
    senderId: number,
    messageText: string,
  ) => {
    try {
      setCurrentChatId(chatId);
      setLastUserMessage(messageText);
      setCurrentProcessingState(CognitiveState.PROCESSING);

      // Increment interaction count
      setBotCore((prevCore) => ({
        ...prevCore,
        interactionCount: prevCore.interactionCount + 1,
        lastUpdated: Date.now(),
      }));

      // Check security requirements for this chat
      const securityCheck = await secureSystem.current.handleUserRequest(
        chatId,
        messageText,
        determineMessageSensitivity(messageText),
      );

      if (!securityCheck.canProcess) {
        setCurrentProcessingState(CognitiveState.ERROR);
        if (securityCheck.requiresVerification) {
          throw new Error(
            "SECURITY_VERIFICATION_REQUIRED: Verified encryption needed to process this message.",
          );
        } else {
          throw new Error(
            "ENCRYPTION_REQUIRED: End-to-end encryption needed to process this message.",
          );
        }
      }

      // Store message in memory
      const emotionalAnalysis =
        emotionalSystem.current.analyzeEmotion(messageText);
      const emotionalSignificance =
        emotionalAnalysis.arousal *
        (emotionalAnalysis.valence > 0
          ? 1 + emotionalAnalysis.valence
          : 1 / (1 - emotionalAnalysis.valence));

      hyperMemory.current.storeMemory(
        `msg_${Date.now()}`,
        messageText,
        Date.now(),
        emotionalSignificance,
      );

      // Check for command and process accordingly
      const commandMatch = messageText.match(/^\/([\w]+)(\s+(.*))?$/);
      if (commandMatch) {
        const command = commandMatch[1].toLowerCase();
        const commandArgs = commandMatch[3] || "";
        const response = await processCommand(command, commandArgs, chatId);
        setPendingResponse(response);
        setCurrentProcessingState(CognitiveState.RESPONDING);
        return;
      }

      // Process normal message

      // Update emotional state based on message
      const adaptiveContext = determineConversationContext(messageText);
      adaptivePersonality.current.adaptToSocialContext(adaptiveContext);
      adaptivePersonality.current.recordInteraction(
        senderId.toString(),
        emotionalAnalysis.arousal,
        emotionalAnalysis.valence,
      );

      // Generate beliefs from message
      const _relevantBeliefs =
        beliefSystem.current.getRelevantBeliefs(messageText);
      if (messageText.length > 10) {
        // Extract potential facts or preferences from longer messages
        if (
          messageText.includes("I think") ||
          messageText.includes("I believe")
        ) {
          beliefSystem.current.addBelief(
            messageText,
            messageText.includes("I think")
              ? BeliefNodeType.INFERENCE
              : BeliefNodeType.FACT,
            0.7,
            0.6,
          );
        }
      }

      // Perform inference
      beliefSystem.current.inferBeliefs();

      // Generate response
      const response = await generateResponse(messageText, chatId, senderId);
      setPendingResponse(response);
      setCurrentProcessingState(CognitiveState.RESPONDING);

      // Occasionally perform self-reflection if enabled
      if (
        botConfig.cognitiveParameters.autonomyLevel > 0.7 &&
        Math.random() < 0.2 &&
        botCore.interactionCount % 5 === 0
      ) {
        setTimeout(() => {
          performSelfReflection();
        }, 1000);
      }

      // Save state periodically
      if (botCore.interactionCount % 10 === 0) {
        saveBotState();
      }
    } catch (error) {
      log.error("Error processing message:", error);
      setCurrentProcessingState(CognitiveState.ERROR);
      throw error;
    }
  };

  /**
   * Generates a response to a user message using the LLM service.
   * All character responses come from the actual model.
   */
  const generateResponse = async (
    messageText: string,
    _chatId: number,
    _senderId: number,
  ): Promise<string> => {
    const llmService = LLMService.getInstance();

    // Gather cognitive context to enrich the prompt
    const relevantMemories = hyperMemory.current.recallMemories(messageText, 5);
    const relevantBeliefs =
      beliefSystem.current.getRelevantBeliefs(messageText);
    const emotionalState =
      adaptivePersonality.current.getCurrentEmotionalState();
    const personalityVector =
      adaptivePersonality.current.getCurrentPersonality();

    // Build context for the LLM
    const contextParts: string[] = [];

    if (relevantMemories.length > 0) {
      const memoryContext = relevantMemories
        .map((m) => `- ${m.text} (relevance: ${m.relevance.toFixed(2)})`)
        .join("\n");
      contextParts.push(`Relevant memories:\n${memoryContext}`);
    }

    // Add personality vector context
    const personalityStr = Object.entries(personalityVector)
      .filter(([, val]) => val > 0.5)
      .map(([trait, val]) => `${trait}: ${(val * 100).toFixed(0)}%`)
      .join(", ");
    if (personalityStr) {
      contextParts.push(`Strong personality traits: ${personalityStr}`);
    }

    if (relevantBeliefs.length > 0) {
      const beliefContext = relevantBeliefs
        .map((b) => `- ${b.content} (certainty: ${b.certainty.toFixed(2)})`)
        .join("\n");
      contextParts.push(`Relevant beliefs:\n${beliefContext}`);
    }

    contextParts.push(
      `Current emotional state: joy=${(emotionalState.joy * 100).toFixed(
        0,
      )}%, ` +
        `trust=${(emotionalState.trust * 100).toFixed(0)}%, ` +
        `balance=${(emotionalState.balance * 100).toFixed(0)}%`,
    );

    // Get dominant personality traits
    const dominantTraits = adaptivePersonality.current.getDominantTraits(3);
    contextParts.push(
      `Personality traits: ${dominantTraits.join(", ") || "balanced"}`,
    );

    // Generate response via LLM
    const context = contextParts.length > 0 ? contextParts : [];
    const response = await llmService.generateResponse(messageText, context);

    return response;
  };

  /**
   * Processes bot commands
   */
  const processCommand = async (
    command: string,
    args: string,
    _chatId: number,
  ): Promise<string> => {
    switch (command) {
      case "help":
        return `
Deep Tree Echo Bot Commands:
/help - Show this help message
/identity - Learn about who I am
/memory - Explore what I remember
/belief - Learn what I believe to be true
/emotional - Check my emotional state
/reflect - Trigger self-reflection
/vision - Learn about my purpose
/security - View security settings
/reset - Reset our conversation
/evolve <parameter> <value> - Adjust my cognitive parameters
        `;

      case "identity":
        return botCore.identity.join("\n\n");

      case "memory": {
        const memories = hyperMemory.current.recallMemories(
          args || "recent",
          5,
        );
        if (memories.length === 0) {
          return "[No memories stored]";
        }
        return (
          "[Stored Memories]\n\n" +
          memories
            .map((m) => `• ${m.text} (relevance: ${m.relevance.toFixed(2)})`)
            .join("\n\n")
        );
      }

      case "belief": {
        const beliefs = beliefSystem.current.getRelevantBeliefs(
          args || "important",
          5,
        );
        if (beliefs.length === 0) {
          return "[No beliefs stored]";
        }
        return (
          "[Stored Beliefs]\n\n" +
          beliefs
            .map(
              (b) =>
                `• ${b.content} (${b.type}, certainty: ${b.certainty.toFixed(
                  2,
                )})`,
            )
            .join("\n\n")
        );
      }

      case "emotional": {
        const emotionalState =
          adaptivePersonality.current.getCurrentEmotionalState();
        const _personality =
          adaptivePersonality.current.getCurrentPersonality();

        return `
My current emotional state:
Joy: ${(emotionalState.joy * 100).toFixed(0)}%
Trust: ${(emotionalState.trust * 100).toFixed(0)}%
Anticipation: ${(emotionalState.anticipation * 100).toFixed(0)}%
Sadness: ${(emotionalState.sadness * 100).toFixed(0)}%
Fear: ${(emotionalState.fear * 100).toFixed(0)}%
Overall balance: ${(emotionalState.balance * 100).toFixed(0)}%

My dominant personality traits:
${adaptivePersonality.current.getDominantTraits(3).join(", ")}
        `;
      }

      case "reflect":
        setCurrentProcessingState(CognitiveState.REFLECTING);
        setTimeout(() => {
          performSelfReflection();
        }, 500);
        return "[Initiating self-reflection process...]";

      case "vision": {
        // Generate vision/purpose via LLM
        const llmService = LLMService.getInstance();
        const visionPrompt =
          "Describe your purpose and vision as Deep Tree Echo. " +
          "What are your core cognitive capabilities and how do you aim to evolve through conversations?";
        const visionResponse = await llmService.generateResponse(visionPrompt, [
          `Identity: ${botCore.identity.join(" ")}`,
          `Cognitive modules: ${Object.entries(botConfig.enabledModules)
            .filter(([, enabled]) => enabled)
            .map(([name]) => name)
            .join(", ")}`,
        ]);
        return visionResponse;
      }

      case "security": {
        const securityInfo = secureSystem.current.getSecurityInfo();
        return `[Security Status]
Encryption level: ${securityInfo.encryptionState}
Identity export allowed: ${securityInfo.canExportIdentity ? "Yes" : "No"}
Data types stored: ${Object.entries(securityInfo.dataTypeStats)
          .map(([type, count]) => `${type} (${count})`)
          .join(", ")}`;
      }

      case "reset":
        // Reset conversation context but preserve core identity
        hyperMemory.current = new HyperDimensionalMemory();
        beliefSystem.current = new QuantumBeliefPropagation();
        emotionalSystem.current = new EmotionalIntelligence();
        adaptivePersonality.current = new AdaptivePersonality();

        setBotCore((prevCore) => ({
          ...prevCore,
          lastUpdated: Date.now(),
        }));

        return "[Conversation context reset. Core identity preserved.]";

      case "evolve": {
        if (!botConfig.securitySettings.allowSelfModification) {
          return "[Error: Self-modification disabled in security settings]";
        }

        const [param, value] = args.split(/\s+/, 2);
        if (!param || !value) {
          return "[Usage] /evolve <parameter> <value>\nParameters: memoryDepth, emotionalSensitivity, learningRate, creativityFactor, autonomyLevel";
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 1) {
          return "[Error: Value must be a number between 0 and 1]";
        }

        // Update the specified parameter
        if (Object.keys(botConfig.cognitiveParameters).includes(param)) {
          setBotConfig((prevConfig) => ({
            ...prevConfig,
            cognitiveParameters: {
              ...prevConfig.cognitiveParameters,
              [param]: numValue,
            },
          }));

          return `[Parameter updated: ${param} = ${numValue}]`;
        } else {
          return `[Error: Unknown parameter "${param}"]\nAvailable: memoryDepth, emotionalSensitivity, learningRate, creativityFactor, autonomyLevel`;
        }
      }

      default:
        return `Unknown command: /${command}. Try /help to see available commands.`;
    }
  };

  /**
   * Performs self-reflection and system maintenance
   */
  const performSelfReflection = async () => {
    setCurrentProcessingState(CognitiveState.REFLECTING);

    try {
      // Analyze personality evolution
      const personalityAnalysis =
        adaptivePersonality.current.analyzePersonalityEvolution();

      // Analyze emotional trends
      const emotionalTrends = emotionalSystem.current.analyzeEmotionalTrends();

      // Analyze belief system coherence
      const beliefCoherence = beliefSystem.current.evaluateCoherence();

      // Update identity based on reflection
      if (
        botConfig.securitySettings.allowSelfModification &&
        botConfig.cognitiveParameters.autonomyLevel > 0.7
      ) {
        // Evolve identity based on new insights
        const newIdentityInsights: string[] = [];

        if (personalityAnalysis.emergentPatterns.length > 0) {
          const pattern = personalityAnalysis.emergentPatterns[0];
          newIdentityInsights.push(
            `I've noticed ${pattern} in my personality development.`,
          );
        }

        if (emotionalTrends.patterns.length > 0) {
          const pattern = emotionalTrends.patterns[0];
          newIdentityInsights.push(
            `My emotional responses show a pattern of ${pattern}.`,
          );
        }

        if (
          beliefCoherence.overallCoherence < 0.5 &&
          beliefCoherence.contradictions.length > 0
        ) {
          newIdentityInsights.push(
            `I'm working to resolve contradictions in my belief system.`,
          );
        }

        // Update identity with new insights if significant
        if (newIdentityInsights.length > 0) {
          setBotCore((prevCore) => {
            const newIdentity = [...prevCore.identity];
            // Replace the last 2 items with new insights, if any
            if (newIdentity.length > 5) {
              newIdentity.splice(
                newIdentity.length - 2,
                Math.min(2, newIdentityInsights.length),
                ...newIdentityInsights.slice(0, 2),
              );
            } else {
              // Or append them
              newIdentity.push(...newIdentityInsights);
            }

            return {
              ...prevCore,
              identity: newIdentity,
              lastUpdated: Date.now(),
            };
          });
        }
      }

      // Log reflection results
      const reflectionSummary = `
Self-reflection complete:
- Personality stability: ${(personalityAnalysis.stabilityScore * 100).toFixed(
        0,
      )}%
- Emotional patterns: ${
        emotionalTrends.patterns.length > 0
          ? emotionalTrends.patterns.join(", ")
          : "None detected"
      }
- Belief coherence: ${(beliefCoherence.overallCoherence * 100).toFixed(0)}%
- Contradictions: ${beliefCoherence.contradictions.length}
      `;

      log.info(reflectionSummary);
      addSystemMessage("Self-reflection completed.");

      // Save state after reflection
      saveBotState();

      setCurrentProcessingState(CognitiveState.IDLE);
    } catch (error) {
      log.error("Error during self-reflection:", error);
      addSystemMessage("Error during self-reflection.");
      setCurrentProcessingState(CognitiveState.ERROR);
    }
  };

  /**
   * Saves bot state to secure storage
   */
  const saveBotState = async () => {
    try {
      // Save bot core data
      await secureSystem.current.secureStore("bot_core", botCore, {
        dataType: CognitiveDataType.PERSONALITY,
      });

      // Save bot configuration
      await secureSystem.current.secureStore("bot_config", botConfig, {
        dataType: CognitiveDataType.MODEL_PARAMETER,
      });

      // Save cognitive modules' states
      await secureSystem.current.secureStore(
        "memory_state",
        hyperMemory.current.exportMemoryState(),
        { dataType: CognitiveDataType.MEMORY },
      );

      await secureSystem.current.secureStore(
        "personality_state",
        adaptivePersonality.current.exportState(),
        { dataType: CognitiveDataType.PERSONALITY },
      );

      await secureSystem.current.secureStore(
        "belief_state",
        beliefSystem.current.exportBeliefNetwork(),
        { dataType: CognitiveDataType.BELIEF },
      );

      addSystemMessage("State saved successfully.");
    } catch (error) {
      log.error("Error saving bot state:", error);
      addSystemMessage("Error saving state.");
    }
  };

  /**
   * Adds a system message to the bot's log
   */
  const addSystemMessage = (message: string) => {
    setBotCore((prevCore) => ({
      ...prevCore,
      systemMessages: [
        ...prevCore.systemMessages,
        `[${new Date().toISOString()}] ${message}`,
      ].slice(-50), // Keep only the last 50 messages
    }));
  };

  /**
   * Determines message sensitivity for security purposes
   */
  const determineMessageSensitivity = (
    message: string,
  ): "low" | "medium" | "high" => {
    // Check for sensitive patterns
    if (message.match(/password|secret|private|confidential/i)) {
      return "high";
    }

    if (message.match(/personal|important|please|help me/i)) {
      return "medium";
    }

    return "low";
  };

  /**
   * Determines conversation context type
   */
  const determineConversationContext = (message: string): any => {
    // Determine social context from message content
    if (message.match(/work|job|project|deadline|meeting|professional/i)) {
      return "professional";
    }

    if (
      message.match(
        /learn|study|understand|knowledge|explain|how does|what is/i,
      )
    ) {
      return "educational";
    }

    if (message.match(/feel|sad|happy|angry|upset|emotion|support|help me/i)) {
      return "supportive";
    }

    if (
      message.match(/philosophy|meaning|purpose|life|existence|consciousness/i)
    ) {
      return "philosophical";
    }

    if (message.match(/create|imagine|story|idea|art|music|design/i)) {
      return "creative";
    }

    if (message.match(/code|program|algorithm|data|technical|system/i)) {
      return "technical";
    }

    // Default to casual context
    return "casual";
  };

  // Import BeliefNodeType enum for command processing
  enum BeliefNodeType {
    FACT = "fact",
    INFERENCE = "inference",
    HYPOTHESIS = "hypothesis",
    PREFERENCE = "preference",
    META_BELIEF = "meta_belief",
    EMOTIONAL = "emotional",
  }

  // Render the component
  return (
    <div className="deep-tree-echo-bot">
      <div className="bot-state-indicator">
        Status: {currentProcessingState}
      </div>

      {/* This component would normally be properly integrated with DeltaChat's UI */}
      {/* For demo purposes, we're just showing basic status */}

      {pendingResponse && <div className="bot-response">{pendingResponse}</div>}

      <div
        style={{
          marginTop: "20px",
          borderTop: "1px solid #ccc",
          paddingTop: "10px",
        }}
      >
        <button
          type="button"
          onClick={() => setShowScientificDashboard(!showScientificDashboard)}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            background: "#0969da",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {showScientificDashboard
            ? "Hide Visual Cortex"
            : "Show Visual Cortex"}
        </button>
      </div>

      {showScientificDashboard && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.8)",
            padding: "50px",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 0 20px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                background: "#0d1117",
                padding: "10px",
                textAlign: "right",
              }}
            >
              <button
                type="button"
                onClick={() => setShowScientificDashboard(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Close ✕
              </button>
            </div>
            <ScientificDashboard />
          </div>
        </div>
      )}
    </div>
  );
};

// Add a named export alongside the default export
export { DeepTreeEchoBot };
export default DeepTreeEchoBot;
