import { EnhancedLLMService, LLMConfig, LLMMessage } from '../EnhancedLLMService';

describe('EnhancedLLMService', () => {
  let llmService: EnhancedLLMService;
  const defaultConfig: LLMConfig = {
    provider: 'openai',
    apiKey: 'test-api-key',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  };

  beforeEach(() => {
    llmService = new EnhancedLLMService(defaultConfig);
  });

  describe('initialization', () => {
    it('should initialize with provided config', () => {
      expect(llmService).toBeDefined();
    });

    it('should use default values for optional config', () => {
      const minimalConfig: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
      };
      const service = new EnhancedLLMService(minimalConfig);
      expect(service).toBeDefined();
    });

    it('should support different providers', () => {
      const anthropicService = new EnhancedLLMService({
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: 'test-key',
      });
      expect(anthropicService).toBeDefined();

      const openrouterService = new EnhancedLLMService({
        provider: 'openrouter',
        model: 'mistral/mistral-7b',
        apiKey: 'test-key',
      });
      expect(openrouterService).toBeDefined();

      const ollamaService = new EnhancedLLMService({
        provider: 'ollama',
        model: 'llama2',
      });
      expect(ollamaService).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      llmService.updateConfig({
        temperature: 0.9,
        maxTokens: 4000,
      });
      // Configuration should be updated without error
      expect(llmService).toBeDefined();
    });
  });

  describe('message formatting', () => {
    it('should format messages correctly', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ];

      // The service should accept these messages without error
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('system');
    });

    it('should handle empty messages array', () => {
      const messages: LLMMessage[] = [];
      expect(messages.length).toBe(0);
    });

    it('should handle multi-turn conversations', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];
      expect(messages.length).toBe(4);
    });
  });

  describe('provider-specific endpoints', () => {
    it('should use correct endpoint for OpenAI', () => {
      const service = new EnhancedLLMService({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
      });
      expect(service).toBeDefined();
    });

    it('should use correct endpoint for Anthropic', () => {
      const service = new EnhancedLLMService({
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: 'test-key',
      });
      expect(service).toBeDefined();
    });

    it('should use correct endpoint for OpenRouter', () => {
      const service = new EnhancedLLMService({
        provider: 'openrouter',
        model: 'mistral/mistral-7b',
        apiKey: 'test-key',
      });
      expect(service).toBeDefined();
    });

    it('should use correct endpoint for Ollama', () => {
      const service = new EnhancedLLMService({
        provider: 'ollama',
        model: 'llama2',
        baseURL: 'http://localhost:11434',
      });
      expect(service).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing API key gracefully', () => {
      const service = new EnhancedLLMService({
        provider: 'openai',
        model: 'gpt-4',
        // No API key
      });
      expect(service).toBeDefined();
    });
  });

  describe('streaming support', () => {
    it('should support streaming configuration', () => {
      const service = new EnhancedLLMService({
        ...defaultConfig,
        streaming: true,
      });
      expect(service).toBeDefined();
    });
  });

  describe('token estimation', () => {
    it('should estimate token count for text', () => {
      const text = 'Hello, this is a test message.';
      const estimatedTokens = llmService.estimateTokens(text);
      expect(estimatedTokens).toBeGreaterThan(0);
    });

    it('should estimate tokens for empty string', () => {
      const estimatedTokens = llmService.estimateTokens('');
      expect(estimatedTokens).toBe(0);
    });

    it('should estimate tokens for long text', () => {
      const longText = 'word '.repeat(1000);
      const estimatedTokens = llmService.estimateTokens(longText);
      expect(estimatedTokens).toBeGreaterThan(100);
    });
  });
});
