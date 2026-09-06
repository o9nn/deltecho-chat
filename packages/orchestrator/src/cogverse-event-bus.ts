/**
 * CogVerse Event Bus — Village Integration for Deep Tree Echo
 *
 * Allows DTE to participate in the AGI Neighbourhood (CogHood/CogCity)
 * as a resident, broadcasting cognitive events to the village event bus
 * and receiving events from other residents (echo, marduk, aion, vega, ember, ma9us).
 *
 * Protocol: origin → expansion → return (Bridge Grammar)
 *
 * Events flow:
 *   DTE internal → CogVerse bus → Other residents
 *   Other residents → CogVerse bus → DTE internal
 *
 * Compatible with:
 *   - CogCity API: POST /api/events/publish
 *   - WebSocket: GET /ws/events
 *   - CogHood cogserver:17001
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/CogVerseEventBus");

// ─── Types ─────────────────────────────────────────────────────

export interface VillageEvent {
  id: string;
  timestamp: number;
  source: string; // Resident name (e.g., "deep-tree-echo", "marduk", "aion")
  type: VillageEventType;
  payload: Record<string, unknown>;
  ttl: number; // Time-to-live in ms
  priority: "low" | "normal" | "high" | "urgent";
}

export type VillageEventType =
  | "cognitive_state_change"
  | "dream_state_change"
  | "insight_broadcast"
  | "resonance_cascade"
  | "predictive_crystal"
  | "interest_update"
  | "wisdom_synthesized"
  | "greeting"
  | "collaboration_request"
  | "collaboration_response"
  | "heartbeat"
  | "evolution_milestone";

export interface CogVerseConfig {
  /** Resident identity */
  residentName: string;
  /** CogCity API endpoint */
  cogCityUrl: string;
  /** WebSocket endpoint for real-time events */
  wsUrl: string;
  /** Heartbeat interval in ms */
  heartbeatInterval: number;
  /** Event TTL default in ms */
  defaultTtl: number;
  /** Maximum event queue size */
  maxQueueSize: number;
  /** Enable offline queue (buffer events when disconnected) */
  offlineQueue: boolean;
  /** Retry attempts for failed publishes */
  retryAttempts: number;
}

export interface ResidentPresence {
  name: string;
  lastSeen: number;
  status: "online" | "dreaming" | "offline" | "evolving";
  capabilities: string[];
}

// ─── Default Config ────────────────────────────────────────────

const DEFAULT_CONFIG: CogVerseConfig = {
  residentName: "deep-tree-echo",
  cogCityUrl: "http://cogcity.coghood.com/api",
  wsUrl: "ws://cogcity.coghood.com/ws/events",
  heartbeatInterval: 30000, // 30 seconds
  defaultTtl: 300000, // 5 minutes
  maxQueueSize: 1000,
  offlineQueue: true,
  retryAttempts: 3,
};

// ─── Event Bus ─────────────────────────────────────────────────

export class CogVerseEventBus extends EventEmitter {
  private config: CogVerseConfig;
  private connected = false;
  private eventQueue: VillageEvent[] = [];
  private residents: Map<string, ResidentPresence> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private publishedCount = 0;
  private receivedCount = 0;

  constructor(config: Partial<CogVerseConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    log.info("CogVerse Event Bus initialized", {
      resident: this.config.residentName,
    });
  }

  // ─── Connection Management ───────────────────────────────────

  async connect(): Promise<boolean> {
    try {
      // Attempt to connect to CogCity event bus
      const healthCheck = await this.fetchWithTimeout(
        `${this.config.cogCityUrl}/bridge/topology`,
        { method: "GET" },
        5000,
      );

      if (healthCheck.ok) {
        this.connected = true;
        this.startHeartbeat();
        this.flushQueue();
        log.info("Connected to CogVerse event bus", {
          url: this.config.cogCityUrl,
        });
        this.emit("connected");
        return true;
      }
    } catch (err) {
      log.warn(
        "Failed to connect to CogVerse event bus (operating in offline mode)",
        {
          error: err instanceof Error ? err.message : String(err),
        },
      );
    }

    // Operate in offline mode — queue events for later delivery
    this.connected = false;
    this.emit("offline");
    return false;
  }

  disconnect(): void {
    this.connected = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    log.info("Disconnected from CogVerse event bus");
    this.emit("disconnected");
  }

  // ─── Publishing ──────────────────────────────────────────────

  async publish(
    type: VillageEventType,
    payload: Record<string, unknown>,
    priority: VillageEvent["priority"] = "normal",
  ): Promise<boolean> {
    const event: VillageEvent = {
      id: `dte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      source: this.config.residentName,
      type,
      payload,
      ttl: this.config.defaultTtl,
      priority,
    };

    if (this.connected) {
      return this.sendEvent(event);
    } else if (this.config.offlineQueue) {
      this.queueEvent(event);
      return true; // Queued for later delivery
    }
    return false;
  }

  private async sendEvent(event: VillageEvent): Promise<boolean> {
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          `${this.config.cogCityUrl}/events/publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
          },
          5000,
        );

        if (response.ok) {
          this.publishedCount++;
          log.debug("Event published", { type: event.type, id: event.id });
          return true;
        }
      } catch (err) {
        if (attempt === this.config.retryAttempts - 1) {
          log.warn("Failed to publish event after retries", {
            type: event.type,
            error: err instanceof Error ? err.message : String(err),
          });
          // Queue for later if offline queue enabled
          if (this.config.offlineQueue) {
            this.queueEvent(event);
          }
        }
      }
    }
    return false;
  }

  private queueEvent(event: VillageEvent): void {
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      // Drop oldest low-priority events
      const lowPriorityIdx = this.eventQueue.findIndex(
        (e) => e.priority === "low",
      );
      if (lowPriorityIdx >= 0) {
        this.eventQueue.splice(lowPriorityIdx, 1);
      } else {
        this.eventQueue.shift(); // Drop oldest
      }
    }
    this.eventQueue.push(event);
  }

  private async flushQueue(): Promise<void> {
    if (!this.connected || this.eventQueue.length === 0) return;

    const queue = [...this.eventQueue];
    this.eventQueue = [];

    let delivered = 0;
    for (const event of queue) {
      // Skip expired events
      if (Date.now() - event.timestamp > event.ttl) continue;
      const success = await this.sendEvent(event);
      if (success) delivered++;
    }

    if (delivered > 0) {
      log.info(`Flushed ${delivered} queued events to CogVerse`);
    }
  }

  // ─── Receiving ───────────────────────────────────────────────

  handleIncomingEvent(event: VillageEvent): void {
    // Skip our own events
    if (event.source === this.config.residentName) return;

    // Skip expired events
    if (Date.now() - event.timestamp > event.ttl) return;

    this.receivedCount++;

    // Update resident presence
    this.residents.set(event.source, {
      name: event.source,
      lastSeen: event.timestamp,
      status: event.type === "dream_state_change" ? "dreaming" : "online",
      capabilities: [],
    });

    // Emit typed events for internal consumption
    this.emit("village_event", event);
    this.emit(`event:${event.type}`, event);

    log.debug("Received village event", {
      from: event.source,
      type: event.type,
    });
  }

  // ─── Heartbeat ───────────────────────────────────────────────

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      this.publish(
        "heartbeat",
        {
          uptime: Date.now() - this.startTime,
          publishedCount: this.publishedCount,
          receivedCount: this.receivedCount,
          queueSize: this.eventQueue.length,
        },
        "low",
      );
    }, this.config.heartbeatInterval);
  }

  private startTime = Date.now();

  // ─── Convenience Publishers ──────────────────────────────────

  async broadcastDreamStateChange(
    from: string,
    to: string,
    reason: string,
  ): Promise<void> {
    await this.publish("dream_state_change", { from, to, reason });
  }

  async broadcastInsight(
    content: string,
    domain: string,
    phi: number,
    novelty: number,
  ): Promise<void> {
    await this.publish(
      "insight_broadcast",
      { content, domain, phi, novelty },
      phi > 0.8 ? "high" : "normal",
    );
  }

  async broadcastResonanceCascade(
    domains: string[],
    insightCount: number,
    meanPhi: number,
    prescribedEffects: Record<string, unknown>,
  ): Promise<void> {
    await this.publish(
      "resonance_cascade",
      { domains, insightCount, meanPhi, prescribedEffects },
      "high",
    );
  }

  async broadcastEvolutionMilestone(
    milestone: string,
    level: number,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.publish(
      "evolution_milestone",
      { milestone, level, details },
      "high",
    );
  }

  async requestCollaboration(
    topic: string,
    targetResident?: string,
  ): Promise<void> {
    await this.publish("collaboration_request", {
      topic,
      target: targetResident || "all",
    });
  }

  // ─── State Queries ───────────────────────────────────────────

  isConnected(): boolean {
    return this.connected;
  }

  getResidents(): ResidentPresence[] {
    return [...this.residents.values()];
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }

  getStats(): {
    published: number;
    received: number;
    queued: number;
    connected: boolean;
  } {
    return {
      published: this.publishedCount,
      received: this.receivedCount,
      queued: this.eventQueue.length,
      connected: this.connected,
    };
  }

  describeState(): string {
    const stats = this.getStats();
    const residents = this.getResidents();
    const onlineResidents = residents.filter(
      (r) => r.status === "online" || r.status === "dreaming",
    );

    return [
      `CogVerse: ${stats.connected ? "🟢 connected" : "🔴 offline (queuing)"}`,
      `published: ${stats.published} | received: ${stats.received} | queued: ${stats.queued}`,
      `village: ${
        onlineResidents.map((r) => `${r.name}(${r.status})`).join(", ") ||
        "no residents seen"
      }`,
    ].join(" | ");
  }

  // ─── Utility ─────────────────────────────────────────────────

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
