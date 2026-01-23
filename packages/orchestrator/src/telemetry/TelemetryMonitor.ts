/**
 * @fileoverview Telemetry Monitor
 *
 * Provides real-time monitoring and telemetry for the Deep Tree Echo
 * orchestrator system. Tracks:
 * - Cognitive cycle metrics
 * - Stream performance
 * - Agent activity
 * - Memory usage
 * - Error rates
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/TelemetryMonitor");

/**
 * Metric data point
 */
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

/**
 * Metric definition
 */
export interface Metric {
  name: string;
  type: "counter" | "gauge" | "histogram";
  description: string;
  unit: string;
  dataPoints: MetricDataPoint[];
}

/**
 * System health status
 */
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  components: {
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    message?: string;
  }[];
  lastCheck: number;
}

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  source: string;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
}

/**
 * Telemetry snapshot
 */
export interface TelemetrySnapshot {
  timestamp: number;
  metrics: Record<string, number>;
  health: HealthStatus;
  activeAlerts: Alert[];
  systemInfo: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    cycleCount: number;
    stepCount: number;
  };
}

/**
 * Monitor configuration
 */
export interface TelemetryConfig {
  collectionIntervalMs: number;
  retentionPeriodMs: number;
  maxDataPoints: number;
  enableAlerts: boolean;
  alertThresholds: {
    memoryUsagePercent: number;
    errorRatePercent: number;
    cycleLatencyMs: number;
  };
}

const DEFAULT_CONFIG: TelemetryConfig = {
  collectionIntervalMs: 1000,
  retentionPeriodMs: 3600000, // 1 hour
  maxDataPoints: 3600,
  enableAlerts: true,
  alertThresholds: {
    memoryUsagePercent: 80,
    errorRatePercent: 5,
    cycleLatencyMs: 1000,
  },
};

/**
 * Telemetry Monitor
 *
 * Collects and manages telemetry data for the orchestrator system.
 */
export class TelemetryMonitor extends EventEmitter {
  private config: TelemetryConfig;
  private metrics: Map<string, Metric> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private running = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  // Counters
  private cycleCount = 0;
  private stepCount = 0;
  private errorCount = 0;
  private messageCount = 0;

  constructor(config: Partial<TelemetryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): void {
    // System metrics
    this.registerMetric({
      name: "system_memory_usage_bytes",
      type: "gauge",
      description: "Current memory usage in bytes",
      unit: "bytes",
      dataPoints: [],
    });

    this.registerMetric({
      name: "system_uptime_seconds",
      type: "counter",
      description: "System uptime in seconds",
      unit: "seconds",
      dataPoints: [],
    });

    // Cognitive cycle metrics
    this.registerMetric({
      name: "cognitive_cycles_total",
      type: "counter",
      description: "Total number of cognitive cycles completed",
      unit: "cycles",
      dataPoints: [],
    });

    this.registerMetric({
      name: "cognitive_steps_total",
      type: "counter",
      description: "Total number of cognitive steps executed",
      unit: "steps",
      dataPoints: [],
    });

    this.registerMetric({
      name: "cognitive_cycle_duration_ms",
      type: "histogram",
      description: "Duration of cognitive cycles in milliseconds",
      unit: "milliseconds",
      dataPoints: [],
    });

    // Stream metrics
    this.registerMetric({
      name: "stream_salience",
      type: "gauge",
      description: "Current salience level of consciousness streams",
      unit: "ratio",
      dataPoints: [],
    });

    // Agent metrics
    this.registerMetric({
      name: "agent_invocations_total",
      type: "counter",
      description: "Total number of agent invocations",
      unit: "invocations",
      dataPoints: [],
    });

    this.registerMetric({
      name: "agent_active_count",
      type: "gauge",
      description: "Number of currently active agents",
      unit: "agents",
      dataPoints: [],
    });

    // Message metrics
    this.registerMetric({
      name: "messages_processed_total",
      type: "counter",
      description: "Total number of messages processed",
      unit: "messages",
      dataPoints: [],
    });

    this.registerMetric({
      name: "message_processing_duration_ms",
      type: "histogram",
      description: "Duration of message processing in milliseconds",
      unit: "milliseconds",
      dataPoints: [],
    });

    // Error metrics
    this.registerMetric({
      name: "errors_total",
      type: "counter",
      description: "Total number of errors",
      unit: "errors",
      dataPoints: [],
    });

    this.registerMetric({
      name: "error_rate",
      type: "gauge",
      description: "Current error rate",
      unit: "ratio",
      dataPoints: [],
    });
  }

  /**
   * Register a metric
   */
  public registerMetric(metric: Metric): void {
    this.metrics.set(metric.name, metric);
  }

  /**
   * Start the telemetry monitor
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn("Telemetry monitor already running");
      return;
    }

    log.info("Starting Telemetry Monitor...");
    this.running = true;
    this.startTime = Date.now();

    // Start collection loop
    this.collectionInterval = setInterval(
      () => this.collectMetrics(),
      this.config.collectionIntervalMs,
    );

    this.emit("started", { timestamp: Date.now() });
    log.info("Telemetry Monitor started");
  }

  /**
   * Stop the telemetry monitor
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info("Stopping Telemetry Monitor...");
    this.running = false;

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    this.emit("stopped", { timestamp: Date.now() });
    log.info("Telemetry Monitor stopped");
  }

  /**
   * Collect metrics
   */
  private collectMetrics(): void {
    const now = Date.now();

    // System metrics
    this.recordMetric(
      "system_memory_usage_bytes",
      process.memoryUsage().heapUsed,
    );
    this.recordMetric("system_uptime_seconds", (now - this.startTime) / 1000);

    // Cognitive metrics
    this.recordMetric("cognitive_cycles_total", this.cycleCount);
    this.recordMetric("cognitive_steps_total", this.stepCount);

    // Error rate
    const errorRate =
      this.messageCount > 0 ? this.errorCount / this.messageCount : 0;
    this.recordMetric("error_rate", errorRate);

    // Check thresholds and generate alerts
    if (this.config.enableAlerts) {
      this.checkAlertThresholds();
    }

    // Prune old data points
    this.pruneOldDataPoints();

    this.emit("metrics_collected", { timestamp: now });
  }

  /**
   * Record a metric value
   */
  public recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      log.warn(`Unknown metric: ${name}`);
      return;
    }

    metric.dataPoints.push({
      timestamp: Date.now(),
      value,
      labels,
    });

    // Trim to max data points
    if (metric.dataPoints.length > this.config.maxDataPoints) {
      metric.dataPoints.shift();
    }
  }

  /**
   * Increment a counter metric
   */
  public incrementCounter(name: string, amount: number = 1): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== "counter") {
      log.warn(`Unknown counter metric: ${name}`);
      return;
    }

    const lastValue =
      metric.dataPoints.length > 0
        ? metric.dataPoints[metric.dataPoints.length - 1].value
        : 0;

    this.recordMetric(name, lastValue + amount);
  }

  /**
   * Record a cycle completion
   */
  public recordCycleComplete(durationMs: number): void {
    this.cycleCount++;
    this.recordMetric("cognitive_cycles_total", this.cycleCount);
    this.recordMetric("cognitive_cycle_duration_ms", durationMs);
  }

  /**
   * Record a step completion
   */
  public recordStepComplete(): void {
    this.stepCount++;
    this.recordMetric("cognitive_steps_total", this.stepCount);
  }

  /**
   * Record a message processed
   */
  public recordMessageProcessed(durationMs: number): void {
    this.messageCount++;
    this.recordMetric("messages_processed_total", this.messageCount);
    this.recordMetric("message_processing_duration_ms", durationMs);
  }

  /**
   * Record an error
   */
  public recordError(source: string, message: string): void {
    this.errorCount++;
    this.recordMetric("errors_total", this.errorCount);

    // Create alert if enabled
    if (this.config.enableAlerts) {
      this.createAlert("error", message, source);
    }
  }

  /**
   * Record stream salience
   */
  public recordStreamSalience(streamId: number, salience: number): void {
    this.recordMetric("stream_salience", salience, {
      stream: String(streamId),
    });
  }

  /**
   * Record agent invocation
   */
  public recordAgentInvocation(_agentId: string): void {
    this.incrementCounter("agent_invocations_total");
  }

  /**
   * Record active agent count
   */
  public recordActiveAgents(count: number): void {
    this.recordMetric("agent_active_count", count);
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(): void {
    const { alertThresholds } = this.config;

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryPercent > alertThresholds.memoryUsagePercent) {
      this.createAlert(
        "warning",
        `High memory usage: ${memoryPercent.toFixed(1)}%`,
        "system",
      );
    }

    // Check error rate
    const errorRate =
      this.messageCount > 0 ? (this.errorCount / this.messageCount) * 100 : 0;
    if (errorRate > alertThresholds.errorRatePercent) {
      this.createAlert(
        "warning",
        `High error rate: ${errorRate.toFixed(1)}%`,
        "system",
      );
    }

    // Check cycle latency
    const cycleDurationMetric = this.metrics.get("cognitive_cycle_duration_ms");
    if (cycleDurationMetric && cycleDurationMetric.dataPoints.length > 0) {
      const lastDuration =
        cycleDurationMetric.dataPoints[
          cycleDurationMetric.dataPoints.length - 1
        ].value;
      if (lastDuration > alertThresholds.cycleLatencyMs) {
        this.createAlert(
          "warning",
          `High cycle latency: ${lastDuration.toFixed(0)}ms`,
          "cognitive",
        );
      }
    }
  }

  /**
   * Create an alert
   */
  public createAlert(
    severity: Alert["severity"],
    message: string,
    source: string,
  ): Alert {
    const alertId = `alert-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    const alert: Alert = {
      id: alertId,
      severity,
      message,
      source,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.alerts.set(alertId, alert);
    this.emit("alert_created", alert);
    log.warn(`Alert created: [${severity}] ${message}`);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit("alert_acknowledged", alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = Date.now();
      this.emit("alert_resolved", alert);
      return true;
    }
    return false;
  }

  /**
   * Prune old data points
   */
  private pruneOldDataPoints(): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;

    for (const metric of this.metrics.values()) {
      metric.dataPoints = metric.dataPoints.filter(
        (dp) => dp.timestamp >= cutoff,
      );
    }
  }

  /**
   * Get health status
   */
  public getHealthStatus(): HealthStatus {
    const components: HealthStatus["components"] = [];

    // Check memory
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    components.push({
      name: "memory",
      status:
        memoryPercent > 90
          ? "unhealthy"
          : memoryPercent > 70
            ? "degraded"
            : "healthy",
      message: `${memoryPercent.toFixed(1)}% used`,
    });

    // Check error rate
    const errorRate =
      this.messageCount > 0 ? (this.errorCount / this.messageCount) * 100 : 0;
    components.push({
      name: "error_rate",
      status:
        errorRate > 10 ? "unhealthy" : errorRate > 5 ? "degraded" : "healthy",
      message: `${errorRate.toFixed(1)}% error rate`,
    });

    // Check cognitive cycles
    components.push({
      name: "cognitive_engine",
      status: this.cycleCount > 0 ? "healthy" : "degraded",
      message: `${this.cycleCount} cycles completed`,
    });

    // Determine overall status
    const hasUnhealthy = components.some((c) => c.status === "unhealthy");
    const hasDegraded = components.some((c) => c.status === "degraded");

    return {
      status: hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy",
      components,
      lastCheck: Date.now(),
    };
  }

  /**
   * Get a snapshot of current telemetry
   */
  public getSnapshot(): TelemetrySnapshot {
    const metrics: Record<string, number> = {};

    for (const [name, metric] of this.metrics) {
      if (metric.dataPoints.length > 0) {
        metrics[name] = metric.dataPoints[metric.dataPoints.length - 1].value;
      }
    }

    return {
      timestamp: Date.now(),
      metrics,
      health: this.getHealthStatus(),
      activeAlerts: Array.from(this.alerts.values()).filter(
        (a) => !a.resolvedAt,
      ),
      systemInfo: {
        uptime: Date.now() - this.startTime,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: 0, // Would need OS-level access
        cycleCount: this.cycleCount,
        stepCount: this.stepCount,
      },
    };
  }

  /**
   * Get metric by name
   */
  public getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.resolvedAt);
  }

  /**
   * Export metrics in Prometheus format
   */
  public exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.description}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.dataPoints.length > 0) {
        const lastPoint = metric.dataPoints[metric.dataPoints.length - 1];
        const labels = lastPoint.labels
          ? `{${Object.entries(lastPoint.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(",")}}`
          : "";
        lines.push(`${metric.name}${labels} ${lastPoint.value}`);
      }
    }

    return lines.join("\n");
  }
}

export default TelemetryMonitor;
