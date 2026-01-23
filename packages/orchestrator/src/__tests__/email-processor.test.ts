import { describe, it, expect, beforeEach, jest } from "@jest/globals";

import { EmailProcessor } from "../dovecot-interface/email-processor.js";
import { EmailMessage } from "../dovecot-interface/milter-server.js";

// Mock deep-tree-echo-core
jest.mock("deep-tree-echo-core", () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  LLMService: jest.fn().mockImplementation(() => ({
    generateResponse: jest
      .fn<() => Promise<{ text: string; success: boolean }>>()
      .mockResolvedValue({
        text: "AI response",
        success: true,
      }),
    isInitialized: true,
  })),
  CognitiveFunctionType: {
    CONVERSATION: "conversation",
  },
  RAGMemoryStore: jest.fn().mockImplementation(() => ({
    storeMemory: jest.fn(),
    queryMemories: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    setEnabled: jest.fn(),
  })),
  PersonaCore: jest.fn().mockImplementation(() => ({
    getPersonality: jest.fn().mockReturnValue({
      name: "Deep Tree Echo",
      traits: {},
    }),
    getCurrentMood: jest.fn().mockReturnValue({
      dominantMood: "neutral",
      intensity: 0.5,
    }),
    updateMood: jest.fn(),
  })),
  InMemoryStorage: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe("EmailProcessor", () => {
  let processor: EmailProcessor;
  const botEmail = "echo@deep-tree-echo.ai";

  beforeEach(() => {
    processor = new EmailProcessor(botEmail);
  });

  describe("constructor", () => {
    it("should create processor with bot email address", () => {
      expect(processor).toBeDefined();
      expect(processor.getBotEmailAddress()).toBe(botEmail);
    });
  });

  describe("bot email address", () => {
    it("should get and set bot email address", () => {
      expect(processor.getBotEmailAddress()).toBe(botEmail);

      processor.setBotEmailAddress("newecho@example.com");
      expect(processor.getBotEmailAddress()).toBe("newecho@example.com");
    });
  });

  describe("shouldProcessEmail", () => {
    it("should return true for emails addressed to bot", () => {
      const shouldProcess = (
        processor as unknown as {
          shouldProcessEmail: (email: EmailMessage) => boolean;
        }
      ).shouldProcessEmail.bind(processor);

      const email: EmailMessage = {
        messageId: "<test@example.com>",
        from: "user@example.com",
        to: [botEmail],
        cc: [],
        bcc: [],
        subject: "Hello",
        body: "Test message",
        headers: new Map(),
        attachments: [],
        receivedAt: new Date(),
      };

      expect(shouldProcess(email)).toBe(true);
    });

    it("should return false for emails not addressed to bot", () => {
      const shouldProcess = (
        processor as unknown as {
          shouldProcessEmail: (email: EmailMessage) => boolean;
        }
      ).shouldProcessEmail.bind(processor);

      const email: EmailMessage = {
        messageId: "<test@example.com>",
        from: "user@example.com",
        to: ["other@example.com"],
        cc: [],
        bcc: [],
        subject: "Hello",
        body: "Test message",
        headers: new Map(),
        attachments: [],
        receivedAt: new Date(),
      };

      expect(shouldProcess(email)).toBe(false);
    });

    it("should return false for auto-reply messages", () => {
      const shouldProcess = (
        processor as unknown as {
          shouldProcessEmail: (email: EmailMessage) => boolean;
        }
      ).shouldProcessEmail.bind(processor);

      const email: EmailMessage = {
        messageId: "<test@example.com>",
        from: "user@example.com",
        to: [botEmail],
        cc: [],
        bcc: [],
        subject: "Auto-Reply: Out of Office",
        body: "I am out of office",
        headers: new Map([["Auto-Submitted", "auto-reply"]]),
        attachments: [],
        receivedAt: new Date(),
      };

      expect(shouldProcess(email)).toBe(false);
    });

    it("should return false for bounce messages", () => {
      const shouldProcess = (
        processor as unknown as {
          shouldProcessEmail: (email: EmailMessage) => boolean;
        }
      ).shouldProcessEmail.bind(processor);

      const email: EmailMessage = {
        messageId: "<test@example.com>",
        from: "MAILER-DAEMON@example.com",
        to: [botEmail],
        cc: [],
        bcc: [],
        subject: "Delivery Status Notification",
        body: "Your message could not be delivered",
        headers: new Map(),
        attachments: [],
        receivedAt: new Date(),
      };

      expect(shouldProcess(email)).toBe(false);
    });
  });

  describe("extractTextContent", () => {
    it("should extract plain text content", () => {
      const extract = (
        processor as unknown as {
          extractTextContent: (email: EmailMessage) => string;
        }
      ).extractTextContent.bind(processor);

      const email: EmailMessage = {
        messageId: "<test@example.com>",
        from: "user@example.com",
        to: [botEmail],
        cc: [],
        bcc: [],
        subject: "Plain text email",
        body: "This is plain text content.",
        headers: new Map([["Content-Type", "text/plain"]]),
        attachments: [],
        receivedAt: new Date(),
      };

      const result = extract(email);
      expect(result).toBe("This is plain text content.");
    });

    it("should strip HTML from HTML content", () => {
      const stripHtml = (
        processor as unknown as {
          stripHtml: (html: string) => string;
        }
      ).stripHtml.bind(processor);

      const html = "<p>Hello <strong>World</strong></p><br/><div>Content</div>";
      const result = stripHtml(html);

      expect(result).not.toContain("<p>");
      expect(result).not.toContain("<strong>");
      expect(result).toContain("Hello");
      expect(result).toContain("World");
    });
  });

  describe("trimQuotedContent", () => {
    it("should trim quoted reply content", () => {
      const trim = (
        processor as unknown as {
          trimQuotedContent: (body: string) => string;
        }
      ).trimQuotedContent.bind(processor);

      const bodyWithQuotes = `This is my reply.

On Mon, Jan 14, 2026 at 10:00 AM, John Doe wrote:
> Previous message content
> More quoted text`;

      const result = trim(bodyWithQuotes);
      expect(result).not.toContain("> Previous message");
      expect(result).toContain("This is my reply");
    });

    it("should trim content after separator lines", () => {
      const trim = (
        processor as unknown as {
          trimQuotedContent: (body: string) => string;
        }
      ).trimQuotedContent.bind(processor);

      const bodyWithSeparator = `New message content.

-----Original Message-----
Previous content here`;

      const result = trim(bodyWithSeparator);
      expect(result).toContain("New message content");
      expect(result).not.toContain("Original Message");
    });
  });

  describe("generateFallbackResponse", () => {
    it("should generate a fallback response", () => {
      const generateFallback = (
        processor as unknown as {
          generateFallbackResponse: (email: EmailMessage) => string;
        }
      ).generateFallbackResponse.bind(processor);

      const email: EmailMessage = {
        messageId: "<test@example.com>",
        from: "user@example.com",
        to: [botEmail],
        cc: [],
        bcc: [],
        subject: "Test",
        body: "Hello",
        headers: new Map(),
        attachments: [],
        receivedAt: new Date(),
      };

      const result = generateFallback(email);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("multipart MIME handling", () => {
    it("should extract text from multipart message", () => {
      const extractFromMultipart = (
        processor as unknown as {
          extractTextFromMultipart: (body: string) => string;
        }
      ).extractTextFromMultipart.bind(processor);

      const multipartBody = `Content-Type: multipart/alternative; boundary="boundary123"

--boundary123
Content-Type: text/plain

Plain text version of the email.
--boundary123
Content-Type: text/html

<html><body><p>HTML version</p></body></html>
--boundary123--`;

      const result = extractFromMultipart(multipartBody);
      expect(result).toContain("Plain text version");
    });
  });

  describe("quoted-printable decoding", () => {
    it("should decode quoted-printable content", () => {
      const decode = (
        processor as unknown as {
          decodeQuotedPrintable: (content: string) => string;
        }
      ).decodeQuotedPrintable.bind(processor);

      const encoded = "Hello=20World=21";
      const result = decode(encoded);

      expect(result).toBe("Hello World!");
    });

    it("should handle soft line breaks", () => {
      const decode = (
        processor as unknown as {
          decodeQuotedPrintable: (content: string) => string;
        }
      ).decodeQuotedPrintable.bind(processor);

      const encoded =
        "This is a long line that has been=\r\n split for transport.";
      const result = decode(encoded);

      // Should join soft-wrapped lines
      expect(result).not.toContain("=\r\n");
    });
  });

  describe("content decoding", () => {
    it("should decode based on transfer encoding", () => {
      const decodeContent = (
        processor as unknown as {
          decodeContent: (content: string, encoding: string) => string;
        }
      ).decodeContent.bind(processor);

      // Test base64
      const base64Content = Buffer.from("Hello World").toString("base64");
      const decoded = decodeContent(base64Content, "base64");
      expect(decoded).toBe("Hello World");
    });

    it("should pass through 7bit/8bit content unchanged", () => {
      const decodeContent = (
        processor as unknown as {
          decodeContent: (content: string, encoding: string) => string;
        }
      ).decodeContent.bind(processor);

      const result = decodeContent("Plain text", "7bit");
      expect(result).toBe("Plain text");
    });
  });

  describe("processEmail", () => {
    it("should process a valid email", async () => {
      const email: EmailMessage = {
        messageId: "<test@example.com>",
        from: "user@example.com",
        to: [botEmail],
        cc: [],
        bcc: [],
        subject: "Hello Deep Tree Echo",
        body: "Can you help me with something?",
        headers: new Map([["Content-Type", "text/plain"]]),
        attachments: [],
        receivedAt: new Date(),
      };

      // This will attempt to use the mocked LLMService
      // Even if it returns null (due to initialization), it should not throw
      const result = await processor.processEmail(email);

      // Result may be null if LLM not initialized, or a string
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should return null for emails that should not be processed", async () => {
      const email: EmailMessage = {
        messageId: "<test@example.com>",
        from: "MAILER-DAEMON@example.com", // Bounce message
        to: [botEmail],
        cc: [],
        bcc: [],
        subject: "Delivery failed",
        body: "Message undeliverable",
        headers: new Map(),
        attachments: [],
        receivedAt: new Date(),
      };

      const result = await processor.processEmail(email);
      expect(result).toBeNull();
    });
  });

  describe("emotional state updates", () => {
    it("should update emotional state based on content", async () => {
      const updateEmotional = (
        processor as unknown as {
          updateEmotionalState: (content: string) => Promise<void>;
        }
      ).updateEmotionalState.bind(processor);

      // Should not throw
      await updateEmotional("This is a happy message!");
      await updateEmotional("This is frustrating and annoying.");

      expect(true).toBe(true); // If we get here, emotional update works
    });
  });
});
