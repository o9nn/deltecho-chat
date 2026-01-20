/**
 * SecureIntegration Module
 *
 * Provides security hardening for cognitive services including:
 * - Input validation and sanitization
 * - Rate limiting
 * - Content filtering
 * - API key management
 * - Audit logging
 */

import { getLogger } from "../utils/logger";
import * as crypto from "crypto";

const log = getLogger("deep-tree-echo-core/security/SecureIntegration");

/**
 * Security configuration
 */
export interface SecurityConfig {
  maxInputLength?: number;
  allowedContentTypes?: string[];
  blockedPatterns?: RegExp[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  contentFilter?: {
    enabled: boolean;
    strictMode?: boolean;
    customFilters?: ContentFilter[];
  };
  auditLog?: {
    enabled: boolean;
    logLevel?: "minimal" | "standard" | "verbose";
  };
  encryption?: {
    enabled: boolean;
    algorithm?: string;
  };
}

/**
 * Content filter definition
 */
export interface ContentFilter {
  name: string;
  pattern: RegExp;
  action: "block" | "warn" | "sanitize";
  replacement?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  userId?: string;
  resource?: string;
  details?: Record<string, any>;
  result: "success" | "failure" | "blocked";
  reason?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  errors: string[];
  warnings: string[];
}

interface RateLimitState {
  requests: number[];
  blocked: boolean;
  blockedUntil?: number;
}

const DEFAULT_CONFIG: SecurityConfig = {
  maxInputLength: 10000,
  allowedContentTypes: ["text/plain", "application/json"],
  blockedPatterns: [],
  rateLimit: { maxRequests: 100, windowMs: 60000 },
  contentFilter: { enabled: true, strictMode: false, customFilters: [] },
  auditLog: { enabled: true, logLevel: "standard" },
  encryption: { enabled: false, algorithm: "aes-256-gcm" },
};

const BUILT_IN_FILTERS: ContentFilter[] = [
  {
    name: "sql_injection",
    pattern:
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|TABLE|WHERE|SET)\b)/gi,
    action: "block",
  },
  {
    name: "xss_script",
    pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    action: "sanitize",
    replacement: "[REMOVED]",
  },
  {
    name: "html_injection",
    pattern: /<[^>]*on\w+\s*=/gi,
    action: "sanitize",
    replacement: "",
  },
  { name: "path_traversal", pattern: /\.\.\//gi, action: "block" },
];

/**
 * SecureIntegration class for security hardening
 */
export class SecureIntegration {
  private config: SecurityConfig;
  private rateLimitStates: Map<string, RateLimitState> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private encryptionKey: Buffer | null = null;
  private filters: ContentFilter[];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.filters = [
      ...BUILT_IN_FILTERS,
      ...(this.config.contentFilter?.customFilters || []),
    ];
    log.info("SecureIntegration initialized");
  }

  public initializeEncryption(key: string | Buffer): void {
    if (typeof key === "string") {
      this.encryptionKey = crypto.pbkdf2Sync(
        key,
        "deep-tree-echo-salt",
        100000,
        32,
        "sha256",
      );
    } else {
      this.encryptionKey = key;
    }
    log.info("Encryption initialized");
  }

  public validateInput(input: string, userId?: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      sanitized: input,
      errors: [],
      warnings: [],
    };

    if (input.length > this.config.maxInputLength!) {
      result.valid = false;
      result.errors.push(
        `Input exceeds maximum length of ${this.config.maxInputLength}`,
      );
      return result;
    }

    for (const pattern of this.config.blockedPatterns || []) {
      if (pattern.test(input)) {
        result.valid = false;
        result.errors.push(`Input matches blocked pattern`);
        return result;
      }
    }

    if (this.config.contentFilter?.enabled) {
      for (const filter of this.filters) {
        if (filter.pattern.test(result.sanitized!)) {
          switch (filter.action) {
            case "block":
              result.valid = false;
              result.errors.push(`Content blocked by filter: ${filter.name}`);
              return result;
            case "warn":
              result.warnings.push(
                `Content triggered warning filter: ${filter.name}`,
              );
              break;
            case "sanitize":
              result.sanitized = result.sanitized!.replace(
                filter.pattern,
                filter.replacement || "",
              );
              result.warnings.push(
                `Content sanitized by filter: ${filter.name}`,
              );
              break;
          }
        }
      }
    }
    return result;
  }

  public checkRateLimit(clientId: string): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
  } {
    const now = Date.now();
    const windowMs = this.config.rateLimit!.windowMs;
    const maxRequests = this.config.rateLimit!.maxRequests;

    let state = this.rateLimitStates.get(clientId);
    if (!state) {
      state = { requests: [], blocked: false };
      this.rateLimitStates.set(clientId, state);
    }

    if (state.blocked && state.blockedUntil && state.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: state.blockedUntil - now,
      };
    }

    state.requests = state.requests.filter((t) => now - t < windowMs);
    state.blocked = false;

    if (state.requests.length >= maxRequests) {
      state.blocked = true;
      state.blockedUntil = now + windowMs;
      return { allowed: false, remaining: 0, resetIn: windowMs };
    }

    state.requests.push(now);
    return {
      allowed: true,
      remaining: maxRequests - state.requests.length,
      resetIn: windowMs - (now - state.requests[0]),
    };
  }

  public encrypt(
    data: string,
  ): { encrypted: string; iv: string; tag: string } | null {
    if (!this.config.encryption?.enabled || !this.encryptionKey) return null;
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.config.encryption.algorithm!,
        this.encryptionKey,
        iv,
      ) as crypto.CipherGCM;
      let encrypted = cipher.update(data, "utf8", "hex");
      encrypted += cipher.final("hex");
      const tag = cipher.getAuthTag();
      return { encrypted, iv: iv.toString("hex"), tag: tag.toString("hex") };
    } catch (error) {
      log.error("Encryption failed:", error);
      return null;
    }
  }

  public decrypt(encrypted: string, iv: string, tag: string): string | null {
    if (!this.config.encryption?.enabled || !this.encryptionKey) return null;
    try {
      const decipher = crypto.createDecipheriv(
        this.config.encryption.algorithm!,
        this.encryptionKey,
        Buffer.from(iv, "hex"),
      ) as crypto.DecipherGCM;
      decipher.setAuthTag(Buffer.from(tag, "hex"));
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      log.error("Decryption failed:", error);
      return null;
    }
  }

  public hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, "sha512");
    return `${actualSalt}:${hash.toString("hex")}`;
  }

  public verifyHash(data: string, hashedData: string): boolean {
    const [salt, hash] = hashedData.split(":");
    const newHash = crypto
      .pbkdf2Sync(data, salt, 100000, 64, "sha512")
      .toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(newHash));
  }

  public generateApiKey(prefix: string = "dte"): string {
    const randomBytes = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now().toString(36);
    return `${prefix}_${timestamp}_${randomBytes}`;
  }

  public validateApiKey(apiKey: string, prefix: string = "dte"): boolean {
    if (!apiKey || apiKey.length < 10) return false;
    const pattern = new RegExp(`^${prefix}_[a-z0-9]+_[a-f0-9]{64}$`);
    return pattern.test(apiKey);
  }

  public sanitizeOutput(output: string): string {
    let sanitized = output;
    sanitized = sanitized.replace(
      /[a-zA-Z]+_[a-z0-9]+_[a-f0-9]{64}/g,
      "[API_KEY_REDACTED]",
    );
    sanitized = sanitized.replace(
      /password['":\s]*['"]?[^'"\s]+['"]?/gi,
      "password: [REDACTED]",
    );
    sanitized = sanitized.replace(
      /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g,
      "Bearer [TOKEN_REDACTED]",
    );
    return sanitized;
  }

  public encryptData(data: string): string {
    const result = this.encrypt(data);
    if (result) return `${result.iv}:${result.tag}:${result.encrypted}`;
    return Buffer.from(data).toString("base64");
  }

  public decryptData(encrypted: string): string {
    const parts = encrypted.split(":");
    if (parts.length === 3) {
      const result = this.decrypt(parts[2], parts[0], parts[1]);
      if (result) return result;
    }
    return Buffer.from(encrypted, "base64").toString();
  }

  public getAuditLog(options?: {
    startTime?: number;
    endTime?: number;
    action?: string;
    limit?: number;
  }): AuditLogEntry[] {
    let entries = [...this.auditLog];
    if (options?.startTime)
      entries = entries.filter((e) => e.timestamp >= options.startTime!);
    if (options?.endTime)
      entries = entries.filter((e) => e.timestamp <= options.endTime!);
    if (options?.action)
      entries = entries.filter((e) => e.action === options.action);
    entries.sort((a, b) => b.timestamp - a.timestamp);
    if (options?.limit) entries = entries.slice(0, options.limit);
    return entries;
  }

  public addContentFilter(filter: ContentFilter): void {
    this.filters.push(filter);
    log.info(`Added content filter: ${filter.name}`);
  }

  public updateConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.contentFilter?.customFilters) {
      this.filters = [
        ...BUILT_IN_FILTERS,
        ...config.contentFilter.customFilters,
      ];
    }
    log.info("Security configuration updated");
  }

  public resetRateLimits(clientId?: string): void {
    if (clientId) this.rateLimitStates.delete(clientId);
    else this.rateLimitStates.clear();
  }

  public getStats(): {
    auditLogSize: number;
    rateLimitedClients: number;
    activeFilters: number;
    encryptionEnabled: boolean;
  } {
    return {
      auditLogSize: this.auditLog.length,
      rateLimitedClients: Array.from(this.rateLimitStates.values()).filter(
        (s) => s.blocked,
      ).length,
      activeFilters: this.filters.length,
      encryptionEnabled: this.config.encryption?.enabled || false,
    };
  }
}

export function createSecureIntegration(
  options?: Partial<SecurityConfig>,
): SecureIntegration {
  return new SecureIntegration({
    maxInputLength: 50000,
    rateLimit: { maxRequests: 60, windowMs: 60000 },
    contentFilter: { enabled: true, strictMode: false },
    auditLog: { enabled: true, logLevel: "standard" },
    ...options,
  });
}
