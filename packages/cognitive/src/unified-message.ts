/**
 * Unified Message Handler for Deep Tree Echo
 *
 * Provides standardized message creation, transformation, and
 * metadata enrichment for cognitive processing.
 */

import {
    UnifiedMessage,
    MessageMetadata,
    SentimentScore,
    EmotionalVector,
} from './types';

/**
 * Options for creating a message
 */
export interface CreateMessageOptions {
    /** Message role */
    role: 'user' | 'assistant' | 'system';
    /** Message content */
    content: string;
    /** Optional ID (auto-generated if not provided) */
    id?: string;
    /** Optional timestamp (current time if not provided) */
    timestamp?: number;
    /** Initial metadata */
    metadata?: Partial<MessageMetadata>;
}

/**
 * Message history for conversation tracking
 */
export interface MessageHistory {
    /** All messages in order */
    messages: UnifiedMessage[];
    /** Maximum messages to keep */
    maxMessages: number;
}

/**
 * UnifiedMessageHandler manages message creation and history
 */
export class UnifiedMessageHandler {
    private history: UnifiedMessage[] = [];
    private maxHistory: number;

    constructor(maxHistory: number = 100) {
        this.maxHistory = maxHistory;
    }

    /**
     * Create a new unified message
     */
    createMessage(options: CreateMessageOptions): UnifiedMessage {
        const message: UnifiedMessage = {
            id: options.id ?? this.generateId(),
            timestamp: options.timestamp ?? Date.now(),
            role: options.role,
            content: options.content,
            metadata: {
                ...options.metadata,
            },
        };

        return message;
    }

    /**
     * Create a user message
     */
    createUserMessage(content: string, metadata?: Partial<MessageMetadata>): UnifiedMessage {
        return this.createMessage({
            role: 'user',
            content,
            metadata,
        });
    }

    /**
     * Create an assistant message
     */
    createAssistantMessage(content: string, metadata?: Partial<MessageMetadata>): UnifiedMessage {
        return this.createMessage({
            role: 'assistant',
            content,
            metadata,
        });
    }

    /**
     * Create a system message
     */
    createSystemMessage(content: string, metadata?: Partial<MessageMetadata>): UnifiedMessage {
        return this.createMessage({
            role: 'system',
            content,
            metadata,
        });
    }

    /**
     * Enrich message with sentiment analysis
     */
    enrichWithSentiment(message: UnifiedMessage, sentiment: SentimentScore): UnifiedMessage {
        return {
            ...message,
            metadata: {
                ...message.metadata,
                sentiment,
            },
        };
    }

    /**
     * Enrich message with emotional state
     */
    enrichWithEmotion(message: UnifiedMessage, emotion: EmotionalVector): UnifiedMessage {
        return {
            ...message,
            metadata: {
                ...message.metadata,
                emotion,
            },
        };
    }

    /**
     * Enrich message with memory references
     */
    enrichWithMemories(message: UnifiedMessage, memoryIds: string[]): UnifiedMessage {
        return {
            ...message,
            metadata: {
                ...message.metadata,
                memoryReferences: memoryIds,
            },
        };
    }

    /**
     * Enrich message with processing metrics
     */
    enrichWithMetrics(
        message: UnifiedMessage,
        metrics: { cognitiveLoad?: number; processingTime?: number }
    ): UnifiedMessage {
        return {
            ...message,
            metadata: {
                ...message.metadata,
                cognitiveLoad: metrics.cognitiveLoad,
                processingTime: metrics.processingTime,
            },
        };
    }

    /**
     * Add message to history
     */
    addToHistory(message: UnifiedMessage): void {
        this.history.push(message);

        // Trim if over limit
        while (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Get recent messages from history
     */
    getRecentMessages(count: number = 10): UnifiedMessage[] {
        return this.history.slice(-count);
    }

    /**
     * Get messages by role
     */
    getMessagesByRole(role: 'user' | 'assistant' | 'system'): UnifiedMessage[] {
        return this.history.filter(m => m.role === role);
    }

    /**
     * Get message by ID
     */
    getMessageById(id: string): UnifiedMessage | undefined {
        return this.history.find(m => m.id === id);
    }

    /**
     * Get conversation context as formatted string
     */
    getContextString(messageCount: number = 5): string {
        const recent = this.getRecentMessages(messageCount);
        return recent
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');
    }

    /**
     * Get history length
     */
    getHistoryLength(): number {
        return this.history.length;
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Export history for persistence
     */
    exportHistory(): UnifiedMessage[] {
        return [...this.history];
    }

    /**
     * Import history from persistence
     */
    importHistory(messages: UnifiedMessage[]): void {
        this.history = messages.slice(-this.maxHistory);
    }

    /**
     * Get conversation summary statistics
     */
    getStatistics(): {
        totalMessages: number;
        userMessages: number;
        assistantMessages: number;
        systemMessages: number;
        averageLength: number;
        timeSpan: number;
    } {
        const userMsgs = this.history.filter(m => m.role === 'user');
        const assistantMsgs = this.history.filter(m => m.role === 'assistant');
        const systemMsgs = this.history.filter(m => m.role === 'system');

        const totalLength = this.history.reduce((sum, m) => sum + m.content.length, 0);
        const averageLength = this.history.length > 0 ? totalLength / this.history.length : 0;

        let timeSpan = 0;
        if (this.history.length > 1) {
            timeSpan = this.history[this.history.length - 1].timestamp - this.history[0].timestamp;
        }

        return {
            totalMessages: this.history.length,
            userMessages: userMsgs.length,
            assistantMessages: assistantMsgs.length,
            systemMessages: systemMsgs.length,
            averageLength: Math.round(averageLength),
            timeSpan,
        };
    }

    /**
     * Search messages by content
     */
    searchMessages(query: string): UnifiedMessage[] {
        const lowerQuery = query.toLowerCase();
        return this.history.filter(m =>
            m.content.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get messages with specific emotion
     */
    getMessagesByEmotion(emotion: string): UnifiedMessage[] {
        return this.history.filter(m =>
            m.metadata.emotion?.dominant === emotion
        );
    }

    /**
     * Get messages with positive sentiment
     */
    getPositiveMessages(threshold: number = 0.3): UnifiedMessage[] {
        return this.history.filter(m =>
            m.metadata.sentiment && m.metadata.sentiment.polarity >= threshold
        );
    }

    /**
     * Get messages with negative sentiment
     */
    getNegativeMessages(threshold: number = -0.3): UnifiedMessage[] {
        return this.history.filter(m =>
            m.metadata.sentiment && m.metadata.sentiment.polarity <= threshold
        );
    }

    /**
     * Generate unique message ID
     */
    private generateId(): string {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Create a unified message handler
 */
export function createMessageHandler(maxHistory?: number): UnifiedMessageHandler {
    return new UnifiedMessageHandler(maxHistory);
}

/**
 * Format messages for LLM context
 */
export function formatMessagesForLLM(
    messages: UnifiedMessage[],
    options: {
        includeTimestamps?: boolean;
        includeMetadata?: boolean;
        maxLength?: number;
    } = {}
): string {
    const { includeTimestamps = false, includeMetadata = false, maxLength } = options;

    let formatted = messages.map(m => {
        let line = `${m.role.toUpperCase()}: ${m.content}`;

        if (includeTimestamps) {
            const date = new Date(m.timestamp);
            line = `[${date.toISOString()}] ${line}`;
        }

        if (includeMetadata && m.metadata.emotion) {
            line += ` [emotion: ${m.metadata.emotion.dominant}]`;
        }

        return line;
    }).join('\n\n');

    if (maxLength && formatted.length > maxLength) {
        formatted = formatted.slice(-maxLength);
        // Find first complete message
        const firstNewline = formatted.indexOf('\n\n');
        if (firstNewline > 0) {
            formatted = formatted.slice(firstNewline + 2);
        }
    }

    return formatted;
}

/**
 * Extract key topics from messages
 */
export function extractTopics(messages: UnifiedMessage[]): string[] {
    const wordFreq = new Map<string, number>();
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
        'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they',
        'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
        'and', 'but', 'or', 'so', 'if', 'then', 'because', 'while',
    ]);

    for (const msg of messages) {
        const words = msg.content.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !stopWords.has(w));

        for (const word of words) {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
    }

    // Sort by frequency and return top topics
    return Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}
