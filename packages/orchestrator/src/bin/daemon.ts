#!/usr/bin/env node
/**
 * Deep Tree Echo Orchestrator Daemon
 *
 * This is the main entry point for running the orchestrator as a standalone daemon.
 * It initializes all services and handles graceful shutdown.
 *
 * Usage:
 *   npx deep-tree-echo-daemon
 *   node dist/bin/daemon.js
 *
 * Environment variables:
 *   DEEP_TREE_ECHO_IPC_PATH - Unix socket path (default: /tmp/deep-tree-echo.sock)
 *   DEEP_TREE_ECHO_WEBHOOK_PORT - Webhook server port (default: 3000)
 *   DEEP_TREE_ECHO_ENABLE_DELTACHAT - Enable DeltaChat (default: true)
 *   DEEP_TREE_ECHO_ENABLE_DOVECOT - Enable Dovecot (default: true)
 *   DEEP_TREE_ECHO_ENABLE_DOVE9 - Enable Dove9 cognitive OS (default: true)
 *   DELTACHAT_RPC_SOCKET - DeltaChat RPC server socket path
 */

import { Orchestrator, OrchestratorConfig } from "../orchestrator.js";
import { getLogger } from "deep-tree-echo-core";

const log = getLogger("deep-tree-echo-orchestrator/daemon");

// Parse boolean environment variable
function envBool(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== "false" && value !== "0";
}

// Parse number environment variable
function envNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Build configuration from environment
function buildConfig(): Partial<OrchestratorConfig> {
  return {
    enableDeltaChat: envBool("DEEP_TREE_ECHO_ENABLE_DELTACHAT", true),
    enableDovecot: envBool("DEEP_TREE_ECHO_ENABLE_DOVECOT", true),
    enableIPC: envBool("DEEP_TREE_ECHO_ENABLE_IPC", true),
    enableScheduler: envBool("DEEP_TREE_ECHO_ENABLE_SCHEDULER", true),
    enableWebhooks: envBool("DEEP_TREE_ECHO_ENABLE_WEBHOOKS", true),
    enableDove9: envBool("DEEP_TREE_ECHO_ENABLE_DOVE9", true),
    processIncomingMessages: envBool("DEEP_TREE_ECHO_PROCESS_MESSAGES", true),
    defaultAccountId: process.env.DEEP_TREE_ECHO_DEFAULT_ACCOUNT
      ? parseInt(process.env.DEEP_TREE_ECHO_DEFAULT_ACCOUNT, 10)
      : undefined,
    deltachat: process.env.DELTACHAT_RPC_SOCKET
      ? { socketPath: process.env.DELTACHAT_RPC_SOCKET }
      : undefined,
    dove9: {
      enabled: envBool("DEEP_TREE_ECHO_ENABLE_DOVE9", true),
      enableTriadicLoop: envBool("DEEP_TREE_ECHO_ENABLE_TRIADIC", true),
    },
  };
}

// Main daemon class
class Daemon {
  private orchestrator: Orchestrator;
  private shutdownInProgress = false;

  constructor() {
    const config = buildConfig();
    this.orchestrator = new Orchestrator(config);
  }

  async start(): Promise<void> {
    log.info("=========================================");
    log.info("   Deep Tree Echo Orchestrator Daemon");
    log.info("=========================================");
    log.info("");
    log.info("Starting orchestrator...");

    // Setup signal handlers
    this.setupSignalHandlers();

    // Start the orchestrator
    await this.orchestrator.start();

    log.info("");
    log.info("Daemon running. Press Ctrl+C to stop.");
    log.info("");
    log.info("Services:");
    log.info(
      `  - IPC Server: ${
        this.orchestrator.isRunning() ? "Active" : "Inactive"
      }`,
    );
    log.info(
      `  - DeltaChat: ${
        this.orchestrator.getDeltaChatInterface()?.isConnected()
          ? "Connected"
          : "Waiting"
      }`,
    );
    log.info(
      `  - Dovecot: ${
        this.orchestrator.getDovecotInterface()?.isRunning()
          ? "Running"
          : "Inactive"
      }`,
    );
    log.info(
      `  - Dove9 Cognitive OS: ${
        this.orchestrator.getDove9Integration() ? "Active" : "Inactive"
      }`,
    );
    log.info("");
  }

  private setupSignalHandlers(): void {
    // Handle SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
      log.info("Received SIGINT signal");
      this.shutdown();
    });

    // Handle SIGTERM
    process.on("SIGTERM", () => {
      log.info("Received SIGTERM signal");
      this.shutdown();
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      log.error("Uncaught exception:", error);
      this.shutdown(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      log.error("Unhandled rejection at:", promise, "reason:", reason);
    });
  }

  private async shutdown(exitCode = 0): Promise<void> {
    if (this.shutdownInProgress) {
      log.warn("Shutdown already in progress...");
      return;
    }

    this.shutdownInProgress = true;
    log.info("Initiating graceful shutdown...");

    try {
      await this.orchestrator.stop();
      log.info("Shutdown complete");
      process.exit(exitCode);
    } catch (error) {
      log.error("Error during shutdown:", error);
      process.exit(1);
    }
  }
}

// Run the daemon
async function main(): Promise<void> {
  const daemon = new Daemon();

  try {
    await daemon.start();
  } catch (error) {
    log.error("Failed to start daemon:", error);
    process.exit(1);
  }
}

main();
