/**
 * LLM Provider Tests
 *
 * Tests for the LLM provider infrastructure including
 * provider registration, creation, and base functionality.
 */

import {
  LLMProvider,
  ChatMessage,
  CompletionConfig,
  CompletionResponse,
  StreamChunk,
  ProviderHealth,
  registerProvider,
  createProvider,
  getRegisteredProviders,
  providerRegistry,
} from '../LLMProvider';

// Import providers to register them
import '../OpenAIProvider';
import '../AnthropicProvider';

describe('LLM Provider Infrastructure', () => {
  describe('Provider Registration', () => {
    it('should have OpenAI provider registered', () => {
      const providers = getRegisteredProviders();
      expect(providers).toContain('openai');
    });

    it('should have Anthropic provider registered', () => {
      const providers = getRegisteredProviders();
      expect(providers).toContain('anthropic');
    });

    it('should have claude alias registered', () => {
      const providers = getRegisteredProviders();
      expect(providers).toContain('claude');
    });

    it('should have openai-compatible registered', () => {
      const providers = getRegisteredProviders();
      expect(providers).toContain('openai-compatible');
    });
  });

  describe('Provider Creation', () => {
    it('should create OpenAI provider', () => {
      const provider = createProvider('openai', 'test-key');
      expect(provider).not.toBeNull();
      expect(provider?.getName()).toBe('OpenAI');
    });

    it('should create Anthropic provider', () => {
      const provider = createProvider('anthropic', 'test-key');
      expect(provider).not.toBeNull();
      expect(provider?.getName()).toBe('Anthropic');
    });

    it('should create provider with custom base URL', () => {
      const provider = createProvider('openai', 'test-key', 'https://custom.api.com/v1');
      expect(provider).not.toBeNull();
    });

    it('should return null for unknown provider', () => {
      const provider = createProvider('unknown-provider', 'test-key');
      expect(provider).toBeNull();
    });

    it('should be case-insensitive for provider names', () => {
      const provider1 = createProvider('OpenAI', 'test-key');
      const provider2 = createProvider('OPENAI', 'test-key');
      const provider3 = createProvider('openai', 'test-key');

      expect(provider1).not.toBeNull();
      expect(provider2).not.toBeNull();
      expect(provider3).not.toBeNull();
    });
  });

  describe('Provider Configuration', () => {
    it('should report configured when API key is provided', () => {
      const provider = createProvider('openai', 'sk-test-key-12345');
      expect(provider?.isConfigured()).toBe(true);
    });

    it('should report not configured when API key is empty', () => {
      const provider = createProvider('openai', '');
      expect(provider?.isConfigured()).toBe(false);
    });
  });

  describe('Provider Health', () => {
    it('should return health status', () => {
      const provider = createProvider('openai', 'test-key');
      const health = provider?.getHealth();

      expect(health).toBeDefined();
      expect(typeof health?.isHealthy).toBe('boolean');
      expect(typeof health?.latencyMs).toBe('number');
      expect(typeof health?.lastCheck).toBe('number');
    });
  });
});

describe('OpenAI Provider', () => {
  let provider: LLMProvider | null;

  beforeEach(() => {
    provider = createProvider('openai', 'test-api-key');
  });

  it('should have correct name', () => {
    expect(provider?.getName()).toBe('OpenAI');
  });

  it('should be configured with API key', () => {
    expect(provider?.isConfigured()).toBe(true);
  });

  it('should throw error when completing without API key', async () => {
    const unconfiguredProvider = createProvider('openai', '');
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
    const config: CompletionConfig = {
      model: 'gpt-4',
    };

    await expect(unconfiguredProvider?.complete(messages, config)).rejects.toThrow(
      'not configured'
    );
  });

  it('should return default models list', async () => {
    const unconfiguredProvider = createProvider('openai', '');
    const models = await unconfiguredProvider?.getAvailableModels();

    expect(models).toBeDefined();
    expect(models?.length).toBeGreaterThan(0);
    expect(models).toContain('gpt-4');
  });
});

describe('Anthropic Provider', () => {
  let provider: LLMProvider | null;

  beforeEach(() => {
    provider = createProvider('anthropic', 'test-api-key');
  });

  it('should have correct name', () => {
    expect(provider?.getName()).toBe('Anthropic');
  });

  it('should be configured with API key', () => {
    expect(provider?.isConfigured()).toBe(true);
  });

  it('should throw error when completing without API key', async () => {
    const unconfiguredProvider = createProvider('anthropic', '');
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
    const config: CompletionConfig = {
      model: 'claude-3-opus-20240229',
    };

    await expect(unconfiguredProvider?.complete(messages, config)).rejects.toThrow(
      'not configured'
    );
  });

  it('should return known models list', async () => {
    const models = await provider?.getAvailableModels();

    expect(models).toBeDefined();
    expect(models?.length).toBeGreaterThan(0);
    expect(models).toContain('claude-3-opus-20240229');
  });
});

describe('ChatMessage Interface', () => {
  it('should support system role', () => {
    const message: ChatMessage = {
      role: 'system',
      content: 'You are a helpful assistant.',
    };
    expect(message.role).toBe('system');
  });

  it('should support user role', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hello!',
    };
    expect(message.role).toBe('user');
  });

  it('should support assistant role', () => {
    const message: ChatMessage = {
      role: 'assistant',
      content: 'Hello! How can I help you?',
    };
    expect(message.role).toBe('assistant');
  });

  it('should support optional name field', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hello!',
      name: 'John',
    };
    expect(message.name).toBe('John');
  });
});

describe('CompletionConfig Interface', () => {
  it('should require model field', () => {
    const config: CompletionConfig = {
      model: 'gpt-4',
    };
    expect(config.model).toBe('gpt-4');
  });

  it('should support all optional fields', () => {
    const config: CompletionConfig = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
      stopSequences: ['END'],
    };

    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(1000);
    expect(config.topP).toBe(0.9);
    expect(config.frequencyPenalty).toBe(0.5);
    expect(config.presencePenalty).toBe(0.5);
    expect(config.stopSequences).toEqual(['END']);
  });
});
