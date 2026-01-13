// GitHub Copilot Connector: A Breathtaking Integration for Coding Excellence
// Creates a revolutionary bridge to GitHub Copilot's advanced code generation capabilities

import {
  BaseConnector,
  AIConnectorConfig,
  AICapability,
  ConversationContext,
  AIResponse,
} from './BaseConnector'

// Copilot-specific configuration options
export interface CopilotConfig extends AIConnectorConfig {
  githubToken?: string // GitHub token with Copilot access
  editorContextLines?: number // Number of code context lines to include
  language?: string // Default programming language
  maxTokens?: number
  temperature?: number
  topP?: number
  frameworks?: string[] // Preferred frameworks
  enabledLanguages?: string[] // Languages with Copilot support enabled
  codeStylePreferences?: Record<string, string> // Code style preferences
}

interface CopilotMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  context?: {
    language?: string
    code?: string
    file_path?: string
    repository?: string
    project_context?: {
      files: Array<{ path: string; content: string }>
      dependencies?: Record<string, string> // package.json dependencies
      configuration?: Record<string, any> // linting, formatting configs
    }
  }
}

interface CopilotCompletionRequest {
  messages: CopilotMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  language?: string
}

interface CopilotResponse {
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Copilot Connector: A masterpiece of integration with GitHub Copilot
 * Supports code generation, project analysis, and technical documentation
 */
export class CopilotConnector extends BaseConnector {
  private copilotConfig: CopilotConfig
  private activeProject: string | null = null
  private projectFiles: Map<string, string> = new Map() // path -> content
  private projectDependencies: Record<string, string> = {}
  private projectConfig: Record<string, any> = {}

  constructor(config: CopilotConfig) {
    // Set default values for Copilot-specific configuration
    const defaultConfig: Partial<CopilotConfig> = {
      editorContextLines: 10,
      maxTokens: 2048,
      defaultTemperature: 0.3, // Lower temperature for more deterministic code
      topP: 0.95,
      capabilities: [
        AICapability.CODE_GENERATION,
        AICapability.TEXT_GENERATION,
        AICapability.FUNCTION_CALLING,
      ],
      personalityTraits: {
        expertise: 0.95,
        precision: 0.9,
        helpfulness: 0.85,
        adaptability: 0.8,
        innovation: 0.75,
      },
    }

    // Merge with provided config
    const mergedConfig = { ...defaultConfig, ...config } as CopilotConfig

    super(mergedConfig)
    this.copilotConfig = mergedConfig
  }

  /**
   * Authenticate with GitHub Copilot API
   */
  async authenticate(): Promise<boolean> {
    try {
      if (!this.copilotConfig.githubToken && !this.copilotConfig.apiKey) {
        throw new Error('GitHub token or Copilot API key is required')
      }

      // GitHub Copilot authentication is complex and involves multiple steps
      // This is a simplified implementation that assumes direct API access
      // In a real implementation, you would need to handle the GitHub OAuth flow
      // and Copilot entitlement checks

      const token = this.copilotConfig.githubToken || this.copilotConfig.apiKey

      const testResponse = await fetch(
        'https://api.github.com/copilot/status',
        {
          method: 'GET',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (!testResponse.ok) {
        const errorData = await testResponse.json()
        throw new Error(
          `Copilot authentication failed: ${
            errorData.message || testResponse.statusText
          }`
        )
      }

      const statusData = await testResponse.json()

      if (!statusData.enabled) {
        throw new Error('GitHub Copilot is not enabled for this account')
      }

      this.authenticated = true
      this.emit('authenticated', statusData)
      return true
    } catch (error) {
      console.error('Copilot authentication error:', error)
      this.authenticated = false
      this.emit('authenticationFailed', error)
      return false
    }
  }

  /**
   * Set the active project context
   */
  async setProjectContext(
    projectName: string,
    files: Array<{ path: string; content: string }>,
    dependencies?: Record<string, string>,
    config?: Record<string, any>
  ): Promise<void> {
    this.activeProject = projectName

    // Clear existing project data
    this.projectFiles.clear()

    // Store new project data
    files.forEach(file => {
      this.projectFiles.set(file.path, file.content)
    })

    this.projectDependencies = dependencies || {}
    this.projectConfig = config || {}

    this.emit('projectContextChanged', {
      projectName,
      fileCount: files.length,
      dependencies: Object.keys(this.projectDependencies).length,
    })
  }

  /**
   * Format messages for Copilot API
   */
  private formatCopilotMessages(
    context: ConversationContext
  ): CopilotMessage[] {
    const messages: CopilotMessage[] = []

    // Process system messages first
    const systemMessages = context.messages.filter(msg => msg.role === 'system')
    const nonSystemMessages = context.messages.filter(
      msg => msg.role !== 'system'
    )

    // Add system messages if any exist
    for (const msg of systemMessages) {
      messages.push({
        role: 'system',
        content: msg.content,
      })
    }

    // Add default system message if none exists and we have a system prompt
    if (systemMessages.length === 0 && this.copilotConfig.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.copilotConfig.systemPrompt,
      })
    }

    // Add coding best practices to system message if not already included
    if (
      messages.length > 0 &&
      !messages[0].content.includes('coding best practices')
    ) {
      messages[0].content += `\n\nFollow these coding best practices:
- Write clean, maintainable code with clear comments
- Follow the project's existing style and patterns
- Implement proper error handling
- Consider performance implications
- Ensure security best practices are followed`
    }

    // Process remaining messages
    for (const msg of nonSystemMessages) {
      if (msg.role === 'function') {
        // Convert function messages to user messages for Copilot
        messages.push({
          role: 'user',
          content: `Function result from ${msg.name || 'unknown_function'}:\n${
            msg.content
          }`,
        })
      } else {
        const copilotMessage: CopilotMessage = {
          role:
            msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          content: msg.content,
        }

        // Add code context if this is the last user message
        if (
          msg.role === 'user' &&
          msg === nonSystemMessages[nonSystemMessages.length - 1] &&
          this.activeProject
        ) {
          // Parse the message to detect code-related queries
          const isCodeRelated = this.isCodeRelatedQuery(msg.content)

          if (isCodeRelated) {
            copilotMessage.context = {
              language: this.detectLanguage(msg.content),
              project_context: {
                files: Array.from(this.projectFiles.entries())
                  .slice(0, 5) // Limit to avoid token explosion
                  .map(([path, content]) => ({ path, content })),
                dependencies: this.projectDependencies,
                configuration: this.projectConfig,
              },
            }
          }
        }

        messages.push(copilotMessage)
      }
    }

    return messages
  }

  /**
   * Detect if a query is code-related
   */
  private isCodeRelatedQuery(query: string): boolean {
    const codeRelatedKeywords = [
      'code',
      'function',
      'class',
      'method',
      'implement',
      'bug',
      'error',
      'debug',
      'fix',
      'feature',
      'javascript',
      'typescript',
      'python',
      'java',
      'c#',
      'c++',
      'html',
      'css',
      'api',
      'endpoint',
      'database',
      'algorithm',
      'syntax',
      'compile',
      'runtime',
    ]

    const lowerQuery = query.toLowerCase()
    return (
      codeRelatedKeywords.some(keyword => lowerQuery.includes(keyword)) ||
      lowerQuery.includes('```') ||
      /\b(if|for|while|switch|try|catch|function|class|import|export|const|let|var)\b/.test(
        lowerQuery
      )
    )
  }

  /**
   * Detect programming language from query
   */
  private detectLanguage(query: string): string {
    const lowerQuery = query.toLowerCase()

    // Check for explicit language mentions
    if (lowerQuery.includes('javascript') || lowerQuery.includes('js'))
      return 'javascript'
    if (lowerQuery.includes('typescript') || lowerQuery.includes('ts'))
      return 'typescript'
    if (lowerQuery.includes('python') || lowerQuery.includes('py'))
      return 'python'
    if (lowerQuery.includes('java')) return 'java'
    if (lowerQuery.includes('c#') || lowerQuery.includes('csharp'))
      return 'csharp'
    if (lowerQuery.includes('c++') || lowerQuery.includes('cpp')) return 'cpp'
    if (lowerQuery.includes('html')) return 'html'
    if (lowerQuery.includes('css')) return 'css'
    if (lowerQuery.includes('php')) return 'php'
    if (lowerQuery.includes('ruby')) return 'ruby'
    if (lowerQuery.includes('go') || lowerQuery.includes('golang')) return 'go'
    if (lowerQuery.includes('rust')) return 'rust'
    if (lowerQuery.includes('swift')) return 'swift'
    if (lowerQuery.includes('kotlin')) return 'kotlin'

    // Check for code blocks with language tags
    const codeBlockMatch = query.match(/```(\w+)/)
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1]
    }

    // Default to the configured language or JavaScript
    return this.copilotConfig.language || 'javascript'
  }

  /**
   * Generate a response from Copilot
   */
  async generateResponse(context: ConversationContext): Promise<AIResponse> {
    try {
      if (!this.authenticated) {
        await this.authenticate()
      }

      // Format the messages for Copilot API
      const messages = this.formatCopilotMessages(context)

      // Prepare the request
      const requestBody: CopilotCompletionRequest = {
        messages,
        max_tokens: this.copilotConfig.maxTokens,
        temperature: this.copilotConfig.defaultTemperature,
        top_p: this.copilotConfig.topP,
        language: this.detectLanguage(messages[messages.length - 1].content),
      }

      // GitHub Copilot API endpoint (this is a placeholder - actual endpoint may differ)
      const apiEndpoint =
        this.copilotConfig.apiEndpoint ||
        'https://api.github.com/copilot/completions'

      // Make the API request
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${
            this.copilotConfig.githubToken || this.copilotConfig.apiKey
          }`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Copilot API error: ${errorData.message || response.statusText}`
        )
      }

      // Parse the response
      const data = (await response.json()) as CopilotResponse

      // Extract the first choice
      const choice = data.choices[0]

      // Format the AI response
      return {
        messageId: `copilot_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 7)}`,
        content: choice.message.content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        finishReason: choice.finish_reason,
      }
    } catch (error) {
      console.error('Copilot response generation error:', error)
      throw error
    }
  }

  /**
   * Get code suggestions for a specific file and position
   */
  async getCodeSuggestions(
    filePath: string,
    content: string,
    cursorPosition: number,
    language?: string
  ): Promise<string[]> {
    try {
      if (!this.authenticated) {
        await this.authenticate()
      }

      // Prepare context with file content and position
      const fileContext = {
        path: filePath,
        content,
        language: language || this.detectLanguageFromFilePath(filePath),
        cursor_position: cursorPosition,
      }

      // GitHub Copilot API endpoint for code suggestions
      const apiEndpoint = `${
        this.copilotConfig.apiEndpoint || 'https://api.github.com/copilot'
      }/suggestions`

      // Make the API request
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${
            this.copilotConfig.githubToken || this.copilotConfig.apiKey
          }`,
        },
        body: JSON.stringify({
          context: fileContext,
          max_suggestions: 5,
          temperature: this.copilotConfig.defaultTemperature,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Copilot suggestions error: ${
            errorData.message || response.statusText
          }`
        )
      }

      const data = await response.json()
      return data.suggestions.map((suggestion: any) => suggestion.text)
    } catch (error) {
      console.error('Error getting code suggestions:', error)
      throw error
    }
  }

  /**
   * Detect language from file path
   */
  private detectLanguageFromFilePath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'js':
        return 'javascript'
      case 'ts':
        return 'typescript'
      case 'py':
        return 'python'
      case 'java':
        return 'java'
      case 'cs':
        return 'csharp'
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'c':
        return 'cpp'
      case 'html':
        return 'html'
      case 'css':
        return 'css'
      case 'php':
        return 'php'
      case 'rb':
        return 'ruby'
      case 'go':
        return 'go'
      case 'rs':
        return 'rust'
      case 'swift':
        return 'swift'
      case 'kt':
        return 'kotlin'
      case 'json':
        return 'json'
      case 'md':
        return 'markdown'
      case 'sh':
        return 'shell'
      case 'sql':
        return 'sql'
      case 'yaml':
      case 'yml':
        return 'yaml'
      default:
        return 'text'
    }
  }

  /**
   * Review code and provide suggestions
   */
  async reviewCode(
    code: string,
    language: string,
    context?: string
  ): Promise<{
    summary: string
    suggestions: Array<{
      severity: 'info' | 'warning' | 'error'
      message: string
      line?: number
      column?: number
      fix?: string
    }>
  }> {
    try {
      if (!this.authenticated) {
        await this.authenticate()
      }

      // Create a conversation context for the code review
      const conversationId = `review_${Date.now()}`
      const reviewContext: ConversationContext = {
        conversationId,
        messages: [
          {
            id: `sys_${Date.now()}`,
            role: 'system',
            content: `You are GitHub Copilot, an AI programming assistant that provides expert code reviews. 
Analyze the provided code for:
1. Bugs and logical errors
2. Performance issues
3. Security vulnerabilities
4. Style and readability problems
5. Best practices violations

Provide specific, actionable feedback with clear explanations.`,
            timestamp: Date.now(),
          },
          {
            id: `user_${Date.now()}`,
            role: 'user',
            content: `Please review this ${language} code:

\`\`\`${language}
${code}
\`\`\`

${context ? `Additional context: ${context}` : ''}

Provide a comprehensive review with specific suggestions for improvement.`,
            timestamp: Date.now(),
          },
        ],
      }

      // Generate the review using the standard response generation
      const response = await this.generateResponse(reviewContext)

      // Parse the response to extract structured review data
      // This is a simplified implementation - in practice, you would want more robust parsing
      const reviewContent = response.content

      // Extract summary (first paragraph)
      const summaryMatch = reviewContent.match(/^(.+?)(?:\n\n|\n\d\.|\n#)/s)
      const summary = summaryMatch
        ? summaryMatch[1].trim()
        : 'Code review completed.'

      // Extract suggestions (look for numbered or bulleted lists)
      const suggestionRegex =
        /(?:^|\n)(?:\d+\.|\*|-)\s+(.+?)(?=(?:\n(?:\d+\.|\*|-|\n|$)))/gs
      const suggestionMatches = [...reviewContent.matchAll(suggestionRegex)]

      const suggestions = suggestionMatches.map(match => {
        const suggestion = match[1].trim()

        // Try to determine severity based on keywords
        let severity: 'info' | 'warning' | 'error' = 'info'
        if (
          /error|bug|crash|exception|fail|incorrect|wrong/i.test(suggestion)
        ) {
          severity = 'error'
        } else if (
          /warning|caution|consider|might|could|potential|improve/i.test(
            suggestion
          )
        ) {
          severity = 'warning'
        }

        // Try to extract line number if present
        const lineMatch = suggestion.match(/line\s+(\d+)/i)
        const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined

        return {
          severity,
          message: suggestion,
          line,
          column: undefined, // Hard to reliably extract from free text
          fix: undefined, // Would need more structured output to reliably extract
        }
      })

      return {
        summary,
        suggestions,
      }
    } catch (error) {
      console.error('Error reviewing code:', error)
      throw error
    }
  }

  /**
   * Generate embeddings (not directly supported by Copilot)
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    throw new Error('Embeddings not directly supported by GitHub Copilot API')
  }
}
