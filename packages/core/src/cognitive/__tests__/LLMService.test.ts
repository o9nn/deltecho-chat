import { LLMService, CognitiveFunctionType } from '../LLMService';

describe('LLMService', () => {
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService();

    // Mock fetch for all tests to avoid real API calls
    global.fetch = (() => {
      const mockFn: any = (...args: any[]) => {
        mockFn.calls.push(args);
        return mockFn.mockReturnValue;
      };
      mockFn.calls = [];
      mockFn.mockReturnValue = Promise.resolve({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Mocked response' } }] }),
      });
      mockFn.mockReset = function () {
        this.calls = [];
      };
      mockFn.mockResolvedValue = function (value: any) {
        this.mockReturnValue = Promise.resolve(value);
        return this;
      };
      mockFn.mockResolvedValueOnce = function (value: any) {
        this.mockReturnValue = Promise.resolve(value);
        return this;
      };
      return mockFn;
    })();
  });

  describe('initialization', () => {
    it('should initialize with default general function', () => {
      const functions = llmService.getAllFunctions();
      expect(functions.length).toBeGreaterThanOrEqual(1);

      const generalFunc = functions.find((f) => f.id === CognitiveFunctionType.GENERAL);
      expect(generalFunc).toBeDefined();
      expect(generalFunc?.name).toBe('General Processing');
    });

    it('should have default configuration values', () => {
      const functions = llmService.getAllFunctions();
      const generalFunc = functions.find((f) => f.id === CognitiveFunctionType.GENERAL);

      expect(generalFunc?.config.model).toBe('gpt-4');
      expect(generalFunc?.config.temperature).toBe(0.7);
      expect(generalFunc?.config.maxTokens).toBe(1000);
    });
  });

  describe('setFunctionConfig', () => {
    it('should configure a cognitive function with API key', () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: 'test-api-key',
        apiEndpoint: 'https://api.test.com/v1/chat',
        model: 'gpt-4-turbo',
      });

      expect(llmService.isFunctionConfigured(CognitiveFunctionType.COGNITIVE_CORE)).toBe(true);
    });

    it('should update existing function configuration', () => {
      llmService.setFunctionConfig(CognitiveFunctionType.GENERAL, {
        apiKey: 'initial-key',
      });

      llmService.setFunctionConfig(CognitiveFunctionType.GENERAL, {
        apiKey: 'updated-key',
        temperature: 0.9,
      });

      const functions = llmService.getAllFunctions();
      const generalFunc = functions.find((f) => f.id === CognitiveFunctionType.GENERAL);

      expect(generalFunc?.config.apiKey).toBe('updated-key');
      expect(generalFunc?.config.temperature).toBe(0.9);
    });

    it('should create new function if not exists', () => {
      llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, {
        apiKey: 'affective-key',
      });

      const functions = llmService.getAllFunctions();
      const affectiveFunc = functions.find((f) => f.id === CognitiveFunctionType.AFFECTIVE_CORE);

      expect(affectiveFunc).toBeDefined();
      expect(affectiveFunc?.name).toBe('Affective Core');
    });
  });

  describe('setConfig', () => {
    it('should set general function config for backward compatibility', () => {
      llmService.setConfig({
        apiKey: 'general-api-key',
        model: 'gpt-3.5-turbo',
      });

      expect(llmService.isFunctionConfigured(CognitiveFunctionType.GENERAL)).toBe(true);
    });
  });

  describe('getAllFunctions', () => {
    it('should return all configured functions', () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, { apiKey: 'key1' });
      llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, { apiKey: 'key2' });
      llmService.setFunctionConfig(CognitiveFunctionType.RELEVANCE_CORE, { apiKey: 'key3' });

      const functions = llmService.getAllFunctions();
      expect(functions.length).toBeGreaterThanOrEqual(4); // 3 new + 1 default general
    });
  });

  describe('getActiveFunctions', () => {
    it('should return only functions with API keys', () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, { apiKey: 'key1' });
      llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, { apiKey: '' });
      llmService.setFunctionConfig(CognitiveFunctionType.RELEVANCE_CORE, { apiKey: 'key3' });

      const activeFunctions = llmService.getActiveFunctions();
      expect(activeFunctions.length).toBe(2);
      expect(activeFunctions.some((f) => f.id === CognitiveFunctionType.COGNITIVE_CORE)).toBe(true);
      expect(activeFunctions.some((f) => f.id === CognitiveFunctionType.RELEVANCE_CORE)).toBe(true);
    });

    it('should return empty array when no functions have API keys', () => {
      const activeFunctions = llmService.getActiveFunctions();
      expect(activeFunctions.length).toBe(0);
    });
  });

  describe('isFunctionConfigured', () => {
    it('should return true for configured functions', () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: 'test-key',
      });

      expect(llmService.isFunctionConfigured(CognitiveFunctionType.COGNITIVE_CORE)).toBe(true);
    });

    it('should return false for unconfigured functions', () => {
      expect(llmService.isFunctionConfigured(CognitiveFunctionType.SEMANTIC_MEMORY)).toBe(false);
    });

    it('should return false for functions without API key', () => {
      llmService.setFunctionConfig(CognitiveFunctionType.EPISODIC_MEMORY, {
        apiKey: '',
        model: 'gpt-4',
      });

      expect(llmService.isFunctionConfigured(CognitiveFunctionType.EPISODIC_MEMORY)).toBe(false);
    });
  });

  describe('generateResponse', () => {
    it('should return error message when no API key configured', async () => {
      const response = await llmService.generateResponse('Hello');
      expect(response).toContain("isn't fully configured");
    });

    it('should generate response with configured API key', async () => {
      llmService.setConfig({ apiKey: 'test-key' });
      const response = await llmService.generateResponse('Hello');

      // Should return the mocked response
      expect(response).toBe('Mocked response');
    });
  });

  describe('generateResponseWithFunction', () => {
    beforeEach(() => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: 'cognitive-key',
      });
      llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, {
        apiKey: 'affective-key',
      });
    });

    it('should use specific function when configured', async () => {
      const response = await llmService.generateResponseWithFunction(
        CognitiveFunctionType.COGNITIVE_CORE,
        'Test input'
      );

      // Should return the mocked response
      expect(response).toBe('Mocked response');
      expect((global.fetch as any).calls.length).toBeGreaterThan(0);
    });

    it('should use affective core for emotional processing', async () => {
      const response = await llmService.generateResponseWithFunction(
        CognitiveFunctionType.AFFECTIVE_CORE,
        'Test input'
      );

      // Should return the mocked response
      expect(response).toBe('Mocked response');
      expect((global.fetch as any).calls.length).toBeGreaterThan(0);
    });

    it('should fall back to general function when specific not configured', async () => {
      llmService.setConfig({ apiKey: 'general-key' });

      const response = await llmService.generateResponseWithFunction(
        CognitiveFunctionType.SEMANTIC_MEMORY,
        'Test input'
      );

      // Should return the mocked response
      expect(response).toBe('Mocked response');
      expect((global.fetch as any).calls.length).toBeGreaterThan(0);
    });

    it('should track usage statistics', async () => {
      const initialFunctions = llmService.getAllFunctions();
      const cognitiveFunc = initialFunctions.find(
        (f) => f.id === CognitiveFunctionType.COGNITIVE_CORE
      );
      const initialRequestCount = cognitiveFunc?.usage.requestCount || 0;

      await llmService.generateResponseWithFunction(
        CognitiveFunctionType.COGNITIVE_CORE,
        'Test input'
      );

      const updatedFunctions = llmService.getAllFunctions();
      const updatedCognitiveFunc = updatedFunctions.find(
        (f) => f.id === CognitiveFunctionType.COGNITIVE_CORE
      );

      expect(updatedCognitiveFunc?.usage.requestCount).toBe(initialRequestCount + 1);
      expect(updatedCognitiveFunc?.usage.lastUsed).toBeGreaterThan(0);
    });
  });

  describe('CognitiveFunctionType enum', () => {
    it('should have all expected function types', () => {
      expect(CognitiveFunctionType.COGNITIVE_CORE).toBe('cognitive_core');
      expect(CognitiveFunctionType.AFFECTIVE_CORE).toBe('affective_core');
      expect(CognitiveFunctionType.RELEVANCE_CORE).toBe('relevance_core');
      expect(CognitiveFunctionType.SEMANTIC_MEMORY).toBe('semantic_memory');
      expect(CognitiveFunctionType.EPISODIC_MEMORY).toBe('episodic_memory');
      expect(CognitiveFunctionType.PROCEDURAL_MEMORY).toBe('procedural_memory');
      expect(CognitiveFunctionType.CONTENT_EVALUATION).toBe('content_evaluation');
      expect(CognitiveFunctionType.GENERAL).toBe('general');
    });
  });
});
