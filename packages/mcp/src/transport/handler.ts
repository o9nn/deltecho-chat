/**
 * @fileoverview MCP Protocol Handler
 *
 * Handles JSON-RPC 2.0 requests and routes them to the appropriate
 * MCP server methods.
 */

import type { NestedMCPServer } from "../server.js";
import type {
  MCPRequest,
  MCPResponse,
  MCPError,
  MethodHandler,
  MethodHandlers,
} from "./types.js";
import { ErrorCodes } from "./types.js";

/**
 * Create standard MCP method handlers
 */
function createMethodHandlers(): MethodHandlers {
  return {
    // =====================================================================
    // INITIALIZATION
    // =====================================================================
    initialize: async (_server, _params) => {
      return {
        protocolVersion: "2024-11-05",
        capabilities: {
          resources: { subscribe: false, listChanged: false },
          tools: {},
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: "deep-tree-echo-mcp",
          version: "1.0.0",
        },
      };
    },

    "notifications/initialized": () => {
      // Client has acknowledged initialization
      return undefined;
    },

    // =====================================================================
    // RESOURCES
    // =====================================================================
    "resources/list": (server) => {
      const resources = server.listAllResources();
      return {
        resources: resources.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: "application/json",
        })),
      };
    },

    "resources/read": (server, params) => {
      const uri = params.uri as string;
      if (!uri) {
        throw {
          code: ErrorCodes.InvalidParams,
          message: "Missing uri parameter",
        };
      }

      const content = server.readResource(uri);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(content, null, 2),
          },
        ],
      };
    },

    // =====================================================================
    // TOOLS
    // =====================================================================
    "tools/list": (server) => {
      const tools = server.listAllTools();
      return {
        tools: tools.map((t) => ({
          name: `${t.layer}/${t.name}`,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };
    },

    "tools/call": async (server, params) => {
      const fullName = params.name as string;
      const args = (params.arguments as Record<string, unknown>) || {};

      if (!fullName) {
        throw {
          code: ErrorCodes.InvalidParams,
          message: "Missing name parameter",
        };
      }

      // Parse layer from tool name (format: layer/toolName)
      const parts = fullName.split("/");
      if (parts.length !== 2) {
        throw {
          code: ErrorCodes.InvalidParams,
          message: "Tool name must be in format: layer/toolName",
        };
      }

      const [layer, toolName] = parts;
      if (!["arena", "agent", "relation"].includes(layer)) {
        throw {
          code: ErrorCodes.InvalidParams,
          message: `Invalid layer: ${layer}. Must be arena, agent, or relation.`,
        };
      }

      const result = await server.callTool(
        layer as "arena" | "agent" | "relation",
        toolName,
        args,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },

    // =====================================================================
    // PROMPTS
    // =====================================================================
    "prompts/list": (server) => {
      const prompts = server.listAllPrompts();
      return {
        prompts: prompts.map((p) => ({
          name: `${p.layer}/${p.name}`,
          description: p.description,
          arguments: p.arguments,
        })),
      };
    },

    "prompts/get": (server, params) => {
      const fullName = params.name as string;
      const args = (params.arguments as Record<string, string>) || {};

      if (!fullName) {
        throw {
          code: ErrorCodes.InvalidParams,
          message: "Missing name parameter",
        };
      }

      // Parse layer from prompt name
      const parts = fullName.split("/");
      if (parts.length !== 2) {
        throw {
          code: ErrorCodes.InvalidParams,
          message: "Prompt name must be in format: layer/promptName",
        };
      }

      const [layer, promptName] = parts;
      if (!["arena", "agent", "relation"].includes(layer)) {
        throw {
          code: ErrorCodes.InvalidParams,
          message: `Invalid layer: ${layer}. Must be arena, agent, or relation.`,
        };
      }

      const prompt = server.getPrompt(
        layer as "arena" | "agent" | "relation",
        promptName,
        args,
      );

      return {
        description: `${layer}/${promptName} prompt`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: prompt,
            },
          },
        ],
      };
    },

    // =====================================================================
    // LIFECYCLE (Custom extension)
    // =====================================================================
    "lifecycle/run": async (server) => {
      const results = await server.runLifecycleCycle();
      return { results };
    },

    "lifecycle/status": (server) => {
      return server.getStateSummary();
    },

    // =====================================================================
    // VIRTUAL MODELS (Custom extension)
    // =====================================================================
    "virtual/agent": (server) => {
      return server.getVirtualAgent();
    },

    "virtual/arena": (server) => {
      return server.getVirtualArena();
    },
  };
}

/**
 * Protocol Handler
 *
 * Processes MCP JSON-RPC requests and routes them to the server.
 */
export class ProtocolHandler {
  private server: NestedMCPServer;
  private handlers: MethodHandlers;
  private verbose: boolean;

  constructor(server: NestedMCPServer, verbose: boolean = false) {
    this.server = server;
    this.handlers = createMethodHandlers();
    this.verbose = verbose;
  }

  /**
   * Handle a JSON-RPC request
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse | null> {
    if (this.verbose) {
      console.error(`[MCP] ← ${request.method}`);
    }

    // Validate JSON-RPC version
    if (request.jsonrpc !== "2.0") {
      return this.createError(
        request.id,
        ErrorCodes.InvalidRequest,
        "Invalid JSON-RPC version",
      );
    }

    // Check if it's a notification (no id)
    const isNotification = request.id === undefined || request.id === null;

    try {
      const handler = this.handlers[request.method];

      if (!handler) {
        if (isNotification) {
          return null; // Notifications don't get responses
        }
        return this.createError(
          request.id,
          ErrorCodes.MethodNotFound,
          `Method not found: ${request.method}`,
        );
      }

      const result = await handler(this.server, request.params || {});

      // Notifications don't get responses
      if (isNotification) {
        return null;
      }

      if (this.verbose) {
        console.error(`[MCP] → Success`);
      }

      return {
        jsonrpc: "2.0",
        id: request.id,
        result,
      };
    } catch (error) {
      if (isNotification) {
        console.error(`[MCP] Notification error:`, error);
        return null;
      }

      // Check if it's already an MCP error
      if (this.isMCPError(error)) {
        return this.createError(
          request.id,
          error.code,
          error.message,
          error.data,
        );
      }

      // Wrap as internal error
      const message = error instanceof Error ? error.message : String(error);
      return this.createError(request.id, ErrorCodes.InternalError, message);
    }
  }

  /**
   * Parse and handle a raw JSON string
   */
  async handleRawRequest(raw: string): Promise<string | null> {
    let request: MCPRequest;

    try {
      request = JSON.parse(raw);
    } catch {
      const error = this.createError(
        null,
        ErrorCodes.ParseError,
        "Invalid JSON",
      );
      return JSON.stringify(error);
    }

    const response = await this.handleRequest(request);

    if (response === null) {
      return null; // No response for notifications
    }

    return JSON.stringify(response);
  }

  /**
   * Add a custom method handler
   */
  addHandler(method: string, handler: MethodHandler): void {
    this.handlers[method] = handler;
  }

  /**
   * Create an error response
   */
  private createError(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown,
  ): MCPResponse {
    if (this.verbose) {
      console.error(`[MCP] → Error: ${message}`);
    }

    const error: MCPError = { code, message };
    if (data !== undefined) {
      error.data = data;
    }

    return {
      jsonrpc: "2.0",
      id,
      error,
    };
  }

  /**
   * Check if an error is an MCP error
   */
  private isMCPError(error: unknown): error is MCPError {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "message" in error
    );
  }
}

/**
 * Create a protocol handler
 */
export function createProtocolHandler(
  server: NestedMCPServer,
  verbose?: boolean,
): ProtocolHandler {
  return new ProtocolHandler(server, verbose);
}
