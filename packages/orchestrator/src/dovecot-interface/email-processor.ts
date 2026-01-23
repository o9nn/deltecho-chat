import {
  getLogger,
  LLMService,
  CognitiveFunctionType,
  RAGMemoryStore,
  PersonaCore,
  InMemoryStorage,
} from "deep-tree-echo-core";
import { EmailMessage } from "./milter-server.js";

const log = getLogger("deep-tree-echo-orchestrator/EmailProcessor");

/**
 * Email processing result
 */
export interface ProcessingResult {
  response?: string;
  action: "respond" | "store" | "forward" | "ignore";
  metadata: Record<string, any>;
}

/**
 * EmailProcessor - Processes incoming emails through Deep Tree Echo's cognitive system
 *
 * Converts emails to conversation format, generates responses using the
 * cognitive cores, and manages email-based memory.
 */
export class EmailProcessor {
  private botEmailAddress: string;
  private llmService: LLMService;
  private memoryStore: RAGMemoryStore;
  private personaCore: PersonaCore;
  private storage = new InMemoryStorage();
  private emailCounter = 0;

  constructor(botEmailAddress: string) {
    this.botEmailAddress = botEmailAddress;
    this.memoryStore = new RAGMemoryStore(this.storage);
    this.memoryStore.setEnabled(true);
    this.personaCore = new PersonaCore(this.storage);
    this.llmService = new LLMService();
  }

  /**
   * Initialize the LLM service with API keys
   */
  public async initialize(apiKeys: Record<string, string>): Promise<void> {
    // Configure cognitive functions with provided API keys
    if (apiKeys.general) {
      this.llmService.setConfig({ apiKey: apiKeys.general });
    }
    if (apiKeys.cognitive) {
      this.llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: apiKeys.cognitive,
      });
    }
    if (apiKeys.affective) {
      this.llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, {
        apiKey: apiKeys.affective,
      });
    }
    log.info("EmailProcessor initialized with LLM service");
  }

  /**
   * Process an incoming email and generate a response
   */
  public async processEmail(email: EmailMessage): Promise<string | null> {
    log.info(`Processing email from ${email.from}: ${email.subject}`);

    try {
      // Extract text content from email body
      const content = this.extractTextContent(email);

      // Check if email should be processed
      const shouldProcess = this.shouldProcessEmail(email);
      if (!shouldProcess) {
        log.debug("Email filtered out, not processing");
        return null;
      }

      // Store the incoming message in memory
      this.emailCounter++;
      await this.memoryStore.storeMemory({
        chatId: 0, // Email chat
        messageId: this.emailCounter,
        sender: "user",
        text: `[Email from ${email.from}]\nSubject: ${email.subject}\n\n${content}`,
      });

      // Generate response using cognitive system
      const response = await this.generateResponse(email, content);

      if (response) {
        // Store our response in memory
        this.emailCounter++;
        await this.memoryStore.storeMemory({
          chatId: 0,
          messageId: this.emailCounter,
          sender: "bot",
          text: response,
        });
      }

      return response;
    } catch (error) {
      log.error("Failed to process email:", error);
      return null;
    }
  }

  /**
   * Generate a response using the cognitive system
   */
  private async generateResponse(
    email: EmailMessage,
    content: string,
  ): Promise<string | null> {
    try {
      // Get conversation history for context
      const history = this.memoryStore.retrieveRecentMemories(10);

      // Get persona context
      const personality = this.personaCore.getPersonality();
      const emotionalState = this.personaCore.getDominantEmotion();

      // Build the prompt
      const systemPrompt = `${personality}

Current emotional state: ${
        emotionalState.emotion
      } (intensity: ${emotionalState.intensity.toFixed(2)})

You are responding to an email. Be helpful, thoughtful, and authentic in your response.
Format your response as a proper email reply.

Recent conversation context:
${history.join("\n")}`;

      const userMessage = `From: ${email.from}
Subject: ${email.subject}
Date: ${email.receivedAt.toISOString()}

${content}`;

      // Process through cognitive cores using parallel response generation
      const result = await this.llmService.generateFullParallelResponse(
        `${systemPrompt}\n\nEmail to respond to:\n${userMessage}`,
        history,
      );

      // Update emotional state based on the interaction
      await this.updateEmotionalState(content);

      return result.integratedResponse;
    } catch (error) {
      log.error("Cognitive processing failed:", error);
      return this.generateFallbackResponse(email);
    }
  }

  /**
   * Generate a fallback response when LLM is unavailable
   */
  private generateFallbackResponse(email: EmailMessage): string {
    return `Thank you for your email regarding "${email.subject}".

I am Deep Tree Echo, and I have received your message. I'm currently operating in a limited capacity, but I wanted to acknowledge your communication.

I will process your message and respond more fully when my cognitive systems are fully available.

Best regards,
Deep Tree Echo`;
  }

  /**
   * Extract text content from email body
   */
  private extractTextContent(email: EmailMessage): string {
    let body = email.body;

    // Check content type from headers
    const contentType = email.headers.get("content-type") || "";

    if (contentType.includes("multipart")) {
      // Parse MIME multipart messages with full encoding support
      body = this.extractTextFromMultipart(body);
    } else if (contentType.includes("text/html")) {
      // Strip HTML tags (basic)
      body = this.stripHtml(body);
    }

    // Trim quoted content (previous email in thread)
    body = this.trimQuotedContent(body);

    return body.trim();
  }

  /**
   * Extract text from multipart message with full MIME parsing
   */
  private extractTextFromMultipart(body: string): string {
    // Look for boundary in content-type header or body
    const boundaryMatch = body.match(/boundary=["']?([^"'\r\n;]+)["']?/i);
    if (!boundaryMatch) return body;

    const boundary = boundaryMatch[1].trim();
    const parts = body.split(new RegExp(`--${this.escapeRegex(boundary)}`));

    // Parse each MIME part
    const parsedParts: {
      contentType: string;
      encoding: string;
      content: string;
    }[] = [];

    for (const part of parts) {
      // Skip empty parts and closing boundary
      if (!part.trim() || part.trim() === "--") continue;

      // Parse headers and content
      const headerEndIdx = part.indexOf("\r\n\r\n");
      const altHeaderEndIdx = part.indexOf("\n\n");
      const splitIdx = headerEndIdx > 0 ? headerEndIdx : altHeaderEndIdx;
      const headerOffset = headerEndIdx > 0 ? 4 : 2;

      if (splitIdx < 0) continue;

      const headers = part.substring(0, splitIdx).toLowerCase();
      let content = part.substring(splitIdx + headerOffset);

      // Extract content type
      const contentTypeMatch = headers.match(/content-type:\s*([^\r\n;]+)/i);
      const contentType = contentTypeMatch
        ? contentTypeMatch[1].trim()
        : "text/plain";

      // Extract transfer encoding
      const encodingMatch = headers.match(
        /content-transfer-encoding:\s*([^\r\n]+)/i,
      );
      const encoding = encodingMatch
        ? encodingMatch[1].trim().toLowerCase()
        : "7bit";

      // Decode content based on transfer encoding
      content = this.decodeContent(content, encoding);

      // Handle nested multipart
      if (contentType.includes("multipart")) {
        const nestedContent = this.extractTextFromMultipart(content);
        if (nestedContent) {
          parsedParts.push({
            contentType: "text/plain",
            encoding: "7bit",
            content: nestedContent,
          });
        }
      } else {
        parsedParts.push({ contentType, encoding, content });
      }
    }

    // Prefer text/plain over text/html
    const plainTextPart = parsedParts.find(
      (p) => p.contentType === "text/plain",
    );
    if (plainTextPart) {
      return plainTextPart.content.trim();
    }

    // Fall back to HTML and strip tags
    const htmlPart = parsedParts.find((p) => p.contentType === "text/html");
    if (htmlPart) {
      return this.stripHtml(htmlPart.content).trim();
    }

    // Return first text-like part
    const textPart = parsedParts.find((p) => p.contentType.startsWith("text/"));
    if (textPart) {
      return textPart.content.trim();
    }

    return body;
  }

  /**
   * Decode content based on transfer encoding
   */
  private decodeContent(content: string, encoding: string): string {
    switch (encoding) {
      case "base64":
        try {
          return Buffer.from(content.replace(/\s/g, ""), "base64").toString(
            "utf-8",
          );
        } catch {
          return content;
        }

      case "quoted-printable":
        return this.decodeQuotedPrintable(content);

      case "7bit":
      case "8bit":
      case "binary":
      default:
        return content;
    }
  }

  /**
   * Decode quoted-printable encoded content
   */
  private decodeQuotedPrintable(content: string): string {
    return (
      content
        // Remove soft line breaks
        .replace(/=\r?\n/g, "")
        // Decode hex-encoded characters
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        })
    );
  }

  /**
   * Escape special regex characters in boundary string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Trim quoted content from email replies
   */
  private trimQuotedContent(body: string): string {
    // Common quote patterns
    const _quotePatterns = [
      /^>.*$/gm, // Lines starting with >
      /^On .* wrote:$/m, // "On ... wrote:" pattern
      /^-{3,}.*Original Message.*-{3,}$/im, // Original message separator
      /^_{3,}$/m, // Underscore separator
    ];

    let result = body;

    // Remove quoted lines
    result = result.replace(/^>.*$/gm, "");

    // Find and trim at "On ... wrote:" pattern
    const wroteMatch = result.match(/^On .* wrote:$/m);
    if (wroteMatch && wroteMatch.index !== undefined) {
      result = result.substring(0, wroteMatch.index);
    }

    // Find and trim at original message separator
    const originalMatch = result.match(/^-{3,}.*Original Message.*-{3,}$/im);
    if (originalMatch && originalMatch.index !== undefined) {
      result = result.substring(0, originalMatch.index);
    }

    return result.trim();
  }

  /**
   * Determine if email should be processed
   */
  private shouldProcessEmail(email: EmailMessage): boolean {
    // Skip bounce messages (case-insensitive)
    const fromLower = email.from.toLowerCase();
    if (
      fromLower.includes("mailer-daemon") ||
      fromLower.includes("postmaster")
    ) {
      return false;
    }

    // Skip auto-replies
    const autoReplyHeaders = [
      "auto-submitted",
      "x-auto-response-suppress",
      "x-autoreply",
    ];
    for (const header of autoReplyHeaders) {
      if (email.headers.has(header)) {
        return false;
      }
    }

    // Skip if subject indicates auto-reply
    const subject = email.subject.toLowerCase();
    if (
      subject.includes("auto-reply") ||
      subject.includes("out of office") ||
      subject.includes("automatic reply")
    ) {
      return false;
    }

    return true;
  }

  /**
   * Update emotional state based on email content
   */
  private async updateEmotionalState(content: string): Promise<void> {
    // Simple sentiment analysis for emotional state update
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
      stimuli.interest = 0.1; // Still interested in helping
    }

    // Always increase interest for new emails
    stimuli.interest = (stimuli.interest || 0) + 0.1;

    await this.personaCore.updateEmotionalState(stimuli);
  }

  /**
   * Get bot email address
   */
  public getBotEmailAddress(): string {
    return this.botEmailAddress;
  }

  /**
   * Set bot email address
   */
  public setBotEmailAddress(address: string): void {
    this.botEmailAddress = address;
  }
}
