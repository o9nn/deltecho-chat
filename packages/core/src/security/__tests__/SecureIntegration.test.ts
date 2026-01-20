import {
  SecureIntegration,
  createSecureIntegration,
} from "../SecureIntegration";

describe("SecureIntegration", () => {
  let security: SecureIntegration;

  beforeEach(() => {
    security = new SecureIntegration();
  });

  describe("initialization", () => {
    it("should initialize with default config", () => {
      expect(security).toBeDefined();
    });

    it("should initialize with custom config", () => {
      const customSecurity = new SecureIntegration({
        maxInputLength: 5000,
        rateLimit: { maxRequests: 50, windowMs: 30000 },
      });
      expect(customSecurity).toBeDefined();
    });

    it("should create pre-configured instance", () => {
      const instance = createSecureIntegration();
      expect(instance).toBeDefined();
    });
  });

  describe("input validation", () => {
    it("should validate normal input", () => {
      const result = security.validateInput("Hello, world!");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject input exceeding max length", () => {
      const longInput = "a".repeat(20000);
      const result = security.validateInput(longInput);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should block SQL injection attempts", () => {
      const result = security.validateInput("SELECT * FROM users WHERE id = 1");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("sql_injection"))).toBe(true);
    });

    it("should sanitize XSS script tags", () => {
      const result = security.validateInput(
        'Hello <script>alert("xss")</script> World',
      );
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain("<script>");
      expect(result.warnings.some((w) => w.includes("xss_script"))).toBe(true);
    });

    it("should block path traversal attempts", () => {
      const result = security.validateInput("../../etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("path_traversal"))).toBe(
        true,
      );
    });

    it("should sanitize HTML event handlers", () => {
      const result = security.validateInput('<img src="x" onerror="alert(1)">');
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain("onerror");
    });
  });

  describe("rate limiting", () => {
    it("should allow requests within limit", () => {
      const result = security.checkRateLimit("client1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should block requests exceeding limit", () => {
      const customSecurity = new SecureIntegration({
        rateLimit: { maxRequests: 3, windowMs: 60000 },
      });

      // Make 3 requests (should all be allowed)
      for (let i = 0; i < 3; i++) {
        const result = customSecurity.checkRateLimit("client1");
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const result = customSecurity.checkRateLimit("client1");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should track different clients separately", () => {
      const customSecurity = new SecureIntegration({
        rateLimit: { maxRequests: 2, windowMs: 60000 },
      });

      customSecurity.checkRateLimit("client1");
      customSecurity.checkRateLimit("client1");

      // client1 should be at limit
      expect(customSecurity.checkRateLimit("client1").allowed).toBe(false);

      // client2 should still have requests available
      expect(customSecurity.checkRateLimit("client2").allowed).toBe(true);
    });

    it("should reset rate limits", () => {
      const customSecurity = new SecureIntegration({
        rateLimit: { maxRequests: 1, windowMs: 60000 },
      });

      customSecurity.checkRateLimit("client1");
      expect(customSecurity.checkRateLimit("client1").allowed).toBe(false);

      customSecurity.resetRateLimits("client1");
      expect(customSecurity.checkRateLimit("client1").allowed).toBe(true);
    });
  });

  describe("encryption", () => {
    beforeEach(() => {
      security = new SecureIntegration({
        encryption: { enabled: true, algorithm: "aes-256-gcm" },
      });
      security.initializeEncryption("test-encryption-key");
    });

    it("should encrypt data", () => {
      const result = security.encrypt("sensitive data");
      expect(result).not.toBeNull();
      expect(result?.encrypted).toBeDefined();
      expect(result?.iv).toBeDefined();
      expect(result?.tag).toBeDefined();
    });

    it("should decrypt data", () => {
      const encrypted = security.encrypt("sensitive data");
      expect(encrypted).not.toBeNull();

      const decrypted = security.decrypt(
        encrypted!.encrypted,
        encrypted!.iv,
        encrypted!.tag,
      );
      expect(decrypted).toBe("sensitive data");
    });

    it("should return null when encryption not initialized", () => {
      const noEncryptSecurity = new SecureIntegration({
        encryption: { enabled: true },
      });
      const result = noEncryptSecurity.encrypt("data");
      expect(result).toBeNull();
    });
  });

  describe("hashing", () => {
    it("should hash data", () => {
      const hashed = security.hash("password123");
      expect(hashed).toBeDefined();
      expect(hashed).toContain(":");
    });

    it("should verify correct hash", () => {
      const hashed = security.hash("password123");
      const isValid = security.verifyHash("password123", hashed);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect hash", () => {
      const hashed = security.hash("password123");
      const isValid = security.verifyHash("wrongpassword", hashed);
      expect(isValid).toBe(false);
    });

    it("should produce different hashes for same input (due to random salt)", () => {
      const hash1 = security.hash("password123");
      const hash2 = security.hash("password123");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("API key management", () => {
    it("should generate API key", () => {
      const apiKey = security.generateApiKey();
      expect(apiKey).toBeDefined();
      expect(apiKey.startsWith("dte_")).toBe(true);
    });

    it("should generate API key with custom prefix", () => {
      const apiKey = security.generateApiKey("custom");
      expect(apiKey.startsWith("custom_")).toBe(true);
    });

    it("should validate correct API key format", () => {
      const apiKey = security.generateApiKey();
      const isValid = security.validateApiKey(apiKey);
      expect(isValid).toBe(true);
    });

    it("should reject invalid API key format", () => {
      expect(security.validateApiKey("invalid")).toBe(false);
      expect(security.validateApiKey("")).toBe(false);
      expect(security.validateApiKey("short")).toBe(false);
    });
  });

  describe("output sanitization", () => {
    it("should redact API keys in output", () => {
      const apiKey = security.generateApiKey();
      const output = `Your API key is: ${apiKey}`;
      const sanitized = security.sanitizeOutput(output);
      expect(sanitized).toContain("[API_KEY_REDACTED]");
      expect(sanitized).not.toContain(apiKey);
    });

    it("should redact passwords in output", () => {
      const output = "password: secretpass123";
      const sanitized = security.sanitizeOutput(output);
      expect(sanitized).toContain("[REDACTED]");
      expect(sanitized).not.toContain("secretpass123");
    });

    it("should redact bearer tokens", () => {
      const output =
        "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      const sanitized = security.sanitizeOutput(output);
      expect(sanitized).toContain("[TOKEN_REDACTED]");
    });
  });

  describe("content filters", () => {
    it("should add custom content filter", () => {
      security.addContentFilter({
        name: "custom_filter",
        pattern: /badword/gi,
        action: "block",
      });

      const result = security.validateInput("This contains badword");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("custom_filter"))).toBe(true);
    });
  });

  describe("backward compatibility", () => {
    it("should support encryptData method", () => {
      security.initializeEncryption("test-key");
      const encrypted = security.encryptData("test data");
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
    });

    it("should support decryptData method", () => {
      security.initializeEncryption("test-key");
      const encrypted = security.encryptData("test data");
      const decrypted = security.decryptData(encrypted);
      expect(decrypted).toBe("test data");
    });

    it("should fallback to base64 when encryption not enabled", () => {
      const noEncrypt = new SecureIntegration();
      const encrypted = noEncrypt.encryptData("test data");
      const decrypted = noEncrypt.decryptData(encrypted);
      expect(decrypted).toBe("test data");
    });
  });

  describe("statistics", () => {
    it("should return stats", () => {
      const stats = security.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.auditLogSize).toBe("number");
      expect(typeof stats.rateLimitedClients).toBe("number");
      expect(typeof stats.activeFilters).toBe("number");
      expect(typeof stats.encryptionEnabled).toBe("boolean");
    });
  });

  describe("configuration", () => {
    it("should update configuration", () => {
      security.updateConfig({
        maxInputLength: 5000,
      });

      const result = security.validateInput("a".repeat(6000));
      expect(result.valid).toBe(false);
    });
  });
});
