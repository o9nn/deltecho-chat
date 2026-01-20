/**
 * @fileoverview Stdio Transport
 *
 * Implements MCP transport over standard input/output.
 * This is the primary transport for Claude Desktop integration.
 */

import { createInterface, Interface } from "readline";
import type { NestedMCPServer } from "../server.js";
import { ProtocolHandler, createProtocolHandler } from "./handler.js";
import type { Transport } from "./types.js";

/**
 * Stdio transport configuration
 */
export interface StdioTransportConfig {
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Stdio Transport
 *
 * Reads JSON-RPC requests from stdin (one per line)
 * and writes responses to stdout (one per line).
 */
export class StdioTransport implements Transport {
  private server: NestedMCPServer;
  private handler: ProtocolHandler;
  private readline: Interface | null = null;
  private running: boolean = false;
  private verbose: boolean;

  constructor(server: NestedMCPServer, config: StdioTransportConfig = {}) {
    this.server = server;
    this.verbose = config.verbose ?? false;
    this.handler = createProtocolHandler(server, this.verbose);
  }

  /**
   * Start the transport
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    // Ensure server is started
    if (!this.server.isRunning()) {
      await this.server.start();
    }

    // Set up readline interface for stdin
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    // Disable normal output buffering
    if (process.stdout.setDefaultEncoding) {
      process.stdout.setDefaultEncoding("utf8");
    }

    // Handle each line as a JSON-RPC request
    this.readline.on("line", async (line) => {
      await this.handleLine(line);
    });

    // Handle close
    this.readline.on("close", () => {
      if (this.verbose) {
        console.error("[Stdio] Input stream closed");
      }
      this.running = false;
    });

    // Handle errors
    process.stdin.on("error", (err) => {
      console.error("[Stdio] stdin error:", err);
    });

    this.running = true;

    if (this.verbose) {
      console.error("[Stdio] Transport started");
    }
  }

  /**
   * Stop the transport
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }

    await this.server.stop();
    this.running = false;

    if (this.verbose) {
      console.error("[Stdio] Transport stopped");
    }
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Handle a single line from stdin
   */
  private async handleLine(line: string): Promise<void> {
    const trimmed = line.trim();
    if (!trimmed) {
      return; // Ignore empty lines
    }

    try {
      const response = await this.handler.handleRawRequest(trimmed);

      if (response !== null) {
        // Write response to stdout (one line)
        this.writeLine(response);
      }
    } catch (error) {
      console.error("[Stdio] Error handling request:", error);

      // Send error response
      const errorResponse = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
      };
      this.writeLine(JSON.stringify(errorResponse));
    }
  }

  /**
   * Write a line to stdout
   */
  private writeLine(content: string): void {
    process.stdout.write(content + "\n");
  }
}

/**
 * Create a stdio transport
 */
export function createStdioTransport(
  server: NestedMCPServer,
  config?: StdioTransportConfig,
): StdioTransport {
  return new StdioTransport(server, config);
}

/**
 * Run the MCP server over stdio
 *
 * This is a convenience function for the common case of
 * running an MCP server over standard I/O.
 *
 * @example
 * ```typescript
 * import { createNestedMCPServer, runStdioServer } from 'deep-tree-echo-mcp';
 *
 * const server = await createNestedMCPServer({
 *     instanceName: 'MyEcho',
 * });
 *
 * await runStdioServer(server);
 * ```
 */
export async function runStdioServer(
  server: NestedMCPServer,
  config?: StdioTransportConfig,
): Promise<void> {
  const transport = createStdioTransport(server, config);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("[Stdio] Received SIGINT, shutting down...");
    await transport.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("[Stdio] Received SIGTERM, shutting down...");
    await transport.stop();
    process.exit(0);
  });

  // Start the transport
  await transport.start();

  // Keep the process running
  await new Promise<void>((resolve) => {
    process.on("exit", () => {
      resolve();
    });
  });
}
