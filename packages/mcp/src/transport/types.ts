/**
 * @fileoverview MCP Transport Types
 *
 * Type definitions for MCP transport layer.
 */

import type { NestedMCPServer } from "../server.js";

/**
 * Transport mode
 */
export type TransportMode = "stdio" | "sse" | "http";

/**
 * Transport configuration
 */
export interface TransportConfig {
  mode: TransportMode;
  /** Port for HTTP/SSE mode */
  port?: number;
  /** Host for HTTP/SSE mode */
  host?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * MCP Request
 */
export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP Response
 */
export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: MCPError;
}

/**
 * MCP Error
 */
export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * Standard JSON-RPC error codes
 */
export const ErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

/**
 * Transport interface
 */
export interface Transport {
  /** Start the transport */
  start(): Promise<void>;
  /** Stop the transport */
  stop(): Promise<void>;
  /** Check if running */
  isRunning(): boolean;
}

/**
 * MCP Method handlers mapping
 */
export type MethodHandler = (
  server: NestedMCPServer,
  params: Record<string, unknown>,
) => Promise<unknown> | unknown;

export type MethodHandlers = Record<string, MethodHandler>;
