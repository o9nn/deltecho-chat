/**
 * IPC Protocol - Strongly-typed message definitions for desktop/browser communication
 * 
 * This module defines the complete protocol for IPC communication between:
 * - Electron desktop apps
 * - Browser clients (via WebSocket)
 * - CLI tools
 * - External services
 */

// ============================================================================
// Base Message Types
// ============================================================================

/**
 * All possible IPC message types
 */
export enum IPCMessageType {
    // ── Cognitive Operations ──
    COGNITIVE_PROCESS = 'cognitive:process',
    COGNITIVE_QUICK_PROCESS = 'cognitive:quick_process',
    COGNITIVE_GET_STATE = 'cognitive:get_state',
    COGNITIVE_GET_EMOTIONAL_STATE = 'cognitive:get_emotional_state',
    COGNITIVE_UPDATE_EMOTIONAL_STATE = 'cognitive:update_emotional_state',
    COGNITIVE_GET_HISTORY = 'cognitive:get_history',
    COGNITIVE_CLEAR_HISTORY = 'cognitive:clear_history',
    COGNITIVE_EXPORT = 'cognitive:export',
    COGNITIVE_IMPORT = 'cognitive:import',
    COGNITIVE_GET_STATISTICS = 'cognitive:get_statistics',

    // ── Memory Operations ──
    MEMORY_SEARCH = 'memory:search',
    MEMORY_STORE = 'memory:store',
    MEMORY_GET_CONTEXT = 'memory:get_context',
    MEMORY_CLEAR = 'memory:clear',

    // ── Persona Operations ──
    PERSONA_GET = 'persona:get',
    PERSONA_UPDATE = 'persona:update',
    PERSONA_GET_EMOTIONAL_STATE = 'persona:get_emotional_state',
    PERSONA_GET_COGNITIVE_STATE = 'persona:get_cognitive_state',

    // ── System Operations ──
    SYSTEM_STATUS = 'system:status',
    SYSTEM_CONFIG_GET = 'system:config_get',
    SYSTEM_CONFIG_SET = 'system:config_set',
    SYSTEM_METRICS = 'system:metrics',

    // ── Storage Operations ──
    STORAGE_GET = 'storage:get',
    STORAGE_SET = 'storage:set',
    STORAGE_DELETE = 'storage:delete',
    STORAGE_KEYS = 'storage:keys',
    STORAGE_CLEAR = 'storage:clear',

    // ── Control ──
    PING = 'control:ping',
    PONG = 'control:pong',
    SUBSCRIBE = 'control:subscribe',
    UNSUBSCRIBE = 'control:unsubscribe',

    // ── Events ──
    EVENT = 'event',

    // ── Response Types ──
    RESPONSE_SUCCESS = 'response:success',
    RESPONSE_ERROR = 'response:error',
}

/**
 * Base IPC message structure
 */
export interface IPCMessage<T = unknown> {
    /** Unique message identifier for request/response correlation */
    id: string;
    /** Message type */
    type: IPCMessageType;
    /** Message payload */
    payload: T;
    /** Unix timestamp in milliseconds */
    timestamp: number;
}

/**
 * IPC Response wrapper
 */
export interface IPCResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

// ============================================================================
// Cognitive Protocol Types
// ============================================================================

/** Request to process a message through the cognitive system */
export interface CognitiveProcessRequest {
    /** The message text to process */
    message: string;
    /** Optional chat ID for context */
    chatId?: number;
    /** Whether to skip sentiment analysis */
    skipSentiment?: boolean;
    /** Whether to skip memory lookup */
    skipMemory?: boolean;
}

/** Response from cognitive processing */
export interface CognitiveProcessResponse {
    /** The generated response */
    response: {
        role: 'assistant';
        content: string;
        metadata: {
            sentiment?: {
                polarity: number;
                subjectivity: number;
                label: string;
            };
            emotion?: {
                dominant: string;
                scores: Record<string, number>;
            };
        };
    };
    /** Processing metrics */
    metrics: {
        totalTime: number;
        steps: Array<{ name: string; duration: number }>;
    };
    /** Current cognitive state snapshot */
    state: CognitiveStateSnapshot;
}

/** Quick process request (simplified) */
export interface CognitiveQuickProcessRequest {
    message: string;
    chatId?: number;
}

/** Quick process response (just the text) */
export interface CognitiveQuickProcessResponse {
    response: string;
}

/** Cognitive state snapshot */
export interface CognitiveStateSnapshot {
    activeStreams: Array<{
        id: string;
        phase: string;
        status: string;
    }>;
    emotionalState: EmotionalStateSnapshot;
    currentPhase: number;
    cycleNumber: number;
}

/** Emotional state snapshot */
export interface EmotionalStateSnapshot {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    contempt: number;
    interest: number;
    dominant: string;
    valence: number;
    arousal: number;
}

/** Update emotional state request */
export interface EmotionalStateUpdateRequest {
    emotions: Partial<{
        joy: number;
        sadness: number;
        anger: number;
        fear: number;
        surprise: number;
        disgust: number;
        contempt: number;
        interest: number;
    }>;
}

/** Message history item */
export interface MessageHistoryItem {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

/** Get history request */
export interface GetHistoryRequest {
    limit?: number;
    chatId?: number;
}

/** Get history response */
export interface GetHistoryResponse {
    messages: MessageHistoryItem[];
    totalCount: number;
}

/** Export conversation request */
export interface ExportConversationRequest {
    chatId?: number;
}

/** Export conversation response */
export interface ExportConversationResponse {
    messages: MessageHistoryItem[];
    state: CognitiveStateSnapshot;
    chatId?: number;
    exportedAt: number;
}

/** Import conversation request */
export interface ImportConversationRequest {
    messages: MessageHistoryItem[];
    chatId?: number;
    state?: Partial<CognitiveStateSnapshot>;
}

/** Cognitive statistics */
export interface CognitiveStatistics {
    messagesProcessed: number;
    averageResponseTime: number;
    currentCognitiveLoad: number;
    memoryUsage: number;
    uptime: number;
}

// ============================================================================
// Memory Protocol Types
// ============================================================================

/** Memory search request */
export interface MemorySearchRequest {
    query: string;
    chatId?: number;
    limit?: number;
    threshold?: number;
}

/** Memory search result */
export interface MemorySearchResult {
    id: string;
    content: string;
    score: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

/** Memory search response */
export interface MemorySearchResponse {
    results: MemorySearchResult[];
    totalFound: number;
}

/** Memory store request */
export interface MemoryStoreRequest {
    content: string;
    chatId?: number;
    type?: 'message' | 'fact' | 'preference' | 'context';
    metadata?: Record<string, unknown>;
}

/** Memory store response */
export interface MemoryStoreResponse {
    id: string;
    stored: boolean;
}

/** Get memory context request */
export interface MemoryContextRequest {
    chatId?: number;
    limit?: number;
}

/** Memory context response */
export interface MemoryContextResponse {
    context: string[];
    relevantMemories: MemorySearchResult[];
}

// ============================================================================
// Persona Protocol Types
// ============================================================================

/** Persona information */
export interface PersonaInfo {
    personality: string;
    emotionalState: EmotionalStateSnapshot;
    cognitiveState: {
        creativity: number;
        analyticalDepth: number;
        empathy: number;
        curiosity: number;
    };
    preferences: Record<string, unknown>;
}

/** Persona update request */
export interface PersonaUpdateRequest {
    personality?: string;
    preferences?: Record<string, unknown>;
}

// ============================================================================
// System Protocol Types
// ============================================================================

/** System status response */
export interface SystemStatusResponse {
    running: boolean;
    uptime: number;
    version: string;
    components: {
        cognitive: { status: 'ready' | 'initializing' | 'error'; ready: boolean };
        memory: { status: 'enabled' | 'disabled'; entryCount: number };
        persona: { status: 'active' | 'inactive'; dominantEmotion: string };
        ipc: { status: 'running' | 'stopped'; clientCount: number };
        deltachat: { status: 'connected' | 'disconnected' | 'disabled' };
        dovecot: { status: 'running' | 'stopped' | 'disabled' };
    };
    processingStats: {
        totalMessages: number;
        basicTierMessages: number;
        sys6TierMessages: number;
        membraneTierMessages: number;
        aarEnhancedMessages: number;
        averageComplexity: number;
    };
}

/** System metrics response */
export interface SystemMetricsResponse {
    cpu: {
        usage: number;
        cores: number;
    };
    memory: {
        used: number;
        total: number;
        heapUsed: number;
        heapTotal: number;
    };
    uptime: number;
    clientsConnected: number;
}

// ============================================================================
// Storage Protocol Types
// ============================================================================

/** Storage get request */
export interface StorageGetRequest {
    key: string;
}

/** Storage get response */
export interface StorageGetResponse {
    value: unknown;
    exists: boolean;
}

/** Storage set request */
export interface StorageSetRequest {
    key: string;
    value: unknown;
    ttl?: number; // Time to live in seconds
}

/** Storage delete request */
export interface StorageDeleteRequest {
    key: string;
}

/** Storage keys request */
export interface StorageKeysRequest {
    prefix?: string;
}

/** Storage keys response */
export interface StorageKeysResponse {
    keys: string[];
}

// ============================================================================
// Event Types
// ============================================================================

/** Event subscription request */
export interface SubscribeRequest {
    eventTypes: string[];
}

/** Event notification */
export interface EventNotification {
    eventType: string;
    data: unknown;
    timestamp: number;
}

/** Available event types */
export enum IPCEventType {
    // Cognitive events
    MESSAGE_RECEIVED = 'cognitive:message_received',
    MESSAGE_PROCESSED = 'cognitive:message_processed',
    EMOTIONAL_STATE_CHANGED = 'cognitive:emotional_state_changed',
    COGNITIVE_STATE_CHANGED = 'cognitive:cognitive_state_changed',

    // System events
    COMPONENT_STATUS_CHANGED = 'system:component_status_changed',
    ERROR_OCCURRED = 'system:error',
    WARNING = 'system:warning',

    // Chat events
    CHAT_MESSAGE_SENT = 'chat:message_sent',
    CHAT_MESSAGE_RECEIVED = 'chat:message_received',
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Create a typed IPC message
 */
export function createIPCMessage<T>(
    type: IPCMessageType,
    payload: T,
    id?: string
): IPCMessage<T> {
    return {
        id: id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type,
        payload,
        timestamp: Date.now(),
    };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): IPCResponse<T> {
    return {
        success: true,
        data,
    };
}

/**
 * Create an error response
 */
export function createErrorResponse(
    code: string,
    message: string,
    details?: unknown
): IPCResponse<never> {
    return {
        success: false,
        error: { code, message, details },
    };
}

/**
 * Type guard for IPC messages
 */
export function isIPCMessage(obj: unknown): obj is IPCMessage {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'type' in obj &&
        'timestamp' in obj
    );
}

/**
 * Type map for request/response pairs
 * This enables type-safe IPC communication
 */
export interface IPCTypeMap {
    [IPCMessageType.COGNITIVE_PROCESS]: {
        request: CognitiveProcessRequest;
        response: CognitiveProcessResponse;
    };
    [IPCMessageType.COGNITIVE_QUICK_PROCESS]: {
        request: CognitiveQuickProcessRequest;
        response: CognitiveQuickProcessResponse;
    };
    [IPCMessageType.COGNITIVE_GET_STATE]: {
        request: void;
        response: CognitiveStateSnapshot;
    };
    [IPCMessageType.COGNITIVE_GET_EMOTIONAL_STATE]: {
        request: void;
        response: EmotionalStateSnapshot;
    };
    [IPCMessageType.COGNITIVE_UPDATE_EMOTIONAL_STATE]: {
        request: EmotionalStateUpdateRequest;
        response: EmotionalStateSnapshot;
    };
    [IPCMessageType.COGNITIVE_GET_HISTORY]: {
        request: GetHistoryRequest;
        response: GetHistoryResponse;
    };
    [IPCMessageType.COGNITIVE_CLEAR_HISTORY]: {
        request: void;
        response: { cleared: boolean };
    };
    [IPCMessageType.COGNITIVE_EXPORT]: {
        request: ExportConversationRequest;
        response: ExportConversationResponse;
    };
    [IPCMessageType.COGNITIVE_IMPORT]: {
        request: ImportConversationRequest;
        response: { imported: boolean };
    };
    [IPCMessageType.COGNITIVE_GET_STATISTICS]: {
        request: void;
        response: CognitiveStatistics;
    };
    [IPCMessageType.MEMORY_SEARCH]: {
        request: MemorySearchRequest;
        response: MemorySearchResponse;
    };
    [IPCMessageType.MEMORY_STORE]: {
        request: MemoryStoreRequest;
        response: MemoryStoreResponse;
    };
    [IPCMessageType.MEMORY_GET_CONTEXT]: {
        request: MemoryContextRequest;
        response: MemoryContextResponse;
    };
    [IPCMessageType.MEMORY_CLEAR]: {
        request: { chatId?: number };
        response: { cleared: boolean };
    };
    [IPCMessageType.PERSONA_GET]: {
        request: void;
        response: PersonaInfo;
    };
    [IPCMessageType.PERSONA_UPDATE]: {
        request: PersonaUpdateRequest;
        response: PersonaInfo;
    };
    [IPCMessageType.PERSONA_GET_EMOTIONAL_STATE]: {
        request: void;
        response: EmotionalStateSnapshot;
    };
    [IPCMessageType.PERSONA_GET_COGNITIVE_STATE]: {
        request: void;
        response: { creativity: number; analyticalDepth: number; empathy: number; curiosity: number };
    };
    [IPCMessageType.SYSTEM_STATUS]: {
        request: void;
        response: SystemStatusResponse;
    };
    [IPCMessageType.SYSTEM_METRICS]: {
        request: void;
        response: SystemMetricsResponse;
    };
    [IPCMessageType.STORAGE_GET]: {
        request: StorageGetRequest;
        response: StorageGetResponse;
    };
    [IPCMessageType.STORAGE_SET]: {
        request: StorageSetRequest;
        response: { success: boolean };
    };
    [IPCMessageType.STORAGE_DELETE]: {
        request: StorageDeleteRequest;
        response: { success: boolean };
    };
    [IPCMessageType.STORAGE_KEYS]: {
        request: StorageKeysRequest;
        response: StorageKeysResponse;
    };
    [IPCMessageType.PING]: {
        request: void;
        response: { pong: true; timestamp: number };
    };
    [IPCMessageType.SUBSCRIBE]: {
        request: SubscribeRequest;
        response: { subscribed: string[] };
    };
    [IPCMessageType.UNSUBSCRIBE]: {
        request: { eventTypes: string[] };
        response: { unsubscribed: string[] };
    };
}
