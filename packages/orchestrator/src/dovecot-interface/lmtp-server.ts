import { getLogger } from "deep-tree-echo-core";
import * as net from "net";
import * as fs from "fs";
import { EmailMessage, EmailAttachment } from "./milter-server.js";

const log = getLogger("deep-tree-echo-orchestrator/LMTPServer");

/**
 * LMTP server configuration
 */
export interface LMTPConfig {
  socketPath: string;
  allowedDomains: string[];
  timeout?: number;
  maxMessageSize?: number;
}

/**
 * LMTP session state
 */
interface LMTPSession {
  mailFrom: string;
  rcptTo: string[];
  data: string[];
  inData: boolean;
}

/**
 * LMTPServer - Implements the Local Mail Transfer Protocol for Dovecot integration
 *
 * LMTP (RFC 2033) is used for local mail delivery within a mail system.
 * This allows Deep Tree Echo to:
 * - Receive mail directly from Dovecot's LDA
 * - Process messages before final delivery
 * - Store messages in its own format
 */
export class LMTPServer {
  private config: LMTPConfig;
  private server?: net.Server;
  private connections: Map<net.Socket, LMTPSession> = new Map();
  private listeners: Map<string, Array<(data: any) => void | Promise<void>>> =
    new Map();

  constructor(config: LMTPConfig) {
    this.config = {
      timeout: 60000,
      maxMessageSize: 50 * 1024 * 1024, // 50MB
      ...config,
    };
  }

  /**
   * Start the LMTP server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clean up existing socket file if it exists
      if (
        this.config.socketPath.startsWith("/") &&
        fs.existsSync(this.config.socketPath)
      ) {
        fs.unlinkSync(this.config.socketPath);
      }

      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on("error", (error) => {
        log.error("LMTP server error:", error);
        reject(error);
      });

      if (this.config.socketPath.startsWith("/")) {
        // Unix socket
        this.server.listen(this.config.socketPath, () => {
          log.info(
            `LMTP server listening on Unix socket: ${this.config.socketPath}`,
          );
          fs.chmodSync(this.config.socketPath, 0o660);
          resolve();
        });
      } else {
        // TCP socket
        const [host, portStr] = this.config.socketPath.split(":");
        const port = parseInt(portStr, 10) || 24;
        this.server.listen(port, host || "127.0.0.1", () => {
          log.info(`LMTP server listening on ${host || "127.0.0.1"}:${port}`);
          resolve();
        });
      }
    });
  }

  /**
   * Stop the LMTP server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.connections.forEach((_session, socket) => {
        socket.destroy();
      });
      this.connections.clear();

      if (this.server) {
        this.server.close(() => {
          log.info("LMTP server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new LMTP connection
   */
  private handleConnection(socket: net.Socket): void {
    const session: LMTPSession = {
      mailFrom: "",
      rcptTo: [],
      data: [],
      inData: false,
    };
    this.connections.set(socket, session);

    // Send greeting
    this.send(socket, "220 deep-tree-echo.local LMTP Deep Tree Echo ready");

    let buffer = "";

    socket.on("data", (data) => {
      buffer += data.toString("utf8");

      // Process complete lines
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.substring(0, newlineIndex);
        buffer = buffer.substring(newlineIndex + 2);

        this.handleLine(socket, session, line);
      }
    });

    socket.on("close", () => {
      this.connections.delete(socket);
      log.debug("LMTP connection closed");
    });

    socket.on("error", (error) => {
      log.error("LMTP connection error:", error);
      this.connections.delete(socket);
    });

    socket.setTimeout(this.config.timeout!, () => {
      this.send(socket, "421 Connection timeout");
      socket.end();
    });
  }

  /**
   * Handle a line of LMTP input
   */
  private handleLine(
    socket: net.Socket,
    session: LMTPSession,
    line: string,
  ): void {
    // If in DATA mode
    if (session.inData) {
      if (line === ".") {
        // End of DATA
        session.inData = false;
        this.processMessage(socket, session);
      } else {
        // Remove dot-stuffing
        const dataLine = line.startsWith(".") ? line.substring(1) : line;
        session.data.push(dataLine);
      }
      return;
    }

    const command = line.substring(0, 4).toUpperCase();
    const args = line.substring(5).trim();

    switch (command) {
      case "LHLO":
        this.handleLhlo(socket, args);
        break;
      case "MAIL":
        this.handleMailFrom(socket, session, args);
        break;
      case "RCPT":
        this.handleRcptTo(socket, session, args);
        break;
      case "DATA":
        this.handleData(socket, session);
        break;
      case "RSET":
        this.handleRset(socket, session);
        break;
      case "NOOP":
        this.send(socket, "250 OK");
        break;
      case "QUIT":
        this.send(socket, "221 Bye");
        socket.end();
        break;
      default:
        this.send(socket, "500 Unknown command");
    }
  }

  /**
   * Handle LHLO command
   */
  private handleLhlo(socket: net.Socket, clientName: string): void {
    log.debug(`LHLO from: ${clientName}`);
    this.send(socket, "250-deep-tree-echo.local");
    this.send(socket, "250-PIPELINING");
    this.send(socket, "250-ENHANCEDSTATUSCODES");
    this.send(socket, `250 SIZE ${this.config.maxMessageSize}`);
  }

  /**
   * Handle MAIL FROM command
   */
  private handleMailFrom(
    socket: net.Socket,
    session: LMTPSession,
    args: string,
  ): void {
    const match = args.match(/FROM:\s*<?([^>]*)>?/i);
    if (match) {
      session.mailFrom = match[1];
      session.rcptTo = [];
      session.data = [];
      this.send(socket, "250 2.1.0 OK");
    } else {
      this.send(socket, "501 Syntax error");
    }
  }

  /**
   * Handle RCPT TO command
   */
  private handleRcptTo(
    socket: net.Socket,
    session: LMTPSession,
    args: string,
  ): void {
    const match = args.match(/TO:\s*<?([^>]*)>?/i);
    if (match) {
      const recipient = match[1];

      // Check if domain is allowed
      const domain = recipient.split("@")[1];
      if (this.isDomainAllowed(domain)) {
        session.rcptTo.push(recipient);
        this.send(socket, "250 2.1.5 OK");
      } else {
        this.send(socket, "550 5.1.1 Recipient rejected");
      }
    } else {
      this.send(socket, "501 Syntax error");
    }
  }

  /**
   * Handle DATA command
   */
  private handleData(socket: net.Socket, session: LMTPSession): void {
    if (session.rcptTo.length === 0) {
      this.send(socket, "503 No recipients");
      return;
    }
    session.inData = true;
    session.data = [];
    this.send(socket, "354 Start mail input");
  }

  /**
   * Handle RSET command
   */
  private handleRset(socket: net.Socket, session: LMTPSession): void {
    session.mailFrom = "";
    session.rcptTo = [];
    session.data = [];
    session.inData = false;
    this.send(socket, "250 OK");
  }

  /**
   * Process a complete message
   */
  private processMessage(socket: net.Socket, session: LMTPSession): void {
    const rawMessage = session.data.join("\r\n");

    // Parse the message
    const message = this.parseEmail(
      rawMessage,
      session.mailFrom,
      session.rcptTo,
    );

    log.info(`Received message: ${message.subject} from ${message.from}`);

    // Emit the message for processing
    this.emit("email", message);

    // Send response for each recipient (LMTP requirement)
    session.rcptTo.forEach((recipient) => {
      this.send(
        socket,
        `250 2.0.0 <${message.messageId}> Delivered to ${recipient}`,
      );
    });

    // Reset for next message
    session.mailFrom = "";
    session.rcptTo = [];
    session.data = [];
  }

  /**
   * Parse raw email into EmailMessage structure
   */
  private parseEmail(raw: string, from: string, to: string[]): EmailMessage {
    const headers = new Map<string, string>();
    const lines = raw.split("\r\n");
    let bodyStart = 0;
    let currentHeader = "";

    // Parse headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === "") {
        bodyStart = i + 1;
        break;
      }

      if (line.startsWith(" ") || line.startsWith("\t")) {
        // Continuation of previous header
        if (currentHeader) {
          headers.set(
            currentHeader,
            headers.get(currentHeader) + " " + line.trim(),
          );
        }
      } else {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          currentHeader = line.substring(0, colonIndex).toLowerCase();
          headers.set(currentHeader, line.substring(colonIndex + 1).trim());
        }
      }
    }

    const rawBody = lines.slice(bodyStart).join("\r\n");
    const contentType = headers.get("content-type") || "text/plain";

    // Parse MIME structure for attachments and body
    const { body, attachments } = this.parseMimeContent(rawBody, contentType);

    return {
      messageId: headers.get("message-id") || `<${Date.now()}@deep-tree-echo>`,
      from: headers.get("from") || from,
      to: to,
      cc:
        headers
          .get("cc")
          ?.split(",")
          .map((e) => e.trim()) || [],
      bcc: [],
      subject: headers.get("subject") || "(no subject)",
      body: body,
      headers: headers,
      attachments: attachments,
      receivedAt: new Date(),
    };
  }

  /**
   * Parse MIME content and extract body text and attachments
   */
  private parseMimeContent(
    rawBody: string,
    contentType: string,
  ): { body: string; attachments: EmailAttachment[] } {
    const attachments: EmailAttachment[] = [];

    // Check if this is a multipart message
    const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/i);

    if (!boundaryMatch) {
      // Not multipart - return raw body as-is
      return {
        body: this.decodeBodyContent(rawBody, contentType),
        attachments: [],
      };
    }

    const boundary = boundaryMatch[1];
    const parts = rawBody.split(`--${boundary}`);
    let textBody = "";

    for (const part of parts) {
      const trimmedPart = part.trim();

      // Skip empty parts and closing boundary
      if (
        !trimmedPart ||
        trimmedPart === "--" ||
        trimmedPart.startsWith("--")
      ) {
        continue;
      }

      // Parse part headers
      const partLines = trimmedPart.split("\r\n");
      const partHeaders = new Map<string, string>();
      let partBodyStart = 0;

      for (let i = 0; i < partLines.length; i++) {
        if (partLines[i] === "") {
          partBodyStart = i + 1;
          break;
        }
        const colonIdx = partLines[i].indexOf(":");
        if (colonIdx > 0) {
          const headerName = partLines[i].substring(0, colonIdx).toLowerCase();
          const headerValue = partLines[i].substring(colonIdx + 1).trim();
          partHeaders.set(headerName, headerValue);
        }
      }

      const partBody = partLines.slice(partBodyStart).join("\r\n");
      const partContentType = partHeaders.get("content-type") || "text/plain";
      const partDisposition = partHeaders.get("content-disposition") || "";
      const partEncoding =
        partHeaders.get("content-transfer-encoding") || "7bit";

      // Check if this part is an attachment
      const isAttachment =
        partDisposition.toLowerCase().includes("attachment") ||
        (partDisposition.toLowerCase().includes("inline") &&
          !partContentType.startsWith("text/"));

      if (isAttachment) {
        // Extract filename
        let filename = "attachment";
        const filenameMatch =
          partDisposition.match(/filename="?([^";\r\n]+)"?/i) ||
          partContentType.match(/name="?([^";\r\n]+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1].trim();
        }

        // Decode attachment content
        let content: Buffer;
        if (partEncoding.toLowerCase() === "base64") {
          content = Buffer.from(partBody.replace(/\s/g, ""), "base64");
        } else if (partEncoding.toLowerCase() === "quoted-printable") {
          content = this.decodeQuotedPrintable(partBody);
        } else {
          content = Buffer.from(partBody);
        }

        attachments.push({
          filename,
          contentType: partContentType.split(";")[0].trim(),
          content,
          size: content.length,
        });
      } else if (partContentType.startsWith("text/plain") && !textBody) {
        // Extract plain text body
        textBody = this.decodeBodyContent(
          partBody,
          partContentType,
          partEncoding,
        );
      } else if (partContentType.startsWith("text/html") && !textBody) {
        // Fall back to HTML if no plain text
        textBody = this.decodeBodyContent(
          partBody,
          partContentType,
          partEncoding,
        );
      } else if (partContentType.startsWith("multipart/")) {
        // Recursively parse nested multipart
        const nested = this.parseMimeContent(partBody, partContentType);
        if (!textBody && nested.body) {
          textBody = nested.body;
        }
        attachments.push(...nested.attachments);
      }
    }

    return { body: textBody || rawBody, attachments };
  }

  /**
   * Decode body content based on encoding
   */
  private decodeBodyContent(
    body: string,
    _contentType: string,
    encoding: string = "7bit",
  ): string {
    let decoded = body;

    // Handle transfer encoding
    const lowerEncoding = encoding.toLowerCase();
    if (lowerEncoding === "base64") {
      try {
        decoded = Buffer.from(body.replace(/\s/g, ""), "base64").toString(
          "utf-8",
        );
      } catch {
        log.warn("Failed to decode base64 body content");
      }
    } else if (lowerEncoding === "quoted-printable") {
      decoded = this.decodeQuotedPrintable(body).toString("utf-8");
    }

    return decoded;
  }

  /**
   * Decode quoted-printable encoded content
   */
  private decodeQuotedPrintable(input: string): Buffer {
    // Remove soft line breaks
    const normalized = input.replace(/=\r?\n/g, "");

    // Decode hex sequences
    const decoded = normalized.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    return Buffer.from(decoded, "binary");
  }

  /**
   * Check if domain is in allowed list
   */
  private isDomainAllowed(domain: string): boolean {
    if (this.config.allowedDomains.includes("*")) return true;
    return this.config.allowedDomains.includes(domain?.toLowerCase());
  }

  /**
   * Send a response line
   */
  private send(socket: net.Socket, message: string): void {
    socket.write(message + "\r\n");
  }

  /**
   * Event emitter functionality
   */
  public on(
    event: string,
    callback: (data: any) => void | Promise<void>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => cb(data));
  }
}
