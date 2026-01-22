/**
 * @fileoverview AAR Persistence Layer
 *
 * Handles saving and loading AAR state to/from disk, enabling
 * continuity of character, narrative, and lore across sessions.
 */

import { EventEmitter } from "events";
import { getLogger } from "deep-tree-echo-core";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  AARState,
  AgentState,
  ArenaState,
  RelationState,
} from "./types.js";
import { AgentMembrane } from "./agent-membrane.js";
import { ArenaMembrane } from "./arena-membrane.js";
import { RelationInterface } from "./relation-interface.js";

const log = getLogger("deep-tree-echo-orchestrator/AARPersistence");

/**
 * Persistence configuration
 */
export interface AARPersistenceConfig {
  /** Base directory for storage */
  storagePath: string;
  /** Auto-save interval in milliseconds (0 = disabled) */
  autoSaveIntervalMs: number;
  /** Maximum backup files to keep */
  maxBackups: number;
  /** Compress saved state */
  compress: boolean;
  /** Enable verbose logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: AARPersistenceConfig = {
  storagePath: "./data/aar",
  autoSaveIntervalMs: 60000, // Save every minute
  maxBackups: 5,
  compress: false,
  verbose: false,
};

/**
 * File names for different state components
 */
const STATE_FILES = {
  agent: "agent-state.json",
  arena: "arena-state.json",
  relation: "relation-state.json",
  meta: "meta.json",
  backup: "backups",
};

/**
 * Metadata stored alongside state
 */
interface PersistenceMeta {
  version: string;
  lastSaved: number;
  cycle: number;
  instanceName: string;
  checksum?: string;
}

/**
 * Serialized state format
 */
interface SerializedAARState {
  agent: object;
  arena: object;
  relation: object;
  meta: PersistenceMeta;
}

/**
 * AAR Persistence Manager
 *
 * Handles durable storage of AAR state with backup rotation,
 * atomic writes, and optional compression.
 */
export class AARPersistence extends EventEmitter {
  private config: AARPersistenceConfig;
  private initialized: boolean = false;
  private autoSaveInterval?: NodeJS.Timeout;
  private lastSaveTime: number = 0;
  private saveInProgress: boolean = false;

  constructor(config: Partial<AARPersistenceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    log.info(`AAR Persistence initialized: ${this.config.storagePath}`);
  }

  /**
   * Initialize the persistence layer
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure storage directory exists
      await fs.mkdir(this.config.storagePath, { recursive: true });

      // Ensure backups directory exists
      const backupPath = path.join(this.config.storagePath, STATE_FILES.backup);
      await fs.mkdir(backupPath, { recursive: true });

      this.initialized = true;
      log.info("Persistence layer initialized");
    } catch (error) {
      log.error("Failed to initialize persistence:", error);
      throw error;
    }
  }

  /**
   * Start auto-save if configured
   */
  startAutoSave(
    getState: () => {
      agent: AgentMembrane;
      arena: ArenaMembrane;
      relation: RelationInterface;
      cycle: number;
      instanceName: string;
    },
  ): void {
    if (this.config.autoSaveIntervalMs <= 0) return;

    this.stopAutoSave();

    this.autoSaveInterval = setInterval(async () => {
      try {
        const state = getState();
        await this.save(
          state.agent,
          state.arena,
          state.relation,
          state.cycle,
          state.instanceName,
        );
      } catch (error) {
        log.error("Auto-save failed:", error);
      }
    }, this.config.autoSaveIntervalMs);

    log.info(
      `Auto-save started (interval: ${this.config.autoSaveIntervalMs}ms)`,
    );
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
      log.info("Auto-save stopped");
    }
  }

  /**
   * Save AAR state to disk
   */
  async save(
    agent: AgentMembrane,
    arena: ArenaMembrane,
    relation: RelationInterface,
    cycle: number,
    instanceName: string,
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.saveInProgress) {
      log.warn("Save already in progress, skipping");
      return;
    }

    this.saveInProgress = true;

    try {
      const startTime = Date.now();

      // Create backup of existing state
      await this.rotateBackups();

      // Serialize state
      const serializedState: SerializedAARState = {
        agent: agent.serialize(),
        arena: arena.serialize(),
        relation: relation.serialize(),
        meta: {
          version: "2.1.0",
          lastSaved: Date.now(),
          cycle,
          instanceName,
        },
      };

      // Write each component atomically
      await this.writeStateFile(STATE_FILES.agent, serializedState.agent);
      await this.writeStateFile(STATE_FILES.arena, serializedState.arena);
      await this.writeStateFile(STATE_FILES.relation, serializedState.relation);
      await this.writeStateFile(STATE_FILES.meta, serializedState.meta);

      this.lastSaveTime = Date.now();
      const duration = this.lastSaveTime - startTime;

      if (this.config.verbose) {
        log.debug(`State saved in ${duration}ms (cycle ${cycle})`);
      }

      this.emit("saved", { cycle, duration });
    } catch (error) {
      log.error("Failed to save state:", error);
      this.emit("save-error", error);
      throw error;
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Load AAR state from disk
   */
  async load(): Promise<{
    agent: AgentMembrane;
    arena: ArenaMembrane;
    relation: RelationInterface;
    meta: PersistenceMeta;
  } | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Check if state files exist
      const metaPath = path.join(this.config.storagePath, STATE_FILES.meta);
      try {
        await fs.access(metaPath);
      } catch {
        log.info("No saved state found, starting fresh");
        return null;
      }

      // Load each component
      const agentData = await this.readStateFile(STATE_FILES.agent);
      const arenaData = await this.readStateFile(STATE_FILES.arena);
      const relationData = await this.readStateFile(STATE_FILES.relation);
      const meta = (await this.readStateFile(
        STATE_FILES.meta,
      )) as PersistenceMeta;

      // Deserialize
      const agent = AgentMembrane.deserialize(agentData);
      const arena = ArenaMembrane.deserialize(arenaData);
      const relation = RelationInterface.deserialize(relationData);

      log.info(
        `State loaded (cycle ${meta.cycle}, saved ${new Date(
          meta.lastSaved,
        ).toISOString()})`,
      );

      this.emit("loaded", { meta });

      return { agent, arena, relation, meta };
    } catch (error) {
      log.error("Failed to load state:", error);
      this.emit("load-error", error);

      // Try to recover from backup
      return this.loadFromBackup();
    }
  }

  /**
   * Attempt to load from most recent backup
   */
  private async loadFromBackup(): Promise<{
    agent: AgentMembrane;
    arena: ArenaMembrane;
    relation: RelationInterface;
    meta: PersistenceMeta;
  } | null> {
    try {
      const backupPath = path.join(this.config.storagePath, STATE_FILES.backup);
      const backups = await fs.readdir(backupPath);

      // Sort by timestamp (newest first)
      const sortedBackups = backups
        .filter((b) => b.endsWith(".json"))
        .sort((a, b) => {
          const tsA = parseInt(a.split("-")[1] || "0");
          const tsB = parseInt(b.split("-")[1] || "0");
          return tsB - tsA;
        });

      if (sortedBackups.length === 0) {
        log.warn("No backups available");
        return null;
      }

      // Try each backup until one works
      for (const backup of sortedBackups) {
        try {
          const backupFilePath = path.join(backupPath, backup);
          const data = await fs.readFile(backupFilePath, "utf-8");
          const state = JSON.parse(data) as SerializedAARState;

          const agent = AgentMembrane.deserialize(state.agent);
          const arena = ArenaMembrane.deserialize(state.arena);
          const relation = RelationInterface.deserialize(state.relation);

          log.info(`Recovered from backup: ${backup}`);
          this.emit("recovered", { backup });

          return { agent, arena, relation, meta: state.meta };
        } catch (_error) {
          log.warn(`Backup ${backup} corrupted, trying next`);
        }
      }

      log.error("All backups corrupted");
      return null;
    } catch (error) {
      log.error("Failed to load from backup:", error);
      return null;
    }
  }

  /**
   * Write a state file atomically
   */
  private async writeStateFile(filename: string, data: object): Promise<void> {
    const filePath = path.join(this.config.storagePath, filename);
    const tempPath = `${filePath}.tmp`;

    // Write to temp file first
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, content, "utf-8");

    // Atomic rename
    await fs.rename(tempPath, filePath);
  }

  /**
   * Read a state file
   */
  private async readStateFile(filename: string): Promise<any> {
    const filePath = path.join(this.config.storagePath, filename);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  }

  /**
   * Rotate backups, keeping only maxBackups most recent
   */
  private async rotateBackups(): Promise<void> {
    try {
      const backupPath = path.join(this.config.storagePath, STATE_FILES.backup);

      // Create a combined backup of current state
      const metaPath = path.join(this.config.storagePath, STATE_FILES.meta);
      try {
        await fs.access(metaPath);
      } catch {
        // No existing state to backup
        return;
      }

      // Read current state
      const agent = await this.readStateFile(STATE_FILES.agent);
      const arena = await this.readStateFile(STATE_FILES.arena);
      const relation = await this.readStateFile(STATE_FILES.relation);
      const meta = await this.readStateFile(STATE_FILES.meta);

      // Create backup
      const backupName = `backup-${Date.now()}.json`;
      const backupFilePath = path.join(backupPath, backupName);
      await fs.writeFile(
        backupFilePath,
        JSON.stringify(
          {
            agent,
            arena,
            relation,
            meta,
          },
          null,
          2,
        ),
        "utf-8",
      );

      // Remove old backups
      const backups = await fs.readdir(backupPath);
      const sortedBackups = backups
        .filter((b) => b.endsWith(".json"))
        .sort((a, b) => {
          const tsA = parseInt(a.split("-")[1] || "0");
          const tsB = parseInt(b.split("-")[1] || "0");
          return tsB - tsA;
        });

      // Remove excess backups
      for (let i = this.config.maxBackups; i < sortedBackups.length; i++) {
        const oldBackup = path.join(backupPath, sortedBackups[i]);
        await fs.unlink(oldBackup);
        if (this.config.verbose) {
          log.debug(`Removed old backup: ${sortedBackups[i]}`);
        }
      }
    } catch (error) {
      log.warn("Failed to rotate backups:", error);
    }
  }

  /**
   * Export state to a file
   */
  async exportState(
    agent: AgentMembrane,
    arena: ArenaMembrane,
    relation: RelationInterface,
    cycle: number,
    instanceName: string,
    exportPath: string,
  ): Promise<void> {
    const state: SerializedAARState = {
      agent: agent.serialize(),
      arena: arena.serialize(),
      relation: relation.serialize(),
      meta: {
        version: "2.1.0",
        lastSaved: Date.now(),
        cycle,
        instanceName,
      },
    };

    await fs.writeFile(exportPath, JSON.stringify(state, null, 2), "utf-8");
    log.info(`State exported to ${exportPath}`);
  }

  /**
   * Import state from a file
   */
  async importState(importPath: string): Promise<{
    agent: AgentMembrane;
    arena: ArenaMembrane;
    relation: RelationInterface;
    meta: PersistenceMeta;
  }> {
    const content = await fs.readFile(importPath, "utf-8");
    const state = JSON.parse(content) as SerializedAARState;

    const agent = AgentMembrane.deserialize(state.agent);
    const arena = ArenaMembrane.deserialize(state.arena);
    const relation = RelationInterface.deserialize(state.relation);

    log.info(`State imported from ${importPath}`);

    return { agent, arena, relation, meta: state.meta };
  }

  /**
   * Get persistence statistics
   */
  getStats(): {
    initialized: boolean;
    lastSaveTime: number;
    storagePath: string;
    autoSaveEnabled: boolean;
  } {
    return {
      initialized: this.initialized,
      lastSaveTime: this.lastSaveTime,
      storagePath: this.config.storagePath,
      autoSaveEnabled: !!this.autoSaveInterval,
    };
  }

  /**
   * Clear all saved state
   */
  async clear(): Promise<void> {
    try {
      await fs.rm(this.config.storagePath, { recursive: true, force: true });
      await this.initialize();
      log.info("Persistence cleared");
      this.emit("cleared");
    } catch (error) {
      log.error("Failed to clear persistence:", error);
      throw error;
    }
  }
}

/**
 * Create a configured persistence manager
 */
export function createAARPersistence(
  config?: Partial<AARPersistenceConfig>,
): AARPersistence {
  return new AARPersistence(config);
}
