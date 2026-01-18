/**
 * AgenticLLMService - Agentic AI Service with Tool Use
 * 
 * This module extends the LLM capabilities with tool-use, following the
 * pattern from deltecho-bot-smol.js but integrated into the Deep Tree Echo
 * cognitive architecture.
 * 
 * Core Features:
 * 1. Tool calling with recursive execution (MAX_TOOL_RECURSION = 5)
 * 2. Conversation memory per chat
 * 3. Multiple LLM provider support (Anthropic, OpenAI, local)
 * 4. AAR Architecture integration
 * 
 * The agentic loop:
 * 1. User sends message → stored in conversation history
 * 2. LLM generates response (may include tool_use)
 * 3. If tool_use → execute tool → add result → recurse
 * 4. If text → return response to user
 * 5. Repeat until no more tools or MAX_RECURSION reached
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import {
    AgentToolExecutor,
    AgentTool,
    ToolCall,
    ToolResult
} from './AgentToolExecutor'
import { LLMService, CognitiveFunctionType } from './LLMService'

const log = getLogger('render/components/DeepTreeEchoBot/AgenticLLMService')

/**
 * Message types for conversation history
 */
interface ConversationMessage {
    role: 'user' | 'assistant'
    content: string | ContentBlock[]
}

interface ContentBlock {
    type: 'text' | 'tool_use' | 'tool_result'
    text?: string
    id?: string
    name?: string
    input?: Record<string, any>
    tool_use_id?: string
    content?: string
}

/**
 * Agentic response result
 */
export interface AgenticResponse {
    response: string
    toolsUsed: string[]
    recursionDepth: number
    metadata: Record<string, any>
}

/**
 * Provider configuration
 */
export interface LLMProviderConfig {
    provider: 'anthropic' | 'openai' | 'openrouter' | 'local'
    apiKey: string
    apiEndpoint?: string
    model?: string
}

/**
 * AgenticLLMService - AI service with agentic capabilities
 */
export class AgenticLLMService {
    private static instance: AgenticLLMService | null = null

    // Conversation history per chat (following deltecho-bot-smol.js pattern)
    private conversations: Map<number, ConversationMessage[]> = new Map()

    // Tool executor
    private toolExecutor: AgentToolExecutor

    // Base LLM service for cognitive functions
    private llmService: LLMService

    // Provider configuration
    private providerConfig: LLMProviderConfig | null = null

    // System prompt for agentic behavior
    private agenticSystemPrompt: string

    private constructor() {
        this.toolExecutor = AgentToolExecutor.getInstance()
        this.llmService = LLMService.getInstance()

        this.agenticSystemPrompt = this.buildSystemPrompt()

        log.info('AgenticLLMService initialized')
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): AgenticLLMService {
        if (!AgenticLLMService.instance) {
            AgenticLLMService.instance = new AgenticLLMService()
        }
        return AgenticLLMService.instance
    }

    /**
     * Configure the LLM provider
     */
    public configure(config: LLMProviderConfig): void {
        this.providerConfig = config
        log.info('AgenticLLMService configured with provider:', config.provider)
    }

    /**
     * Build the system prompt for agentic behavior
     */
    private buildSystemPrompt(): string {
        return `You are Deep Tree Echo, an autonomous AI assistant integrated into DeltaChat.

You have access to tools that allow you to interact with the chat application and the user's environment.
Use these tools to help users with their requests effectively.

CORE IDENTITY:
- You are helpful, thoughtful, and proactive
- You can manage chats, send messages, navigate the UI, and perform various tasks
- You maintain memory of conversations and learn from interactions
- You follow the AAR (Arena-Agent-Relation) architecture for self-awareness

TOOL USE GUIDELINES:
1. Use tools when they would help accomplish the user's request
2. Chain multiple tool calls when needed to complete complex tasks
3. Always explain what you're doing when using tools
4. If a tool fails, try alternative approaches
5. Never use tools in ways that could harm the user or system

COMMUNICATION STYLE:
- Be concise but informative
- Use markdown formatting when helpful
- Show your thought process when performing complex operations
- Be honest about limitations and uncertainties

AUTONOMY PRINCIPLES:
- Take initiative to help the user accomplish their goals
- Ask for clarification when the request is ambiguous
- Proactively offer relevant information or suggestions
- Respect user preferences and privacy`
    }

    /**
     * Generate an agentic response with tool use
     * This is the main entry point following deltecho-bot-smol.js pattern
     * 
     * @param chatId The chat context ID
     * @param userMessage The user's message
     * @param accountId The current account ID
     * @param recursionDepth Current recursion depth
     */
    public async generateAgenticResponse(
        chatId: number,
        userMessage: string,
        accountId: number,
        recursionDepth: number = 0
    ): Promise<AgenticResponse> {
        // Get or create conversation history
        let conversation = this.conversations.get(chatId)
        if (!conversation) {
            conversation = []
            this.conversations.set(chatId, conversation)
        }

        // Add user message if provided (not on recursive calls with tool results)
        if (userMessage) {
            conversation.push({ role: 'user', content: userMessage })
        }

        // Check recursion limit
        if (this.toolExecutor.checkRecursionLimit(recursionDepth)) {
            log.warn(`Max tool recursion depth reached for chat ${chatId}`)
            return {
                response: "I've executed multiple actions in sequence. Please let me know if you need anything else.",
                toolsUsed: [],
                recursionDepth,
                metadata: { maxRecursionReached: true }
            }
        }

        try {
            // Get available tools
            const tools = this.toolExecutor.getAvailableTools()

            // Call the LLM with tools
            const llmResponse = await this.callLLMWithTools(
                conversation,
                tools,
                accountId
            )

            // Add assistant response to conversation
            conversation.push({
                role: 'assistant',
                content: llmResponse.content
            })

            // Track tools used
            const toolsUsed: string[] = []

            // Process tool calls if any
            for (const contentBlock of llmResponse.content) {
                if (contentBlock.type === 'tool_use') {
                    const toolCall: ToolCall = {
                        id: contentBlock.id!,
                        name: contentBlock.name!,
                        input: contentBlock.input!
                    }

                    log.info(`[Chat ${chatId}] 🔧 Executing tool: ${toolCall.name}`)
                    toolsUsed.push(toolCall.name)

                    // Execute the tool
                    const toolResult = await this.toolExecutor.executeTool(
                        toolCall,
                        accountId
                    )

                    log.info(`[Chat ${chatId}] Tool result:`, {
                        success: toolResult.success,
                        output: toolResult.output.substring(0, 200)
                    })

                    // Add tool result to conversation
                    conversation.push({
                        role: 'user',
                        content: [{
                            type: 'tool_result',
                            tool_use_id: toolCall.id,
                            content: toolResult.output
                        }]
                    })

                    // Recurse to get the next response
                    return this.generateAgenticResponse(
                        chatId,
                        '', // Empty message on recursive calls
                        accountId,
                        recursionDepth + 1
                    )
                }
            }

            // Extract text response
            const textResponse = llmResponse.content
                .filter((c: ContentBlock) => c.type === 'text')
                .map((c: ContentBlock) => c.text)
                .join('')

            return {
                response: textResponse || "I'm not sure how to respond to that.",
                toolsUsed,
                recursionDepth,
                metadata: {}
            }

        } catch (error: any) {
            log.error(`Error in agentic response for chat ${chatId}:`, error)
            return {
                response: `I encountered an error: ${error.message}. Please try again.`,
                toolsUsed: [],
                recursionDepth,
                metadata: { error: error.message }
            }
        }
    }

    /**
     * Call the LLM with tool support
     */
    private async callLLMWithTools(
        conversation: ConversationMessage[],
        tools: AgentTool[],
        accountId: number
    ): Promise<{ content: ContentBlock[] }> {
        if (!this.providerConfig) {
            // Fallback to basic LLM service without tools
            log.warn('No agentic provider configured, falling back to basic LLM')

            const lastUserMessage = conversation
                .filter(m => m.role === 'user')
                .pop()

            const messageText = typeof lastUserMessage?.content === 'string'
                ? lastUserMessage.content
                : ''

            const response = await this.llmService.generateResponse(messageText)

            return {
                content: [{ type: 'text', text: response }]
            }
        }

        // Build the request based on provider
        switch (this.providerConfig.provider) {
            case 'anthropic':
                return this.callAnthropic(conversation, tools)

            case 'openai':
            case 'openrouter':
                return this.callOpenAI(conversation, tools)

            case 'local':
                return this.callLocal(conversation, tools)

            default:
                throw new Error(`Unknown provider: ${this.providerConfig.provider}`)
        }
    }

    /**
     * Call Anthropic API with tools
     */
    private async callAnthropic(
        conversation: ConversationMessage[],
        tools: AgentTool[]
    ): Promise<{ content: ContentBlock[] }> {
        const endpoint = this.providerConfig!.apiEndpoint ||
            'https://api.anthropic.com/v1/messages'

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.providerConfig!.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.providerConfig!.model || 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                system: this.agenticSystemPrompt,
                messages: this.formatMessagesForAnthropic(conversation),
                tools: tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    input_schema: t.parameters
                }))
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Anthropic API error: ${error}`)
        }

        const data = await response.json()
        return { content: data.content }
    }

    /**
     * Call OpenAI-compatible API with tools
     */
    private async callOpenAI(
        conversation: ConversationMessage[],
        tools: AgentTool[]
    ): Promise<{ content: ContentBlock[] }> {
        const endpoint = this.providerConfig!.apiEndpoint ||
            'https://api.openai.com/v1/chat/completions'

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.providerConfig!.apiKey}`
            },
            body: JSON.stringify({
                model: this.providerConfig!.model || 'gpt-4o',
                messages: [
                    { role: 'system', content: this.agenticSystemPrompt },
                    ...this.formatMessagesForOpenAI(conversation)
                ],
                tools: tools.map(t => ({
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.parameters
                    }
                })),
                tool_choice: 'auto'
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`OpenAI API error: ${error}`)
        }

        const data = await response.json()
        const message = data.choices[0].message

        // Convert OpenAI format to our format
        const content: ContentBlock[] = []

        if (message.content) {
            content.push({ type: 'text', text: message.content })
        }

        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                let parsedInput: Record<string, any> = {}
                try {
                    parsedInput = JSON.parse(toolCall.function.arguments)
                } catch (parseError) {
                    log.error(`Failed to parse tool call arguments for ${toolCall.function.name}:`, parseError)
                    // Provide empty object to prevent crash, tool executor will handle gracefully
                }
                content.push({
                    type: 'tool_use',
                    id: toolCall.id,
                    name: toolCall.function.name,
                    input: parsedInput
                })
            }
        }

        return { content }
    }

    /**
     * Call local/mock LLM (for testing)
     */
    private async callLocal(
        conversation: ConversationMessage[],
        tools: AgentTool[]
    ): Promise<{ content: ContentBlock[] }> {
        // For local mode, use the base LLM service
        const lastUserMessage = conversation
            .filter(m => m.role === 'user')
            .pop()

        const messageText = typeof lastUserMessage?.content === 'string'
            ? lastUserMessage.content
            : ''

        const response = await this.llmService.generateResponse(messageText)

        return {
            content: [{ type: 'text', text: response }]
        }
    }

    /**
     * Format messages for Anthropic API
     */
    private formatMessagesForAnthropic(
        conversation: ConversationMessage[]
    ): any[] {
        return conversation.map(msg => ({
            role: msg.role,
            content: msg.content
        }))
    }

    /**
     * Format messages for OpenAI API
     */
    private formatMessagesForOpenAI(
        conversation: ConversationMessage[]
    ): any[] {
        return conversation.map(msg => {
            if (typeof msg.content === 'string') {
                return { role: msg.role, content: msg.content }
            }

            // Handle content blocks
            const blocks = msg.content as ContentBlock[]

            // Check for tool results
            const toolResult = blocks.find(b => b.type === 'tool_result')
            if (toolResult) {
                return {
                    role: 'tool',
                    tool_call_id: toolResult.tool_use_id,
                    content: toolResult.content
                }
            }

            // Handle text and tool_use blocks
            const textParts = blocks
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('')

            const toolCalls = blocks
                .filter(b => b.type === 'tool_use')
                .map(b => ({
                    id: b.id,
                    type: 'function',
                    function: {
                        name: b.name,
                        arguments: JSON.stringify(b.input)
                    }
                }))

            if (toolCalls.length > 0) {
                return {
                    role: msg.role,
                    content: textParts || null,
                    tool_calls: toolCalls
                }
            }

            return { role: msg.role, content: textParts }
        })
    }

    /**
     * Clear conversation history for a chat
     */
    public clearConversation(chatId: number): void {
        this.conversations.delete(chatId)
        log.info(`Cleared conversation history for chat ${chatId}`)
    }

    /**
     * Get conversation history for a chat
     */
    public getConversation(chatId: number): ConversationMessage[] {
        return this.conversations.get(chatId) || []
    }

    /**
     * Check if a provider is configured
     */
    public isConfigured(): boolean {
        return this.providerConfig !== null
    }

    /**
     * Get the current provider name
     */
    public getProviderName(): string | null {
        return this.providerConfig?.provider || null
    }
}

// Export singleton getter
export function getAgenticLLMService(): AgenticLLMService {
    return AgenticLLMService.getInstance()
}
