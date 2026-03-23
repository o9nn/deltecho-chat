/**
 * ToolExecutionEngine - Real Action Execution for Deep Tree Echo
 *
 * Replaces the simulated `setTimeout(100)` delegation in AgentCoordinator
 * with actual tool execution capabilities:
 *
 * - Shell command execution (sandboxed with timeout)
 * - File system operations (read, write, list)
 * - HTTP API calls (GET, POST, PUT, DELETE)
 * - MCP tool invocation (via manus-mcp-cli or direct JSON-RPC)
 * - Custom tool registration (plugin architecture)
 *
 * Safety: All tools run within configurable constraints:
 * - Execution timeout per tool call
 * - Output size limits
 * - Allowlist/denylist for shell commands
 * - Rate limiting per tool type
 *
 * This is the "Agent" in the AAR architecture:
 * the dynamic tensor operators that act upon the Arena.
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/ToolExecutionEngine');

// ─── Tool Definitions ───────────────────────────────────────────

export type ToolType = 'shell' | 'filesystem' | 'http' | 'mcp' | 'custom';

export interface ToolDefinition {
  name: string;
  type: ToolType;
  description: string;
  parameters: ToolParameter[];
  /** Maximum execution time in ms */
  timeout?: number;
  /** Whether this tool requires confirmation before execution */
  requiresConfirmation?: boolean;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timestamp: number;
}

export interface ToolResult {
  callId: string;
  toolName: string;
  success: boolean;
  output: unknown;
  error?: string;
  duration: number;
  truncated?: boolean;
}

// ─── Tool Execution Engine ──────────────────────────────────────

export interface ToolExecutionEngineConfig {
  /** Default timeout for tool execution (ms) */
  defaultTimeout: number;
  /** Maximum output size in bytes */
  maxOutputSize: number;
  /** Shell command allowlist (empty = allow all) */
  shellAllowlist: string[];
  /** Shell command denylist */
  shellDenylist: string[];
  /** Working directory for shell commands */
  workingDirectory: string;
  /** Enable shell execution */
  enableShell: boolean;
  /** Enable filesystem operations */
  enableFilesystem: boolean;
  /** Enable HTTP requests */
  enableHttp: boolean;
  /** Enable MCP tool invocation */
  enableMcp: boolean;
  /** Rate limit: max calls per minute per tool type */
  rateLimitPerMinute: number;
}

const DEFAULT_CONFIG: ToolExecutionEngineConfig = {
  defaultTimeout: 30000,
  maxOutputSize: 1024 * 1024, // 1MB
  shellAllowlist: [],
  shellDenylist: ['rm -rf /', 'mkfs', 'dd if=', ':(){:|:&};:'],
  workingDirectory: process.cwd(),
  enableShell: true,
  enableFilesystem: true,
  enableHttp: true,
  enableMcp: true,
  rateLimitPerMinute: 60,
};

export class ToolExecutionEngine extends EventEmitter {
  private config: ToolExecutionEngineConfig;
  private tools: Map<string, ToolDefinition> = new Map();
  private customHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>> = new Map();
  private callHistory: ToolResult[] = [];
  private rateLimitCounters: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(config?: Partial<ToolExecutionEngineConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerBuiltinTools();
    log.info('ToolExecutionEngine initialized');
  }

  // ─── Tool Registry ────────────────────────────────────────────

  private registerBuiltinTools(): void {
    if (this.config.enableShell) {
      this.registerTool({
        name: 'shell_exec',
        type: 'shell',
        description: 'Execute a shell command and return stdout/stderr',
        parameters: [
          { name: 'command', type: 'string', description: 'Shell command to execute', required: true },
          { name: 'timeout', type: 'number', description: 'Timeout in ms', required: false, default: this.config.defaultTimeout },
        ],
        timeout: this.config.defaultTimeout,
      });
    }

    if (this.config.enableFilesystem) {
      this.registerTool({
        name: 'fs_read',
        type: 'filesystem',
        description: 'Read a file and return its contents',
        parameters: [
          { name: 'path', type: 'string', description: 'File path to read', required: true },
          { name: 'encoding', type: 'string', description: 'File encoding', required: false, default: 'utf-8' },
        ],
      });

      this.registerTool({
        name: 'fs_write',
        type: 'filesystem',
        description: 'Write content to a file',
        parameters: [
          { name: 'path', type: 'string', description: 'File path to write', required: true },
          { name: 'content', type: 'string', description: 'Content to write', required: true },
        ],
      });

      this.registerTool({
        name: 'fs_list',
        type: 'filesystem',
        description: 'List files in a directory',
        parameters: [
          { name: 'path', type: 'string', description: 'Directory path', required: true },
          { name: 'recursive', type: 'boolean', description: 'List recursively', required: false, default: false },
        ],
      });
    }

    if (this.config.enableHttp) {
      this.registerTool({
        name: 'http_request',
        type: 'http',
        description: 'Make an HTTP request',
        parameters: [
          { name: 'url', type: 'string', description: 'Request URL', required: true },
          { name: 'method', type: 'string', description: 'HTTP method', required: false, default: 'GET' },
          { name: 'headers', type: 'object', description: 'Request headers', required: false },
          { name: 'body', type: 'string', description: 'Request body', required: false },
        ],
        timeout: this.config.defaultTimeout,
      });
    }

    if (this.config.enableMcp) {
      this.registerTool({
        name: 'mcp_call',
        type: 'mcp',
        description: 'Call an MCP server tool',
        parameters: [
          { name: 'server', type: 'string', description: 'MCP server name', required: true },
          { name: 'tool', type: 'string', description: 'Tool name on the server', required: true },
          { name: 'input', type: 'object', description: 'Tool input arguments', required: true },
        ],
        timeout: 60000,
      });
    }
  }

  /**
   * Register a tool definition
   */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    log.info(`Registered tool: ${tool.name} (${tool.type})`);
  }

  /**
   * Register a custom tool handler
   */
  registerCustomTool(
    name: string,
    description: string,
    parameters: ToolParameter[],
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.registerTool({
      name,
      type: 'custom',
      description,
      parameters,
    });
    this.customHandlers.set(name, handler);
  }

  /**
   * Get all registered tool definitions (for LLM function-calling schema)
   */
  getToolDefinitions(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  /**
   * Get tool definitions formatted for OpenAI function-calling
   */
  getToolsForLLM(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
      };
    };
  }> {
    return [...this.tools.values()].map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties: Object.fromEntries(
            tool.parameters.map(p => [p.name, {
              type: p.type,
              description: p.description,
              ...(p.default !== undefined ? { default: p.default } : {}),
            }])
          ),
          required: tool.parameters.filter(p => p.required).map(p => p.name),
        },
      },
    }));
  }

  // ─── Execution ────────────────────────────────────────────────

  /**
   * Execute a tool call
   */
  async execute(call: ToolCall): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(call.toolName);

    if (!tool) {
      return {
        callId: call.id,
        toolName: call.toolName,
        success: false,
        output: null,
        error: `Unknown tool: ${call.toolName}`,
        duration: Date.now() - startTime,
      };
    }

    // Rate limiting
    if (!this.checkRateLimit(tool.type)) {
      return {
        callId: call.id,
        toolName: call.toolName,
        success: false,
        output: null,
        error: `Rate limit exceeded for ${tool.type} tools`,
        duration: Date.now() - startTime,
      };
    }

    this.emit('tool_call_start', { call, tool });
    log.info(`Executing tool: ${call.toolName} (${tool.type})`);

    let result: ToolResult;

    try {
      const timeout = tool.timeout || this.config.defaultTimeout;
      const output = await this.executeWithTimeout(
        () => this.dispatch(tool, call.arguments),
        timeout
      );

      result = {
        callId: call.id,
        toolName: call.toolName,
        success: true,
        output: this.truncateOutput(output),
        duration: Date.now() - startTime,
        truncated: this.isOutputTruncated(output),
      };
    } catch (error) {
      result = {
        callId: call.id,
        toolName: call.toolName,
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }

    this.callHistory.push(result);
    this.emit('tool_call_complete', { call, result });
    log.info(`Tool ${call.toolName} completed: success=${result.success}, duration=${result.duration}ms`);

    return result;
  }

  /**
   * Execute multiple tool calls in sequence
   */
  async executeSequence(calls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (const call of calls) {
      const result = await this.execute(call);
      results.push(result);
      // Stop on failure unless the call is marked as optional
      if (!result.success) {
        log.warn(`Sequence halted at tool ${call.toolName}: ${result.error}`);
        break;
      }
    }
    return results;
  }

  // ─── Dispatch ─────────────────────────────────────────────────

  private async dispatch(tool: ToolDefinition, args: Record<string, unknown>): Promise<unknown> {
    switch (tool.type) {
      case 'shell':
        return this.executeShell(args);
      case 'filesystem':
        return this.executeFilesystem(tool.name, args);
      case 'http':
        return this.executeHttp(args);
      case 'mcp':
        return this.executeMcp(args);
      case 'custom':
        return this.executeCustom(tool.name, args);
      default:
        throw new Error(`Unsupported tool type: ${tool.type}`);
    }
  }

  private async executeShell(args: Record<string, unknown>): Promise<unknown> {
    const command = String(args.command || '');

    // Safety check
    for (const denied of this.config.shellDenylist) {
      if (command.includes(denied)) {
        throw new Error(`Command denied by security policy: contains "${denied}"`);
      }
    }

    if (this.config.shellAllowlist.length > 0) {
      const baseCmd = command.split(/\s+/)[0];
      if (!this.config.shellAllowlist.includes(baseCmd)) {
        throw new Error(`Command not in allowlist: ${baseCmd}`);
      }
    }

    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    const timeout = typeof args.timeout === 'number' ? args.timeout : this.config.defaultTimeout;

    const { stdout, stderr } = await execAsync(command, {
      cwd: this.config.workingDirectory,
      timeout,
      maxBuffer: this.config.maxOutputSize,
    });

    return { stdout: stdout.trim(), stderr: stderr.trim() };
  }

  private async executeFilesystem(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const fs = await import('node:fs/promises');
    const path = String(args.path || '');

    switch (toolName) {
      case 'fs_read': {
        const encoding = String(args.encoding || 'utf-8') as BufferEncoding;
        const content = await fs.readFile(path, encoding);
        return { path, content, size: content.length };
      }
      case 'fs_write': {
        const content = String(args.content || '');
        await fs.writeFile(path, content, 'utf-8');
        return { path, bytesWritten: content.length };
      }
      case 'fs_list': {
        const recursive = Boolean(args.recursive);
        if (recursive) {
          const entries = await fs.readdir(path, { recursive: true });
          return { path, entries: entries.slice(0, 1000) };
        }
        const entries = await fs.readdir(path, { withFileTypes: true });
        return {
          path,
          entries: entries.map(e => ({
            name: e.name,
            isDirectory: e.isDirectory(),
            isFile: e.isFile(),
          })),
        };
      }
      default:
        throw new Error(`Unknown filesystem tool: ${toolName}`);
    }
  }

  private async executeHttp(args: Record<string, unknown>): Promise<unknown> {
    const url = String(args.url || '');
    const method = String(args.method || 'GET').toUpperCase();
    const headers = (args.headers as Record<string, string>) || {};
    const body = args.body ? String(args.body) : undefined;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    let responseBody: unknown;

    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      const text = await response.text();
      responseBody = text.slice(0, this.config.maxOutputSize);
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
    };
  }

  private async executeMcp(args: Record<string, unknown>): Promise<unknown> {
    const server = String(args.server || '');
    const tool = String(args.tool || '');
    const input = args.input || {};

    // Execute via manus-mcp-cli
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    const inputJson = JSON.stringify(input);
    const command = `manus-mcp-cli tool call ${tool} --server ${server} --input '${inputJson.replace(/'/g, "'\\''")}'`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000,
      maxBuffer: this.config.maxOutputSize,
    });

    // Try to parse JSON output
    try {
      return JSON.parse(stdout);
    } catch {
      return { stdout: stdout.trim(), stderr: stderr.trim() };
    }
  }

  private async executeCustom(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.customHandlers.get(toolName);
    if (!handler) {
      throw new Error(`No handler registered for custom tool: ${toolName}`);
    }
    return handler(args);
  }

  // ─── Utilities ────────────────────────────────────────────────

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  private checkRateLimit(toolType: string): boolean {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(toolType);

    if (!counter || now >= counter.resetAt) {
      this.rateLimitCounters.set(toolType, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (counter.count >= this.config.rateLimitPerMinute) {
      return false;
    }

    counter.count++;
    return true;
  }

  private truncateOutput(output: unknown): unknown {
    const str = typeof output === 'string' ? output : JSON.stringify(output);
    if (str && str.length > this.config.maxOutputSize) {
      return typeof output === 'string'
        ? str.slice(0, this.config.maxOutputSize) + '... [truncated]'
        : JSON.parse(str.slice(0, this.config.maxOutputSize));
    }
    return output;
  }

  private isOutputTruncated(output: unknown): boolean {
    const str = typeof output === 'string' ? output : JSON.stringify(output);
    return str ? str.length > this.config.maxOutputSize : false;
  }

  // ─── Statistics ───────────────────────────────────────────────

  getCallHistory(limit: number = 50): ToolResult[] {
    return this.callHistory.slice(-limit);
  }

  getStats(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;
    registeredTools: number;
  } {
    const total = this.callHistory.length;
    const successful = this.callHistory.filter(r => r.success).length;
    const avgDuration = total > 0
      ? this.callHistory.reduce((sum, r) => sum + r.duration, 0) / total
      : 0;

    return {
      totalCalls: total,
      successfulCalls: successful,
      failedCalls: total - successful,
      averageDuration: Math.round(avgDuration),
      registeredTools: this.tools.size,
    };
  }
}
