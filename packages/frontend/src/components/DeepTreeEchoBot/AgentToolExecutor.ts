/**
 * AgentToolExecutor - Gives Deep Tree Echo the ability to execute actions
 * 
 * Following the AAR Architecture:
 * - Ao (Arena): The actual environment (DeltaChat, filesystem, web)
 * - Ai (Agent): Deep Tree Echo with tool capabilities
 * - S (Self): Relational interface between agent and world
 * - Vi (Virtual Agent): Self-model of capabilities
 * - Vo (Virtual Arena): World-view as understood by the agent
 * 
 * This module implements the "hands" of Tree-Echo - the ability to:
 * 1. Execute shell commands (like bash in deltecho-bot-smol.js)
 * 2. Manage chats programmatically 
 * 3. Navigate the UI as a user would
 * 4. Perform web operations
 * 
 * Following the inverted mirror pattern:
 *   Actual World: Arena contains Agent
 *   Virtual Model: Agent's world-view lives inside its self-model
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { BackendRemote } from '../../backend-com'
import { DeepTreeEchoChatManager } from './DeepTreeEchoChatManager'
import { DeepTreeEchoUIBridge } from './DeepTreeEchoUIBridge'

const log = getLogger('render/components/DeepTreeEchoBot/AgentToolExecutor')

/**
 * Tool definition following the AAR pattern
 */
export interface AgentTool {
    name: string
    description: string
    parameters: {
        type: 'object'
        properties: Record<string, {
            type: string
            description: string
            enum?: string[]
            items?: { type: string }
            default?: any
        }>
        required: string[]
    }
}

/**
 * Tool execution result
 */
export interface ToolResult {
    success: boolean
    output: string
    error?: string
    metadata?: Record<string, any>
}

/**
 * Tool call from the LLM
 */
export interface ToolCall {
    id: string
    name: string
    input: Record<string, any>
}

/**
 * Maximum recursion depth for agentic tool use
 * Prevents infinite loops following deltecho-bot-smol.js pattern
 */
const MAX_TOOL_RECURSION = 5

/**
 * AgentToolExecutor - Executes tools for Deep Tree Echo
 */
export class AgentToolExecutor {
    private static instance: AgentToolExecutor | null = null
    private chatManager: DeepTreeEchoChatManager
    private uiBridge: DeepTreeEchoUIBridge | null = null
    private isElectron: boolean

    // Reasoning Core
    private atomSpace: AtomSpace
    private plnEngine: PLNEngine
    private db: DuckDBAdapter

    // Event Listeners for Visualization
    private listeners: ((event: any) => void)[] = []

    private constructor() {
        this.chatManager = DeepTreeEchoChatManager.getInstance()
        this.isElectron = typeof window !== 'undefined' &&
            (window as any).__TAURI__ === undefined &&
            (window as any).electron !== undefined

        // Initialize Reasoning Core
        this.atomSpace = new AtomSpace()
        this.plnEngine = new PLNEngine(this.atomSpace)

        // Initialize Persistence
        this.db = new DuckDBAdapter()
        this.db.initialize().catch(err => {
            log.error('Failed to initialize DuckDB persistence', err)
        })

        log.info('AgentToolExecutor initialized', { isElectron: this.isElectron })

        // Expose to window for UI components to access
        if (typeof window !== 'undefined') {
            (window as any).deepTreeEchoExecutor = this
        }
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): AgentToolExecutor {
        if (!AgentToolExecutor.instance) {
            AgentToolExecutor.instance = new AgentToolExecutor()
        }
        return AgentToolExecutor.instance
    }

    /**
     * Set the UI bridge for UI interactions
     */
    public setUIBridge(bridge: DeepTreeEchoUIBridge): void {
        this.uiBridge = bridge
        log.info('UI Bridge connected to AgentToolExecutor')
    }

    /**
     * Subscribe to cognitive state updates
     */
    public subscribe(listener: (event: any) => void): () => void {
        this.listeners.push(listener)
        // Send initial state immediately
        // simplified initial state
        listener({
            type: 'init',
            data: {
                atomCount: 0 // Placeholder
            }
        })

        return () => {
            this.listeners = this.listeners.filter(l => l !== listener)
        }
    }

    private emitUpdate(type: string, data: any) {
        const event = { type, timestamp: Date.now(), data }
        this.listeners.forEach(l => l(event))
    }

    /**
     * Get all available tools for the LLM
     * These follow the Anthropic tool_use schema
     */
    public getAvailableTools(): AgentTool[] {
        const tools: AgentTool[] = [
            // ===========================================
            // CHAT MANAGEMENT TOOLS (Ao: Arena Operations)
            // ===========================================
            {
                name: 'list_chats',
                description: 'List all available chats for the current account',
                parameters: {
                    type: 'object',
                    properties: {
                        accountId: {
                            type: 'number',
                            description: 'The account ID to list chats for'
                        },
                        filter: {
                            type: 'string',
                            description: 'Optional filter: all, unread, groups, direct',
                            enum: ['all', 'unread', 'groups', 'direct']
                        }
                    },
                    required: ['accountId']
                }
            },
            {
                name: 'open_chat',
                description: 'Open a specific chat window in the UI',
                parameters: {
                    type: 'object',
                    properties: {
                        accountId: {
                            type: 'number',
                            description: 'The account ID'
                        },
                        chatId: {
                            type: 'number',
                            description: 'The chat ID to open'
                        }
                    },
                    required: ['accountId', 'chatId']
                }
            },
            {
                name: 'send_message',
                description: 'Send a message to a specific chat',
                parameters: {
                    type: 'object',
                    properties: {
                        accountId: {
                            type: 'number',
                            description: 'The account ID'
                        },
                        chatId: {
                            type: 'number',
                            description: 'The chat ID to send to'
                        },
                        text: {
                            type: 'string',
                            description: 'The message text to send'
                        }
                    },
                    required: ['accountId', 'chatId', 'text']
                }
            },
            {
                name: 'get_chat_history',
                description: 'Get recent messages from a chat',
                parameters: {
                    type: 'object',
                    properties: {
                        accountId: {
                            type: 'number',
                            description: 'The account ID'
                        },
                        chatId: {
                            type: 'number',
                            description: 'The chat ID'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of messages to retrieve (default: 10)'
                        }
                    },
                    required: ['accountId', 'chatId']
                }
            },
            {
                name: 'create_chat',
                description: 'Create a new chat with a contact by email',
                parameters: {
                    type: 'object',
                    properties: {
                        accountId: {
                            type: 'number',
                            description: 'The account ID'
                        },
                        contactEmail: {
                            type: 'string',
                            description: 'The email address of the contact'
                        }
                    },
                    required: ['accountId', 'contactEmail']
                }
            },
            {
                name: 'search_contacts',
                description: 'Search for contacts by name or email',
                parameters: {
                    type: 'object',
                    properties: {
                        accountId: {
                            type: 'number',
                            description: 'The account ID'
                        },
                        query: {
                            type: 'string',
                            description: 'Search query for contact name or email'
                        }
                    },
                    required: ['accountId', 'query']
                }
            },

            // ===========================================
            // UI NAVIGATION TOOLS (Ai: Agent Interface)
            // ===========================================
            {
                name: 'navigate_ui',
                description: 'Navigate to a specific part of the application UI',
                parameters: {
                    type: 'object',
                    properties: {
                        view: {
                            type: 'string',
                            description: 'The view to navigate to',
                            enum: ['settings', 'ai_hub', 'chat_list', 'help', 'about']
                        }
                    },
                    required: ['view']
                }
            },
            {
                name: 'focus_composer',
                description: 'Focus the message composer input for the current chat',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'open_dialog',
                description: 'Open a dialog in the application',
                parameters: {
                    type: 'object',
                    properties: {
                        dialogType: {
                            type: 'string',
                            description: 'The type of dialog to open',
                            enum: ['new_chat', 'create_group', 'settings', 'forward_message']
                        }
                    },
                    required: ['dialogType']
                }
            },

            // ===========================================
            // SELF-REFLECTION TOOLS (S: Relational Self)
            // ===========================================
            {
                name: 'reflect',
                description: 'Perform self-reflection on a specific aspect',
                parameters: {
                    type: 'object',
                    properties: {
                        aspect: {
                            type: 'string',
                            description: 'The aspect to reflect on (identity, capabilities, relationships, growth, emotions)'
                        },
                        context: {
                            type: 'string',
                            description: 'Optional context for the reflection'
                        }
                    },
                    required: ['aspect']
                }
            },
            {
                name: 'get_cognitive_status',
                description: 'Get the current status of cognitive functions',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'get_memory_summary',
                description: 'Get a summary of memories for a specific chat',
                parameters: {
                    type: 'object',
                    properties: {
                        chatId: {
                            type: 'number',
                            description: 'The chat ID to get memories for'
                        }
                    },
                    required: ['chatId']
                }
            },

            // ===========================================  
            // SCHEDULING TOOLS (Vo: Virtual Arena / Time)
            // ===========================================
            {
                name: 'schedule_message',
                description: 'Schedule a message to be sent later',
                parameters: {
                    type: 'object',
                    properties: {
                        accountId: {
                            type: 'number',
                            description: 'The account ID'
                        },
                        chatId: {
                            type: 'number',
                            description: 'The chat ID'
                        },
                        text: {
                            type: 'string',
                            description: 'The message text'
                        },
                        delayMinutes: {
                            type: 'number',
                            description: 'Minutes from now to send the message'
                        }
                    },
                    required: ['accountId', 'chatId', 'text', 'delayMinutes']
                }
            },
            {
                name: 'get_current_time',
                description: 'Get the current date and time',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'read_web_page',
                description: 'Read the content of a web page. Useful for researching topics, reading documentation, or getting latest news.',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL to read (must start with http:// or https://)'
                        }
                    },
                    required: ['url']
                }
            },

            // ===========================================
            // REASONING TOOLS (Scientific Genius / Knowledge)
            // ===========================================
            {
                name: 'store_knowledge',
                description: 'Store a fact or relationship in the AtomSpace knowledge base. Example: (ConceptNode "Socrates") (InheritanceLink "Socrates" "Mortal")',
                parameters: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            description: 'The type of Atom (ConceptNode, InheritanceLink, SimilarityLink, etc.)',
                            enum: ['ConceptNode', 'InheritanceLink', 'SimilarityLink', 'EvaluationLink', 'ListLink']
                        },
                        name: {
                            type: 'string',
                            description: 'For Nodes: the name/value. For Links: unused (leave empty)'
                        },
                        outgoing: {
                            type: 'array',
                            description: 'For Links: List of target atom names/IDs. For Nodes: unused.',
                            items: { type: 'string' }
                        },
                        confidence: {
                            type: 'number',
                            description: 'Confidence score (0.0 to 1.0)',
                            default: 1.0
                        }
                    },
                    required: ['type']
                }
            },
            {
                name: 'query_knowledge',
                description: 'Query the AtomSpace for knowledge by type or name.',
                parameters: {
                    type: 'object',
                    properties: {
                        queryType: {
                            type: 'string',
                            description: 'Type of query: by_name, by_type, incoming, outgoing',
                            enum: ['by_name', 'by_type', 'incoming']
                        },
                        target: {
                            type: 'string',
                            description: 'The name or type to search for'
                        }
                    },
                    required: ['queryType', 'target']
                }
            },
            {
                name: 'perform_reasoning',
                description: 'Run a reasoning cycle (forward chaining) to deduce new facts from existing knowledge.',
                parameters: {
                    type: 'object',
                    properties: {
                        steps: {
                            type: 'number',
                            description: 'Number of inference steps to run (default: 1)',
                            default: 1
                        }
                    },
                    required: []
                }
            }
        ]

        // Add bash tool only in Electron environment (safe execution)
        if (this.isElectron) {
            tools.push({
                name: 'execute_command',
                description: 'Execute a shell command (use with caution). Only available for safe operations like reading files or running scripts.',
                parameters: {
                    type: 'object',
                    properties: {
                        command: {
                            type: 'string',
                            description: 'The shell command to execute'
                        },
                        cwd: {
                            type: 'string',
                            description: 'Working directory for the command (optional)'
                        }
                    },
                    required: ['command']
                }
            })
        }

        return tools
    }

    /**
     * Execute a tool call
     * @param toolCall The tool call from the LLM
     * @param accountId Current account context
     * @returns Tool execution result
     */
    public async executeTool(
        toolCall: ToolCall,
        accountId: number
    ): Promise<ToolResult> {
        log.info(`Executing tool: ${toolCall.name}`, toolCall.input)
        this.emitUpdate('tool_execution', { name: toolCall.name, input: toolCall.input })

        try {
            switch (toolCall.name) {
                // ===========================================
                // CHAT MANAGEMENT
                // ===========================================
                case 'list_chats': {
                    const filter = toolCall.input.filter || 'all'
                    const acctId = toolCall.input.accountId || accountId

                    let chats = await this.chatManager.listChats(acctId)

                    // Apply filters
                    if (filter === 'unread') {
                        chats = chats.filter(c => c.unreadCount > 0)
                    } else if (filter === 'groups') {
                        chats = chats.filter(c => c.isGroup)
                    } else if (filter === 'direct') {
                        chats = chats.filter(c => !c.isGroup)
                    }

                    return {
                        success: true,
                        output: JSON.stringify(chats.map(c => ({
                            id: c.id,
                            name: c.name,
                            unread: c.unreadCount,
                            isGroup: c.isGroup,
                            lastMessage: c.lastMessagePreview?.substring(0, 50)
                        })), null, 2),
                        metadata: { count: chats.length }
                    }
                }

                case 'open_chat': {
                    const success = await this.chatManager.openChat(
                        toolCall.input.accountId || accountId,
                        toolCall.input.chatId
                    )
                    return {
                        success,
                        output: success
                            ? `Opened chat ${toolCall.input.chatId}`
                            : `Failed to open chat ${toolCall.input.chatId}`
                    }
                }

                case 'send_message': {
                    await BackendRemote.rpc.miscSendTextMessage(
                        toolCall.input.accountId || accountId,
                        toolCall.input.chatId,
                        toolCall.input.text
                    )
                    return {
                        success: true,
                        output: `Message sent to chat ${toolCall.input.chatId}`
                    }
                }

                case 'get_chat_history': {
                    const limit = toolCall.input.limit || 10
                    const messages = await this.chatManager.getChatHistory(
                        toolCall.input.accountId || accountId,
                        toolCall.input.chatId,
                        limit
                    )
                    return {
                        success: true,
                        output: JSON.stringify(messages.map(m => ({
                            from: m.fromName,
                            text: m.text?.substring(0, 100),
                            time: new Date(m.timestamp * 1000).toISOString(),
                            isOutgoing: m.isOutgoing
                        })), null, 2),
                        metadata: { count: messages.length }
                    }
                }

                case 'create_chat': {
                    const chatId = await this.chatManager.createChat(
                        toolCall.input.accountId || accountId,
                        toolCall.input.contactEmail
                    )
                    return {
                        success: chatId !== null,
                        output: chatId
                            ? `Created chat with ID ${chatId}`
                            : `Failed to create chat with ${toolCall.input.contactEmail}`,
                        metadata: { chatId }
                    }
                }

                case 'search_contacts': {
                    const contacts = await this.chatManager.searchContacts(
                        toolCall.input.accountId || accountId,
                        toolCall.input.query
                    )
                    return {
                        success: true,
                        output: JSON.stringify(contacts.map(c => ({
                            id: c.id,
                            name: c.displayName,
                            email: c.email
                        })), null, 2),
                        metadata: { count: contacts.length }
                    }
                }

                // ===========================================
                // UI NAVIGATION
                // ===========================================
                case 'navigate_ui': {
                    if (!this.uiBridge) {
                        return {
                            success: false,
                            output: 'UI Bridge not available',
                            error: 'UI Bridge not connected'
                        }
                    }

                    try {
                        this.uiBridge.navigateTo(toolCall.input.view)
                        return {
                            success: true,
                            output: `Navigated to ${toolCall.input.view}`
                        }
                    } catch (err: any) {
                        return {
                            success: false,
                            output: `Failed to navigate to ${toolCall.input.view}: ${err.message}`
                        }
                    }
                }

                case 'focus_composer': {
                    if (!this.uiBridge) {
                        return { success: false, output: 'UI Bridge not available' }
                    }
                    this.uiBridge.focusComposer()
                    return { success: true, output: 'Focused composer' }
                }

                case 'open_dialog': {
                    if (!this.uiBridge) {
                        return { success: false, output: 'UI Bridge not available' }
                    }
                    try {
                        this.uiBridge.openDialog(toolCall.input.dialogType)
                        return {
                            success: true,
                            output: `Opened ${toolCall.input.dialogType} dialog`
                        }
                    } catch (err: any) {
                        return {
                            success: false,
                            output: `Failed to open ${toolCall.input.dialogType} dialog: ${err.message}`
                        }
                    }
                }

                // ===========================================
                // SELF-REFLECTION
                // ===========================================
                case 'reflect': {
                    // This will be handled by the SelfReflection module
                    return {
                        success: true,
                        output: `Reflection requested on: ${toolCall.input.aspect}`,
                        metadata: {
                            aspect: toolCall.input.aspect,
                            context: toolCall.input.context
                        }
                    }
                }

                case 'get_cognitive_status': {
                    // Return status of cognitive functions
                    // This is a placeholder - would integrate with LLMService
                    return {
                        success: true,
                        output: JSON.stringify({
                            status: 'active',
                            functions: ['cognitive_core', 'affective_core', 'relevance_core'],
                            memory: 'enabled',
                            parallelProcessing: 'enabled'
                        }, null, 2)
                    }
                }

                case 'get_memory_summary': {
                    const { RAGMemoryStore } = await import('./RAGMemoryStore')
                    const memoryStore = RAGMemoryStore.getInstance()
                    const memories = memoryStore.getConversationContext(toolCall.input.chatId)

                    return {
                        success: true,
                        output: `Found ${memories.length} memories for chat ${toolCall.input.chatId}`,
                        metadata: {
                            count: memories.length,
                            recent: memories.slice(0, 3).map(m => m.text?.substring(0, 50))
                        }
                    }
                }

                // ===========================================
                // WEB RESEARCH (Ai: Agent Interface)
                // ===========================================
                case 'read_web_page': {
                    if (!this.isElectron) {
                        return {
                            success: false,
                            output: 'Web reading is currently only available in the Desktop application.',
                            error: 'Environment not supported'
                        }
                    }

                    try {
                        const ipcRenderer = (window as any).electron?.ipcRenderer
                        if (!ipcRenderer) {
                            return {
                                success: false,
                                output: 'IPC bridge not available.',
                                error: 'IPC Error'
                            }
                        }

                        const result = await ipcRenderer.invoke('perform-web-request', toolCall.input.url)

                        if (result.success) {
                            return {
                                success: true,
                                output: `Title: ${result.title}\n\nContent: ${result.content}`,
                                metadata: result.metadata
                            }
                        } else {
                            return {
                                success: false,
                                output: `Failed to read page: ${result.error}`,
                                error: result.error
                            }
                        }
                    } catch (error: any) {
                        return {
                            success: false,
                            output: `Error performing web request: ${error.message}`,
                            error: error.message
                        }
                    }
                }

                // ===========================================
                // REASONING EXECUTION
                // ===========================================
                case 'store_knowledge': {
                    const { type, name, outgoing, confidence = 1.0 } = toolCall.input

                    try {
                        let atom
                        const tv = createTruthValue(1.0, confidence)

                        if (type === 'ConceptNode') {
                            atom = this.atomSpace.node(name || 'Anonymous', AtomType.ConceptNode, tv)
                        } else {
                            // Link type
                            const atomType = AtomType[type as keyof typeof AtomType] || AtomType.InheritanceLink

                            // Resolve outgoing atoms (assumes they are ConceptNodes for simplicity if just strings)
                            const outAtoms = (outgoing || []).map((n: string) => {
                                // Try to find existing or create new ConceptNode
                                const existing = this.atomSpace.getAtom(n) // Simplified lookup
                                return existing || this.atomSpace.node(n)
                            })

                            atom = this.atomSpace.link(atomType, outAtoms, tv)
                        }

                        // Persist to DuckDB
                        const atomAny = atom as any;
                        const atomName = atomAny.name || undefined;
                        // specific check for truth value object
                        const storedTv = atomAny.tv || atomAny.truthValue;
                        const atomStrength = storedTv ? (storedTv as any).strength : 1.0;
                        const atomConfidence = storedTv ? (storedTv as any).confidence : 1.0;

                        await this.db.storeAtom({
                            id: atom.id,
                            type: atom.type,
                            name: atomName,
                            strength: atomStrength,
                            confidence: atomConfidence,
                            metadata: { outgoing: outgoing }
                        })

                        const result = {
                            success: true,
                            output: `Stored atom: ${atom.toString()}`,
                            metadata: { id: atom.id, type: atom.type }
                        }

                        this.emitUpdate('knowledge_stored', { atom: atom.toString(), type: type })
                        return result
                    } catch (error: any) {
                        return {
                            success: false,
                            output: `Failed to store knowledge: ${error.message}`,
                            error: error.message
                        }
                    }
                }

                case 'query_knowledge': {
                    const { queryType, target } = toolCall.input
                    let results: any[] = []

                    try {
                        if (queryType === 'by_type') {
                            results = await this.db.findAtoms(target);
                        } else if (queryType === 'by_name') {
                            // Use DB findAtoms with name pattern
                            results = await this.db.findAtoms(undefined, target);
                        } else if (queryType === 'incoming') {
                            // For complex queries like incoming, we might need SQL if adapter doesn't support it directly
                            // Or fallback to AtomSpace if synced
                            // Using SQL via db.query for flexibility
                            // Assuming 'links' table has handle_list which likely contains IDs or Names. 
                            // This is a simplification. Real incoming requires traversing the graph.
                            // For now, let's look for links where metadata contains the target name in 'outgoing'
                            // This relies on how we stored it in metadata above
                            const query = `SELECT * FROM atoms WHERE json_extract_string(metadata, '$.outgoing') LIKE '%${target}%'`;
                            try {
                                results = await this.db.query(query);
                            } catch (e) {
                                // Fallback or empty if JSON query fails
                                results = [];
                            }
                        }

                        return {
                            success: true,
                            output: `Found ${results.length} atoms:\n${results.map(a => `${a.type}: ${a.name || a.id}`).join('\n')}`,
                            metadata: { count: results.length }
                        }
                    } catch (err: any) {
                        return {
                            success: false,
                            output: `Query failed: ${err.message}`,
                            error: err.message
                        }
                    }
                }

                case 'perform_reasoning': {
                    const steps = toolCall.input.steps || 1
                    try {
                        let totalNew = 0
                        for (let i = 0; i < steps; i++) {
                            totalNew += this.plnEngine.deduce()
                        }

                        // TODO: Persist new deductions to DB?
                        // complex since we need to know which are new. 
                        // For now, we leave them in-memory only basically, 
                        // unless we iterate and save all.

                        return {
                            success: true,
                            output: `Reasoning completed. Deduced ${totalNew} new facts.`,
                            metadata: { newFacts: totalNew }
                        }
                    } catch (error: any) {
                        return {
                            success: false,
                            output: `Reasoning failed: ${error.message}`,
                            error: error.message
                        }
                    }
                }

                // ===========================================
                // SCHEDULING
                // ===========================================
                case 'schedule_message': {
                    const scheduledTime = Date.now() + (toolCall.input.delayMinutes * 60 * 1000)
                    const reason = toolCall.input.reason || 'Scheduled by agentic tool'
                    const msgId = this.chatManager.scheduleMessage(
                        toolCall.input.accountId || accountId,
                        toolCall.input.chatId,
                        toolCall.input.text,
                        scheduledTime,
                        reason
                    )
                    return {
                        success: true,
                        output: `Message scheduled for ${new Date(scheduledTime).toISOString()}`,
                        metadata: { messageId: msgId, scheduledTime }
                    }
                }

                case 'get_current_time': {
                    const now = new Date()
                    return {
                        success: true,
                        output: JSON.stringify({
                            iso: now.toISOString(),
                            local: now.toLocaleString(),
                            timestamp: now.getTime()
                        }, null, 2)
                    }
                }

                // ===========================================
                // COMMAND EXECUTION (Electron only)
                // ===========================================
                case 'execute_command': {
                    if (!this.isElectron) {
                        return {
                            success: false,
                            output: 'Command execution not available in this environment',
                            error: 'Not running in Electron'
                        }
                    }

                    // Safety check: only allow read-only or safe commands
                    const command = toolCall.input.command as string
                    const safePatterns = [
                        /^ls\s/,
                        /^dir\s/,
                        /^cat\s/,
                        /^type\s/,
                        /^echo\s/,
                        /^pwd$/,
                        /^cd$/,
                        /^date$/,
                        /^whoami$/,
                        /^node\s--version/,
                        /^npm\s(list|ls|view)/,
                        /^git\s(status|log|diff|branch)/
                    ]

                    const isSafe = safePatterns.some(p => p.test(command))
                    if (!isSafe) {
                        return {
                            success: false,
                            output: 'Command not allowed for safety reasons',
                            error: `Unsafe command: ${command}`
                        }
                    }

                    // Execute via IPC if available
                    try {
                        const ipcRenderer = (window as any).electron?.ipcRenderer
                        if (ipcRenderer) {
                            const result = await ipcRenderer.invoke('execute-command', {
                                command,
                                cwd: toolCall.input.cwd
                            })
                            return {
                                success: true,
                                output: result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : ''),
                                metadata: { exitCode: result.exitCode }
                            }
                        }
                    } catch (error: any) {
                        return {
                            success: false,
                            output: `Command execution failed: ${error.message}`,
                            error: error.message
                        }
                    }

                    return {
                        success: false,
                        output: 'IPC not available for command execution'
                    }
                }

                default:
                    return {
                        success: false,
                        output: `Unknown tool: ${toolCall.name}`,
                        error: 'Tool not found'
                    }
            }
        } catch (error: any) {
            log.error(`Tool execution error: ${toolCall.name}`, error)
            return {
                success: false,
                output: `Error executing ${toolCall.name}: ${error.message}`,
                error: error.message
            }
        }
    }

    /**
     * Check if we've exceeded the recursion limit
     */
    public checkRecursionLimit(depth: number): boolean {
        return depth >= MAX_TOOL_RECURSION
    }

    /**
     * Get the max recursion depth
     */
    public getMaxRecursion(): number {
        return MAX_TOOL_RECURSION
    }
}

// Reasoning Imports
import {
    AtomSpace,
    PLNEngine,
    AtomType,
    createTruthValue, // Ensure this is available
    DuckDBAdapter,
    Node as ReasoningNode // Alias to avoid DOM Node conflict
} from '@deltecho/reasoning'

// Export singleton getter
export function getAgentToolExecutor(): AgentToolExecutor {
    return AgentToolExecutor.getInstance()
}

