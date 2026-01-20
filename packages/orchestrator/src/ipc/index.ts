/**
 * IPC Layer Exports
 *
 * Provides inter-process communication for Deep Tree Echo orchestrator.
 * Supports Unix sockets, TCP, and WebSocket for cross-platform compatibility.
 */

// Protocol types and helpers
export * from "@deltecho/ipc";

// Servers
export {
  IPCServer,
  type IPCServerConfig,
  type IPCRequestHandler,
} from "./server.js";
export {
  WebSocketServer,
  type WebSocketServerConfig,
} from "./websocket-server.js";

// Handlers
export {
  registerCognitiveHandlers,
  type CognitiveHandlerDependencies,
} from "./cognitive-handlers.js";

// Storage
export { StorageManager } from "./storage-manager.js";
