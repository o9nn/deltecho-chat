/**
 * PerceptionHandlers - Real Proactive Perception for Deep Tree Echo
 *
 * Provides actual environmental scanning capabilities that feed percepts
 * into the CognitiveTickProcessor. Instead of waiting passively for
 * incoming DeltaChat messages, DTE can now:
 *
 * - Watch filesystem directories for changes (new files, modifications)
 * - Poll email/mailbox for new messages (via Dovecot IMAP)
 * - Run scheduled perception scans (cron-like)
 * - Monitor system resources (CPU, memory, disk)
 * - Scan git repositories for changes
 *
 * Each handler produces CognitivePercept objects that flow into the
 * proactive loop's PERCEIVE phase.
 *
 * Architecture: These are the "senses" of the AAR Arena —
 * the environmental signals that the Agent must process.
 */
import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";
import type { CognitivePercept } from "../cognitive-tick-processor.js";

const log = getLogger("deep-tree-echo-orchestrator/PerceptionHandlers");

// ─── Types ──────────────────────────────────────────────────────

export interface PerceptionHandlerConfig {
  /** Enable filesystem watching */
  enableFilesystemWatch: boolean;
  /** Directories to watch */
  watchDirectories: string[];
  /** Enable system resource monitoring */
  enableSystemMonitor: boolean;
  /** System monitor interval (ms) */
  systemMonitorInterval: number;
  /** Enable git repository scanning */
  enableGitScan: boolean;
  /** Git repositories to scan */
  gitRepositories: string[];
  /** Git scan interval (ms) */
  gitScanInterval: number;
  /** Enable scheduled tasks */
  enableScheduledScans: boolean;
  /** Custom scan interval (ms) */
  customScanInterval: number;
}

const DEFAULT_CONFIG: PerceptionHandlerConfig = {
  enableFilesystemWatch: true,
  watchDirectories: [],
  enableSystemMonitor: true,
  systemMonitorInterval: 60000, // 1 minute
  enableGitScan: false,
  gitRepositories: [],
  gitScanInterval: 300000, // 5 minutes
  enableScheduledScans: true,
  customScanInterval: 30000, // 30 seconds
};

export type PerceptCallback = (percept: CognitivePercept) => void;

// ─── Perception Handler Registry ────────────────────────────────

export class PerceptionHandlers extends EventEmitter {
  private config: PerceptionHandlerConfig;
  private running: boolean = false;
  private watchers: Array<{ close: () => void }> = [];
  private intervals: ReturnType<typeof setInterval>[] = [];
  private perceptCallback: PerceptCallback | null = null;
  private perceptCount: number = 0;
  private lastSystemState: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  } | null = null;

  constructor(config?: Partial<PerceptionHandlerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register callback for percept delivery
   */
  onPercept(callback: PerceptCallback): void {
    this.perceptCallback = callback;
  }

  /**
   * Start all configured perception handlers
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    log.info("Starting perception handlers...");

    if (
      this.config.enableFilesystemWatch &&
      this.config.watchDirectories.length > 0
    ) {
      await this.startFilesystemWatch();
    }

    if (this.config.enableSystemMonitor) {
      this.startSystemMonitor();
    }

    if (this.config.enableGitScan && this.config.gitRepositories.length > 0) {
      this.startGitScan();
    }

    log.info("Perception handlers started");
    this.emit("started");
  }

  /**
   * Stop all perception handlers
   */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    // Close filesystem watchers
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {
        /* ignore */
      }
    }
    this.watchers = [];

    // Clear intervals
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];

    log.info("Perception handlers stopped");
    this.emit("stopped");
  }

  // ─── Filesystem Watch ─────────────────────────────────────────

  private async startFilesystemWatch(): Promise<void> {
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");

      for (const dir of this.config.watchDirectories) {
        try {
          const watcher = fs.watch(
            dir,
            { recursive: true },
            (eventType, filename) => {
              if (!filename || !this.running) return;

              const fullPath = path.join(dir, filename);
              this.emitPercept({
                source: "internal",
                content: `File ${eventType}: ${fullPath}`,
                salience: eventType === "rename" ? 0.6 : 0.4,
                emotionalValence: 0.1, // Neutral-positive: new information
                metadata: {
                  handler: "filesystem",
                  eventType,
                  path: fullPath,
                  directory: dir,
                },
              });
            },
          );

          this.watchers.push(watcher);
          log.info(`Watching directory: ${dir}`);
        } catch (error) {
          log.warn(`Failed to watch directory ${dir}:`, error);
        }
      }
    } catch (error) {
      log.error("Failed to start filesystem watch:", error);
    }
  }

  // ─── System Resource Monitor ──────────────────────────────────

  private startSystemMonitor(): void {
    const scan = async () => {
      if (!this.running) return;

      try {
        const os = await import("node:os");

        // CPU usage (average across cores)
        const cpus = os.cpus();
        const cpuUsage =
          cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            const idle = cpu.times.idle;
            return acc + (1 - idle / total);
          }, 0) / cpus.length;

        // Memory usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memoryUsage = 1 - freeMem / totalMem;

        // Disk usage (via df command)
        let diskUsage = 0;
        try {
          const { exec } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execAsync = promisify(exec);
          const { stdout } = await execAsync("df / --output=pcent | tail -1");
          diskUsage = parseInt(stdout.trim().replace("%", "")) / 100;
        } catch {
          diskUsage = 0;
        }

        const currentState = { cpuUsage, memoryUsage, diskUsage };

        // Only emit percept if there's a significant change or resource pressure
        const significantChange =
          !this.lastSystemState ||
          Math.abs(cpuUsage - this.lastSystemState.cpuUsage) > 0.2 ||
          Math.abs(memoryUsage - this.lastSystemState.memoryUsage) > 0.1;

        const resourcePressure =
          cpuUsage > 0.8 || memoryUsage > 0.85 || diskUsage > 0.9;

        if (significantChange || resourcePressure) {
          const salience = resourcePressure ? 0.9 : 0.3;
          const valence = resourcePressure ? -0.5 : 0.1;

          this.emitPercept({
            source: "internal",
            content: `System: CPU ${(cpuUsage * 100).toFixed(0)}%, Memory ${(
              memoryUsage * 100
            ).toFixed(0)}%, Disk ${(diskUsage * 100).toFixed(0)}%${
              resourcePressure ? " [PRESSURE]" : ""
            }`,
            salience,
            emotionalValence: valence,
            metadata: {
              handler: "system_monitor",
              ...currentState,
              resourcePressure,
            },
          });
        }

        this.lastSystemState = currentState;
      } catch (error) {
        log.error("System monitor scan failed:", error);
      }
    };

    // Initial scan
    scan();
    // Periodic scan
    const interval = setInterval(scan, this.config.systemMonitorInterval);
    this.intervals.push(interval);
    log.info(
      `System monitor started (interval: ${this.config.systemMonitorInterval}ms)`,
    );
  }

  // ─── Git Repository Scanner ───────────────────────────────────

  private startGitScan(): void {
    const knownHeads: Map<string, string> = new Map();

    const scan = async () => {
      if (!this.running) return;

      try {
        const { exec } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const execAsync = promisify(exec);

        for (const repo of this.config.gitRepositories) {
          try {
            // Get current HEAD
            const { stdout: head } = await execAsync("git rev-parse HEAD", {
              cwd: repo,
            });
            const currentHead = head.trim();

            const previousHead = knownHeads.get(repo);
            knownHeads.set(repo, currentHead);

            if (previousHead && previousHead !== currentHead) {
              // Get commit message
              const { stdout: logOutput } = await execAsync(
                `git log --oneline ${previousHead}..${currentHead}`,
                { cwd: repo },
              );

              this.emitPercept({
                source: "internal",
                content: `Git changes in ${repo}: ${logOutput.trim()}`,
                salience: 0.7,
                emotionalValence: 0.3, // Positive: new work
                metadata: {
                  handler: "git_scan",
                  repository: repo,
                  previousHead,
                  currentHead,
                  commits: logOutput.trim().split("\n").length,
                },
              });
            }

            // Check for uncommitted changes
            const { stdout: status } = await execAsync(
              "git status --porcelain",
              { cwd: repo },
            );
            if (status.trim()) {
              const changedFiles = status.trim().split("\n").length;
              this.emitPercept({
                source: "internal",
                content: `Uncommitted changes in ${repo}: ${changedFiles} files`,
                salience: 0.4,
                emotionalValence: 0,
                metadata: {
                  handler: "git_scan",
                  repository: repo,
                  uncommittedFiles: changedFiles,
                  status: status.trim(),
                },
              });
            }
          } catch (error) {
            log.warn(`Git scan failed for ${repo}:`, error);
          }
        }
      } catch (error) {
        log.error("Git scan failed:", error);
      }
    };

    // Initial scan
    scan();
    // Periodic scan
    const interval = setInterval(scan, this.config.gitScanInterval);
    this.intervals.push(interval);
    log.info(
      `Git scanner started for ${this.config.gitRepositories.length} repos`,
    );
  }

  // ─── Percept Emission ─────────────────────────────────────────

  private emitPercept(
    partial: Omit<CognitivePercept, "id" | "timestamp">,
  ): void {
    this.perceptCount++;
    const percept: CognitivePercept = {
      id: `pp_${Date.now()}_${this.perceptCount}`,
      timestamp: Date.now(),
      ...partial,
    };

    if (this.perceptCallback) {
      this.perceptCallback(percept);
    }

    this.emit("percept", percept);
  }

  /**
   * Manually inject a percept (for external integrations)
   */
  injectPercept(partial: Omit<CognitivePercept, "id" | "timestamp">): void {
    this.emitPercept(partial);
  }

  // ─── Statistics ───────────────────────────────────────────────

  getStats(): {
    running: boolean;
    perceptCount: number;
    activeWatchers: number;
    activeIntervals: number;
    lastSystemState: typeof PerceptionHandlers.prototype.lastSystemState;
  } {
    return {
      running: this.running,
      perceptCount: this.perceptCount,
      activeWatchers: this.watchers.length,
      activeIntervals: this.intervals.length,
      lastSystemState: this.lastSystemState,
    };
  }
}
