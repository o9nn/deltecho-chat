/**
 * IPC Layer Exports
 * 
 * Provides inter-process communication for Deep Tree Echo orchestrator.
 * Supports Unix sockets, TCP, and WebSocket for cross-platform compatibility.
 */

// Protocol types and helpers
export {
    IPCMessageType,
    type IPCMessage,
    type IPCResponse,
    type IPCTypeMap,
    createIPCMessage,
    createSuccessResponse,
    createErrorResponse,
    isIPCMessage,
    // Cognitive types
    type CognitiveProcessRequest,
    type CognitiveProcessResponse,
    type CognitiveQuickProcessRequest,
    type CognitiveStateSnapshot,
    type EmotionalStateSnapshot,
    type EmotionalStateUpdateRequest,
    type GetHistoryRequest,
    type GetHistoryResponse,
    type MessageHistoryItem,
    type ExportConversationRequest,
    type ExportConversationResponse,
    type ImportConversationRequest,
    type CognitiveStatistics,
    // Memory types
    type MemorySearchRequest,
    type MemorySearchResponse,
    type MemorySearchResult,
    type MemoryStoreRequest,
    type MemoryStoreResponse,
    type MemoryContextRequest,
    type MemoryContextResponse,
    // Persona types
    type PersonaInfo,
    type PersonaUpdateRequest,
    // System types
    type SystemStatusResponse,
    type SystemMetricsResponse,
    // Storage types
    type StorageGetRequest,
    type StorageGetResponse,
    type StorageSetRequest,
    type StorageDeleteRequest,
    type StorageKeysRequest,
    type StorageKeysResponse,
    // Event types
    type SubscribeRequest,
    type EventNotification,
    IPCEventType,
} from './protocol.js';

// Servers
export { IPCServer, type IPCServerConfig, type IPCRequestHandler } from './server.js';
export { WebSocketServer, type WebSocketServerConfig } from './websocket-server.js';

// Client
export {
    IPCClient,
    type IPCClientConfig,
    ConnectionState,
    createBrowserClient,
    createNodeClient,
} from './client.js';

// Handlers
export {
    registerCognitiveHandlers,
    type CognitiveHandlerDependencies,
} from './cognitive-handlers.js';

// Storage
export { StorageManager } from './storage-manager.js';
