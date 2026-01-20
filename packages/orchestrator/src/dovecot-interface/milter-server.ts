import { getLogger } from "deep-tree-echo-core";
import * as net from "net";
import * as fs from "fs";

const log = getLogger("deep-tree-echo-orchestrator/MilterServer");

/**
 * Email message structure
 */
export interface EmailMessage {
  messageId: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  headers: Map<string, string>;
  attachments: EmailAttachment[];
  receivedAt: Date;
}

/**
 * Email attachment structure
 */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

/**
 * Milter server configuration
 */
export interface MilterConfig {
  socketPath: string;
  allowedDomains: string[];
  timeout?: number;
}

/**
 * Milter protocol commands
 * Based on Sendmail Milter Protocol
 */
const MILTER_COMMANDS = {
  SMFIC_ABORT: "A",
  SMFIC_BODY: "B",
  SMFIC_CONNECT: "C",
  SMFIC_MACRO: "D",
  SMFIC_BODYEOB: "E",
  SMFIC_HELO: "H",
  SMFIC_QUIT_NC: "K",
  SMFIC_HEADER: "L",
  SMFIC_MAIL: "M",
  SMFIC_EOH: "N",
  SMFIC_OPTNEG: "O",
  SMFIC_QUIT: "Q",
  SMFIC_RCPT: "R",
  SMFIC_DATA: "T",
  SMFIC_UNKNOWN: "U",
} as const;

/**
 * Milter protocol responses
 */
const MILTER_RESPONSES = {
  SMFIR_ADDRCPT: "+",
  SMFIR_DELRCPT: "-",
  SMFIR_ADDRCPT_PAR: "2",
  SMFIR_SHUTDOWN: "4",
  SMFIR_ACCEPT: "a",
  SMFIR_REPLBODY: "b",
  SMFIR_CONTINUE: "c",
  SMFIR_DISCARD: "d",
  SMFIR_CHGFROM: "e",
  SMFIR_CONN_FAIL: "f",
  SMFIR_ADDHEADER: "h",
  SMFIR_INSHEADER: "i",
  SMFIR_SETSYMLIST: "l",
  SMFIR_CHGHEADER: "m",
  SMFIR_PROGRESS: "p",
  SMFIR_QUARANTINE: "q",
  SMFIR_REJECT: "r",
  SMFIR_SKIP: "s",
  SMFIR_TEMPFAIL: "t",
  SMFIR_REPLYCODE: "y",
} as const;

/**
 * MilterServer - Implements the Milter protocol for Dovecot/Postfix integration
 *
 * The Milter protocol allows Deep Tree Echo to:
 * - Intercept emails before delivery
 * - Inspect and modify email content
 * - Accept, reject, or quarantine messages
 * - Add headers or modify recipients
 */
export class MilterServer {
  private config: MilterConfig;
  private server?: net.Server;
  private connections: Set<net.Socket> = new Set();
  private listeners: Map<string, Function[]> = new Map();
  private currentMessage: Partial<EmailMessage> = {};

  constructor(config: MilterConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Start the Milter server
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
        log.error("Milter server error:", error);
        reject(error);
      });

      // Determine if socket path or host:port
      if (this.config.socketPath.startsWith("/")) {
        // Unix socket
        this.server.listen(this.config.socketPath, () => {
          log.info(
            `Milter server listening on Unix socket: ${this.config.socketPath}`,
          );
          // Set socket permissions
          fs.chmodSync(this.config.socketPath, 0o660);
          resolve();
        });
      } else {
        // TCP socket (host:port)
        const [host, portStr] = this.config.socketPath.split(":");
        const port = parseInt(portStr, 10) || 8890;
        this.server.listen(port, host || "127.0.0.1", () => {
          log.info(`Milter server listening on ${host || "127.0.0.1"}:${port}`);
          resolve();
        });
      }
    });
  }

  /**
   * Stop the Milter server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all connections
      this.connections.forEach((socket) => {
        socket.destroy();
      });
      this.connections.clear();

      if (this.server) {
        this.server.close(() => {
          log.info("Milter server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle a new Milter connection
   */
  private handleConnection(socket: net.Socket): void {
    this.connections.add(socket);
    log.debug("New Milter connection established");

    let buffer = Buffer.alloc(0);

    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);

      // Process complete Milter packets
      while (buffer.length >= 4) {
        const packetLen = buffer.readUInt32BE(0);
        if (buffer.length < packetLen + 4) {
          break; // Wait for more data
        }

        const packet = buffer.subarray(4, packetLen + 4);
        buffer = buffer.subarray(packetLen + 4);

        this.handleMilterPacket(socket, packet);
      }
    });

    socket.on("close", () => {
      this.connections.delete(socket);
      log.debug("Milter connection closed");
    });

    socket.on("error", (error) => {
      log.error("Milter connection error:", error);
      this.connections.delete(socket);
    });
  }

  /**
   * Handle a Milter protocol packet
   */
  private handleMilterPacket(socket: net.Socket, packet: Buffer): void {
    if (packet.length === 0) return;

    const command = String.fromCharCode(packet[0]);
    const data = packet.subarray(1);

    switch (command) {
      case MILTER_COMMANDS.SMFIC_OPTNEG:
        this.handleOptNeg(socket, data);
        break;
      case MILTER_COMMANDS.SMFIC_CONNECT:
        this.handleConnect(socket, data);
        break;
      case MILTER_COMMANDS.SMFIC_HELO:
        this.handleHelo(socket, data);
        break;
      case MILTER_COMMANDS.SMFIC_MAIL:
        this.handleMailFrom(socket, data);
        break;
      case MILTER_COMMANDS.SMFIC_RCPT:
        this.handleRcptTo(socket, data);
        break;
      case MILTER_COMMANDS.SMFIC_HEADER:
        this.handleHeader(socket, data);
        break;
      case MILTER_COMMANDS.SMFIC_EOH:
        this.handleEndOfHeaders(socket);
        break;
      case MILTER_COMMANDS.SMFIC_BODY:
        this.handleBody(socket, data);
        break;
      case MILTER_COMMANDS.SMFIC_BODYEOB:
        this.handleEndOfBody(socket);
        break;
      case MILTER_COMMANDS.SMFIC_ABORT:
        this.handleAbort(socket);
        break;
      case MILTER_COMMANDS.SMFIC_QUIT:
        this.handleQuit(socket);
        break;
      default:
        log.debug(`Unknown Milter command: ${command}`);
        this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
    }
  }

  /**
   * Handle option negotiation
   */
  private handleOptNeg(socket: net.Socket, data: Buffer): void {
    // Version, actions, protocol
    const version = 6;
    const actions = 0x1ff; // All actions
    const protocol = 0x1fffff; // All protocol steps

    const response = Buffer.alloc(13);
    response[0] = MILTER_RESPONSES.SMFIR_CONTINUE.charCodeAt(0);
    response.writeUInt32BE(version, 1);
    response.writeUInt32BE(actions, 5);
    response.writeUInt32BE(protocol, 9);

    this.sendPacket(socket, response);
    log.debug("Option negotiation complete");
  }

  /**
   * Handle CONNECT command
   */
  private handleConnect(socket: net.Socket, data: Buffer): void {
    // Reset message state
    this.currentMessage = {
      to: [],
      cc: [],
      bcc: [],
      headers: new Map(),
      attachments: [],
      receivedAt: new Date(),
    };
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
  }

  /**
   * Handle HELO command
   */
  private handleHelo(socket: net.Socket, data: Buffer): void {
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
  }

  /**
   * Handle MAIL FROM command
   */
  private handleMailFrom(socket: net.Socket, data: Buffer): void {
    const from = this.parseNullTerminatedStrings(data)[0] || "";
    this.currentMessage.from = this.extractEmail(from);
    log.debug(`MAIL FROM: ${this.currentMessage.from}`);
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
  }

  /**
   * Handle RCPT TO command
   */
  private handleRcptTo(socket: net.Socket, data: Buffer): void {
    const rcpt = this.parseNullTerminatedStrings(data)[0] || "";
    const email = this.extractEmail(rcpt);

    if (!this.currentMessage.to) {
      this.currentMessage.to = [];
    }
    this.currentMessage.to.push(email);

    log.debug(`RCPT TO: ${email}`);
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
  }

  /**
   * Handle HEADER command
   */
  private handleHeader(socket: net.Socket, data: Buffer): void {
    const parts = this.parseNullTerminatedStrings(data);
    if (parts.length >= 2) {
      const [name, value] = parts;
      this.currentMessage.headers?.set(name.toLowerCase(), value);

      // Extract common headers
      switch (name.toLowerCase()) {
        case "subject":
          this.currentMessage.subject = value;
          break;
        case "message-id":
          this.currentMessage.messageId = value;
          break;
        case "cc":
          this.currentMessage.cc = value
            .split(",")
            .map((e) => this.extractEmail(e));
          break;
      }
    }
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
  }

  /**
   * Handle end of headers
   */
  private handleEndOfHeaders(socket: net.Socket): void {
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
  }

  /**
   * Handle body chunk
   */
  private handleBody(socket: net.Socket, data: Buffer): void {
    if (!this.currentMessage.body) {
      this.currentMessage.body = "";
    }
    this.currentMessage.body += data.toString("utf8");
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
  }

  /**
   * Handle end of body - emit the complete message
   */
  private handleEndOfBody(socket: net.Socket): void {
    // Generate message ID if not present
    if (!this.currentMessage.messageId) {
      this.currentMessage.messageId = `<${Date.now()}.${Math.random().toString(
        36,
      )}@deep-tree-echo>`;
    }

    const message: EmailMessage = {
      messageId: this.currentMessage.messageId,
      from: this.currentMessage.from || "",
      to: this.currentMessage.to || [],
      cc: this.currentMessage.cc || [],
      bcc: this.currentMessage.bcc || [],
      subject: this.currentMessage.subject || "(no subject)",
      body: this.currentMessage.body || "",
      headers: this.currentMessage.headers || new Map(),
      attachments: this.currentMessage.attachments || [],
      receivedAt: this.currentMessage.receivedAt || new Date(),
    };

    log.info(`Email received: ${message.subject} from ${message.from}`);

    // Emit the message for processing
    this.emit("email", message);

    // Accept the message
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_ACCEPT);
  }

  /**
   * Handle abort
   */
  private handleAbort(socket: net.Socket): void {
    this.currentMessage = {};
    this.sendResponse(socket, MILTER_RESPONSES.SMFIR_CONTINUE);
  }

  /**
   * Handle quit
   */
  private handleQuit(socket: net.Socket): void {
    socket.end();
  }

  /**
   * Send a Milter response
   */
  private sendResponse(socket: net.Socket, response: string): void {
    const data = Buffer.from([response.charCodeAt(0)]);
    this.sendPacket(socket, data);
  }

  /**
   * Send a Milter packet
   */
  private sendPacket(socket: net.Socket, data: Buffer): void {
    const header = Buffer.alloc(4);
    header.writeUInt32BE(data.length);
    socket.write(Buffer.concat([header, data]));
  }

  /**
   * Parse null-terminated strings from buffer
   */
  private parseNullTerminatedStrings(data: Buffer): string[] {
    const strings: string[] = [];
    let start = 0;

    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0) {
        strings.push(data.subarray(start, i).toString("utf8"));
        start = i + 1;
      }
    }

    return strings;
  }

  /**
   * Extract email address from potentially formatted address
   */
  private extractEmail(address: string): string {
    const match = address.match(/<([^>]+)>/);
    return match ? match[1] : address.trim();
  }

  /**
   * Event emitter functionality
   */
  public on(event: string, callback: Function): void {
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
