import { getLogger } from 'deep-tree-echo-core';
import * as http from 'http';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

const log = getLogger('deep-tree-echo-orchestrator/WebhookServer');

/**
 * Webhook event types
 */
export enum WebhookEventType {
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  COGNITIVE_RESPONSE = 'cognitive_response',
  STATE_CHANGE = 'state_change',
  ERROR = 'error',
  CUSTOM = 'custom',
}

/**
 * Webhook endpoint configuration
 */
export interface WebhookEndpoint {
  id: string;
  name: string;
  path: string;
  secret?: string;
  enabled: boolean;
  eventTypes: WebhookEventType[];
  handler: (payload: any, headers: Record<string, string>) => Promise<any>;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * Webhook request context
 */
export interface WebhookContext {
  endpointId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: any;
  timestamp: number;
}

/**
 * Webhook server configuration
 */
export interface WebhookServerConfig {
  port?: number;
  host?: string;
  basePath?: string;
  enableCors?: boolean;
  corsOrigins?: string[];
  maxBodySize?: number;
  defaultRateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

const DEFAULT_CONFIG: WebhookServerConfig = {
  port: 8080,
  host: '0.0.0.0',
  basePath: '/webhooks',
  enableCors: true,
  corsOrigins: ['*'],
  maxBodySize: 1024 * 1024, // 1MB
  defaultRateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
};

/**
 * Rate limiter for endpoints
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  check(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove old timestamps
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  clear(): void {
    this.requests.clear();
  }
}

/**
 * Webhook server for external integrations
 * Allows external services to trigger Deep Tree Echo actions
 */
export class WebhookServer extends EventEmitter {
  private config: WebhookServerConfig;
  private server: http.Server | null = null;
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private rateLimiter: RateLimiter = new RateLimiter();
  private running: boolean = false;
  private endpointIdCounter: number = 0;

  constructor(config: Partial<WebhookServerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupDefaultEndpoints();
  }

  /**
   * Set up default webhook endpoints
   */
  private setupDefaultEndpoints(): void {
    // Health check endpoint
    this.registerEndpoint({
      name: 'Health Check',
      path: '/health',
      eventTypes: [],
      handler: async () => ({
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime(),
      }),
    });

    // Status endpoint
    this.registerEndpoint({
      name: 'Status',
      path: '/status',
      eventTypes: [],
      handler: async () => ({
        running: this.running,
        endpoints: this.endpoints.size,
        config: {
          port: this.config.port,
          basePath: this.config.basePath,
        },
      }),
    });
  }

  /**
   * Register a webhook endpoint
   */
  public registerEndpoint(
    options: Omit<WebhookEndpoint, 'id' | 'enabled'> & { enabled?: boolean }
  ): string {
    const id = `endpoint_${++this.endpointIdCounter}`;

    const endpoint: WebhookEndpoint = {
      id,
      enabled: true,
      ...options,
    };

    this.endpoints.set(endpoint.path, endpoint);
    log.info(`Registered webhook endpoint: ${endpoint.name} at ${endpoint.path}`);

    return id;
  }

  /**
   * Unregister a webhook endpoint
   */
  public unregisterEndpoint(path: string): boolean {
    const endpoint = this.endpoints.get(path);
    if (!endpoint) return false;

    this.endpoints.delete(path);
    log.info(`Unregistered webhook endpoint: ${endpoint.name}`);
    return true;
  }

  /**
   * Start the webhook server
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn('Webhook server is already running');
      return;
    }

    log.info('Starting webhook server...');

    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });

        this.server.listen(this.config.port, this.config.host, () => {
          log.info(`Webhook server listening on ${this.config.host}:${this.config.port}`);
          this.running = true;
          this.emit('started');
          resolve();
        });

        this.server.on('error', (error) => {
          log.error('Webhook server error:', error);
          this.emit('error', error);
          reject(error);
        });
      } catch (error) {
        log.error('Failed to start webhook server:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();

    // Set CORS headers
    if (this.config.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', this.config.corsOrigins?.join(',') || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Webhook-Secret'
      );
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Parse URL
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      let path = url.pathname;

      // Remove base path
      if (this.config.basePath && path.startsWith(this.config.basePath)) {
        path = path.slice(this.config.basePath.length) || '/';
      }

      // Find endpoint
      const endpoint = this.endpoints.get(path);

      if (!endpoint) {
        this.sendResponse(res, 404, { error: 'Endpoint not found' });
        return;
      }

      if (!endpoint.enabled) {
        this.sendResponse(res, 503, { error: 'Endpoint disabled' });
        return;
      }

      // Rate limiting
      const rateLimit = endpoint.rateLimit || this.config.defaultRateLimit;
      if (rateLimit) {
        const clientIp = req.socket.remoteAddress || 'unknown';
        const key = `${endpoint.id}:${clientIp}`;

        if (!this.rateLimiter.check(key, rateLimit.maxRequests, rateLimit.windowMs)) {
          this.sendResponse(res, 429, { error: 'Rate limit exceeded' });
          return;
        }
      }

      // Parse body
      const body = await this.parseBody(req);

      // Verify signature if secret is configured
      if (endpoint.secret) {
        const signature = req.headers['x-webhook-signature'] as string;
        if (!this.verifySignature(body, signature, endpoint.secret)) {
          this.sendResponse(res, 401, { error: 'Invalid signature' });
          return;
        }
      }

      // Build context
      const context: WebhookContext = {
        endpointId: endpoint.id,
        method: req.method || 'GET',
        path,
        headers: this.parseHeaders(req.headers),
        query: Object.fromEntries(url.searchParams),
        body,
        timestamp: startTime,
      };

      // Execute handler
      const result = await endpoint.handler(body, context.headers);

      // Emit event
      this.emit('request', {
        endpoint: endpoint.name,
        path,
        duration: Date.now() - startTime,
        success: true,
      });

      this.sendResponse(res, 200, result);
    } catch (error) {
      log.error('Webhook request error:', error);

      this.emit('request', {
        path: req.url,
        duration: Date.now() - startTime,
        success: false,
        error: (error as Error).message,
      });

      this.sendResponse(res, 500, { error: 'Internal server error' });
    }
  }

  /**
   * Parse request body
   */
  private parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      let size = 0;

      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > this.config.maxBodySize!) {
          reject(new Error('Request body too large'));
          return;
        }
        body += chunk;
      });

      req.on('end', () => {
        if (!body) {
          resolve({});
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Parse headers to simple object
   */
  private parseHeaders(headers: http.IncomingHttpHeaders): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (Array.isArray(value)) {
        result[key] = value.join(', ');
      }
    }
    return result;
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(body: any, signature: string, secret: string): boolean {
    if (!signature) return false;

    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  }

  /**
   * Send HTTP response
   */
  private sendResponse(res: http.ServerResponse, status: number, data: any): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Trigger outgoing webhook
   */
  public async triggerWebhook(
    url: string,
    eventType: WebhookEventType,
    payload: any,
    secret?: string
  ): Promise<boolean> {
    try {
      const body = JSON.stringify({
        event: eventType,
        timestamp: Date.now(),
        data: payload,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (secret) {
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      log.info(`Triggered webhook to ${url}: ${response.status}`);
      return response.ok;
    } catch (error) {
      log.error(`Failed to trigger webhook to ${url}:`, error);
      return false;
    }
  }

  /**
   * Stop the webhook server
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info('Stopping webhook server...');

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.running = false;
          this.rateLimiter.clear();
          log.info('Webhook server stopped');
          this.emit('stopped');
          resolve();
        });
      } else {
        this.running = false;
        resolve();
      }
    });
  }

  /**
   * Check if server is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get registered endpoints
   */
  public getEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    running: boolean;
    port: number;
    endpoints: number;
    enabledEndpoints: number;
  } {
    const endpoints = Array.from(this.endpoints.values());
    return {
      running: this.running,
      port: this.config.port!,
      endpoints: endpoints.length,
      enabledEndpoints: endpoints.filter((e) => e.enabled).length,
    };
  }
}
