/**
 * Production Configuration Loader
 *
 * Loads and validates configuration from environment variables
 * for production deployment of Deltecho.
 */

export interface LLMProviderConfig {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  baseURL?: string;
}

export interface SecurityConfig {
  encryptionKey?: string;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  maxInputLength: number;
}

export interface MemoryConfig {
  memoryLimit: number;
  reflectionLimit: number;
  hyperDimensionalDimensions: number;
  memoryDecayRate: number;
  contextWindowSize: number;
}

export interface OrchestratorConfig {
  ipcSocketPath: string;
  ipcTcpPort: number;
  webhookPort: number;
  webhookCorsOrigins: string[];
  schedulerTimezone: string;
}

export interface FeatureFlags {
  enableMemorySystem: boolean;
  enablePersonalityEvolution: boolean;
  enableEmotionalDynamics: boolean;
  enableSecurityHardening: boolean;
}

export interface ProductionConfig {
  openai: LLMProviderConfig;
  anthropic: LLMProviderConfig;
  openrouter: LLMProviderConfig;
  ollama: LLMProviderConfig;
  security: SecurityConfig;
  memory: MemoryConfig;
  orchestrator: OrchestratorConfig;
  features: FeatureFlags;
  logLevel: string;
}

/**
 * Load configuration from environment variables
 */
export function loadProductionConfig(): ProductionConfig {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4",
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "2000", 10),
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || "claude-3-opus-20240229",
      temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || "0.7"),
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096", 10),
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-3-opus",
      temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || "0.7"),
      maxTokens: 4096,
    },
    ollama: {
      model: process.env.OLLAMA_MODEL || "llama2",
      temperature: 0.7,
      maxTokens: 2000,
      baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    },
    security: {
      encryptionKey: process.env.ENCRYPTION_KEY,
      rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || "100", 10),
      rateLimitWindowMs: parseInt(
        process.env.RATE_LIMIT_WINDOW_MS || "60000",
        10,
      ),
      maxInputLength: parseInt(process.env.MAX_INPUT_LENGTH || "10000", 10),
    },
    memory: {
      memoryLimit: parseInt(process.env.MEMORY_LIMIT || "1000", 10),
      reflectionLimit: parseInt(process.env.REFLECTION_LIMIT || "100", 10),
      hyperDimensionalDimensions: parseInt(
        process.env.HYPERDIMENSIONAL_DIMENSIONS || "10000",
        10,
      ),
      memoryDecayRate: parseFloat(process.env.MEMORY_DECAY_RATE || "0.98"),
      contextWindowSize: parseInt(process.env.CONTEXT_WINDOW_SIZE || "128", 10),
    },
    orchestrator: {
      ipcSocketPath: process.env.IPC_SOCKET_PATH || "/tmp/deltecho.sock",
      ipcTcpPort: parseInt(process.env.IPC_TCP_PORT || "9876", 10),
      webhookPort: parseInt(process.env.WEBHOOK_PORT || "3000", 10),
      webhookCorsOrigins: (
        process.env.WEBHOOK_CORS_ORIGINS || "http://localhost:3000"
      ).split(","),
      schedulerTimezone: process.env.SCHEDULER_TIMEZONE || "UTC",
    },
    features: {
      enableMemorySystem: process.env.ENABLE_MEMORY_SYSTEM !== "false",
      enablePersonalityEvolution:
        process.env.ENABLE_PERSONALITY_EVOLUTION !== "false",
      enableEmotionalDynamics:
        process.env.ENABLE_EMOTIONAL_DYNAMICS !== "false",
      enableSecurityHardening:
        process.env.ENABLE_SECURITY_HARDENING !== "false",
    },
    logLevel: process.env.LOG_LEVEL || "info",
  };
}

/**
 * Validate configuration and return warnings
 */
export function validateConfig(config: ProductionConfig): string[] {
  const warnings: string[] = [];

  // Check for missing API keys
  if (
    !config.openai.apiKey &&
    !config.anthropic.apiKey &&
    !config.openrouter.apiKey
  ) {
    warnings.push(
      "No LLM API keys configured. At least one provider (OpenAI, Anthropic, or OpenRouter) should be configured.",
    );
  }

  // Check security configuration
  if (!config.security.encryptionKey) {
    warnings.push(
      "No encryption key configured. Sensitive data will not be encrypted.",
    );
  } else if (config.security.encryptionKey.length < 32) {
    warnings.push(
      "Encryption key is too short. Use at least 32 characters for security.",
    );
  }

  // Check rate limiting
  if (config.security.rateLimitRequests > 1000) {
    warnings.push("Rate limit is very high. Consider lowering for production.");
  }

  // Check memory configuration
  if (config.memory.memoryLimit > 10000) {
    warnings.push(
      "Memory limit is very high. This may cause performance issues.",
    );
  }

  return warnings;
}

/**
 * Get the best available LLM provider configuration
 */
export function getBestAvailableProvider(config: ProductionConfig): {
  provider: "openai" | "anthropic" | "openrouter" | "ollama";
  config: LLMProviderConfig;
} {
  // Priority: OpenAI > Anthropic > OpenRouter > Ollama
  if (config.openai.apiKey) {
    return { provider: "openai", config: config.openai };
  }
  if (config.anthropic.apiKey) {
    return { provider: "anthropic", config: config.anthropic };
  }
  if (config.openrouter.apiKey) {
    return { provider: "openrouter", config: config.openrouter };
  }
  // Fallback to Ollama (local, no API key needed)
  return { provider: "ollama", config: config.ollama };
}

/**
 * Create a production-ready instance configuration
 */
export function createProductionInstance(): {
  config: ProductionConfig;
  warnings: string[];
  provider: { provider: string; config: LLMProviderConfig };
} {
  const config = loadProductionConfig();
  const warnings = validateConfig(config);
  const provider = getBestAvailableProvider(config);

  return { config, warnings, provider };
}

export default {
  loadProductionConfig,
  validateConfig,
  getBestAvailableProvider,
  createProductionInstance,
};
