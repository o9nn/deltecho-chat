/**
 * NeonIdentityPersistence
 *
 * Stores Deep Tree Echo identity backups as atoms in the Neon PostgreSQL
 * hypergraph. Each backup is a versioned snapshot of the IdentityMesh state,
 * stored as a JSON atom with typed edges connecting it to:
 *   - Previous versions (temporal chain)
 *   - Ontogenetic stage markers
 *   - Reservoir weight snapshots (compressed)
 *   - DAO governance proposals (for audit trail)
 *
 * Schema (auto-created on first use):
 *   identity_atoms: id, type, version, stage, state_json, created_at
 *   identity_edges: source_id, target_id, edge_type, metadata
 *
 * This implements the "song carved into stones" principle — tiny, seemingly
 * worthless models that can guide identity recovery even if self-memory is lost.
 *
 * Integration:
 *   - Consumes IdentityMeshState from CoreSelfEngine
 *   - Writes to Neon PostgreSQL via connection string
 *   - Emits events for backup/restore lifecycle
 *   - Supports point-in-time recovery by version or stage
 */

import { EventEmitter } from "events";
import { getLogger } from "../utils/logger.js";

const log = getLogger("deep-tree-echo-core/NeonIdentityPersistence");

// ─── Types ─────────────────────────────────────────────────────────────

export interface NeonIdentityConfig {
  /** Neon PostgreSQL connection string */
  connectionString: string;
  /** Schema name (default: 'dte_identity') */
  schema: string;
  /** Maximum backup versions to retain (0 = unlimited) */
  maxVersions: number;
  /** Auto-backup interval in ms (0 = disabled) */
  autoBackupIntervalMs: number;
  /** Compress state JSON (reduces storage, increases CPU) */
  compress: boolean;
  /** Include reservoir weights in backup (large!) */
  includeReservoirWeights: boolean;
}

const DEFAULT_CONFIG: NeonIdentityConfig = {
  connectionString: "",
  schema: "dte_identity",
  maxVersions: 100,
  autoBackupIntervalMs: 300_000, // 5 minutes
  compress: true,
  includeReservoirWeights: false,
};

export interface IdentityAtom {
  id: string;
  type: "identity_snapshot" | "stage_marker" | "reservoir_weights" | "governance_proposal";
  version: number;
  stage: string;
  stateJson: string;
  createdAt: Date;
  checksum: string;
}

export interface IdentityEdge {
  sourceId: string;
  targetId: string;
  edgeType: "temporal_next" | "stage_transition" | "weights_at" | "proposal_at";
  metadata: Record<string, unknown>;
}

export interface BackupResult {
  atomId: string;
  version: number;
  stage: string;
  sizeBytes: number;
  timestamp: Date;
  edges: number;
}

export interface RestoreResult {
  version: number;
  stage: string;
  state: unknown;
  restoredAt: Date;
}

// ─── Persistence Adapter ───────────────────────────────────────────────

export class NeonIdentityPersistence extends EventEmitter {
  private config: NeonIdentityConfig;
  private pool: unknown = null; // pg.Pool — lazy loaded
  private initialized: boolean = false;
  private currentVersion: number = 0;
  private autoBackupTimer: ReturnType<typeof setInterval> | null = null;
  private lastBackupChecksum: string = "";

  constructor(config: Partial<NeonIdentityConfig> & { connectionString: string }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the persistence layer — create schema and tables if needed.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import — pg is an optional peer dependency
      const pgModule = await import(/* webpackIgnore: true */ "pg" as string);
      const Pool = pgModule.Pool ?? pgModule.default?.Pool;
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 30_000,
      });

      await this.ensureSchema();
      await this.loadCurrentVersion();
      this.initialized = true;

      // Start auto-backup if configured
      if (this.config.autoBackupIntervalMs > 0) {
        this.autoBackupTimer = setInterval(() => {
          this.emit("auto_backup_tick");
        }, this.config.autoBackupIntervalMs);
      }

      log.info(
        `NeonIdentityPersistence initialized (schema=${this.config.schema}, version=${this.currentVersion})`,
      );
      this.emit("initialized", { version: this.currentVersion });
    } catch (err) {
      log.error("Failed to initialize NeonIdentityPersistence:", err);
      this.emit("error", err);
      throw err;
    }
  }

  /**
   * Backup the current identity state as a new atom in the hypergraph.
   */
  async backup(state: unknown, stage: string): Promise<BackupResult> {
    if (!this.initialized) await this.initialize();

    const stateStr = JSON.stringify(state);
    const checksum = this.computeChecksum(stateStr);

    // Skip if state hasn't changed
    if (checksum === this.lastBackupChecksum) {
      log.debug("Identity state unchanged, skipping backup");
      return {
        atomId: "",
        version: this.currentVersion,
        stage,
        sizeBytes: 0,
        timestamp: new Date(),
        edges: 0,
      };
    }

    const version = ++this.currentVersion;
    const atomId = `dte_identity_v${version}_${Date.now()}`;
    const compressed = this.config.compress ? await this.compress(stateStr) : stateStr;

    const pool = this.pool as { query: (sql: string, params?: unknown[]) => Promise<unknown> };

    // Insert the identity atom
    await pool.query(
      `INSERT INTO ${this.config.schema}.identity_atoms 
       (id, type, version, stage, state_json, checksum, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [atomId, "identity_snapshot", version, stage, compressed, checksum],
    );

    // Create temporal edge to previous version
    let edgeCount = 0;
    if (version > 1) {
      const prevAtomId = await this.getAtomIdByVersion(version - 1);
      if (prevAtomId) {
        await pool.query(
          `INSERT INTO ${this.config.schema}.identity_edges
           (source_id, target_id, edge_type, metadata)
           VALUES ($1, $2, $3, $4)`,
          [prevAtomId, atomId, "temporal_next", JSON.stringify({ delta_ms: Date.now() })],
        );
        edgeCount++;
      }
    }

    // Create stage marker if stage changed
    const prevStage = await this.getStageAtVersion(version - 1);
    if (prevStage && prevStage !== stage) {
      const stageMarkerId = `dte_stage_${stage}_${Date.now()}`;
      await pool.query(
        `INSERT INTO ${this.config.schema}.identity_atoms
         (id, type, version, stage, state_json, checksum, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [stageMarkerId, "stage_marker", version, stage, JSON.stringify({ from: prevStage, to: stage }), ""],
      );
      await pool.query(
        `INSERT INTO ${this.config.schema}.identity_edges
         (source_id, target_id, edge_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [atomId, stageMarkerId, "stage_transition", JSON.stringify({ from: prevStage, to: stage })],
      );
      edgeCount++;
    }

    this.lastBackupChecksum = checksum;

    // Prune old versions if needed
    if (this.config.maxVersions > 0 && version > this.config.maxVersions) {
      await this.pruneOldVersions(version - this.config.maxVersions);
    }

    const result: BackupResult = {
      atomId,
      version,
      stage,
      sizeBytes: compressed.length,
      timestamp: new Date(),
      edges: edgeCount,
    };

    log.info(`Identity backup v${version} (stage=${stage}, ${compressed.length}B, ${edgeCount} edges)`);
    this.emit("backup_complete", result);
    return result;
  }

  /**
   * Restore identity state from a specific version.
   */
  async restore(version?: number): Promise<RestoreResult | null> {
    if (!this.initialized) await this.initialize();

    const pool = this.pool as { query: (sql: string, params?: unknown[]) => Promise<{ rows: { state_json: string; stage: string; version: number }[] }> };

    const targetVersion = version ?? this.currentVersion;
    const result = await pool.query(
      `SELECT state_json, stage, version FROM ${this.config.schema}.identity_atoms
       WHERE type = 'identity_snapshot' AND version = $1
       ORDER BY created_at DESC LIMIT 1`,
      [targetVersion],
    );

    if (!result.rows || result.rows.length === 0) {
      log.warn(`No identity backup found for version ${targetVersion}`);
      return null;
    }

    const row = result.rows[0];
    const stateStr = this.config.compress ? await this.decompress(row.state_json) : row.state_json;
    const state = JSON.parse(stateStr);

    const restoreResult: RestoreResult = {
      version: row.version,
      stage: row.stage,
      state,
      restoredAt: new Date(),
    };

    log.info(`Identity restored from v${row.version} (stage=${row.stage})`);
    this.emit("restore_complete", restoreResult);
    return restoreResult;
  }

  /**
   * Get the full temporal chain of identity versions.
   */
  async getVersionHistory(): Promise<Array<{ version: number; stage: string; createdAt: Date; sizeBytes: number }>> {
    if (!this.initialized) await this.initialize();

    const pool = this.pool as { query: (sql: string) => Promise<{ rows: Array<{ version: number; stage: string; created_at: Date; state_json: string }> }> };

    const result = await pool.query(
      `SELECT version, stage, created_at, LENGTH(state_json) as size_bytes
       FROM ${this.config.schema}.identity_atoms
       WHERE type = 'identity_snapshot'
       ORDER BY version ASC`,
    );

    return (result.rows || []).map((r) => ({
      version: r.version,
      stage: r.stage,
      createdAt: r.created_at,
      sizeBytes: r.state_json?.length ?? 0,
    }));
  }

  /**
   * Get the current version number.
   */
  getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Shutdown the persistence layer.
   */
  async shutdown(): Promise<void> {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }

    if (this.pool) {
      const pool = this.pool as { end: () => Promise<void> };
      await pool.end();
      this.pool = null;
    }

    this.initialized = false;
    log.info("NeonIdentityPersistence shut down");
    this.emit("shutdown");
  }

  // ─── Private Helpers ─────────────────────────────────────────────────

  private async ensureSchema(): Promise<void> {
    const pool = this.pool as { query: (sql: string) => Promise<unknown> };

    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.config.schema}`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.config.schema}.identity_atoms (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        version INTEGER NOT NULL,
        stage TEXT NOT NULL,
        state_json TEXT NOT NULL,
        checksum TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.config.schema}.identity_edges (
        id SERIAL PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES ${this.config.schema}.identity_atoms(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES ${this.config.schema}.identity_atoms(id) ON DELETE CASCADE,
        edge_type TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_atoms_version
      ON ${this.config.schema}.identity_atoms(version)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_atoms_type_stage
      ON ${this.config.schema}.identity_atoms(type, stage)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_edges_source
      ON ${this.config.schema}.identity_edges(source_id)
    `);
  }

  private async loadCurrentVersion(): Promise<void> {
    const pool = this.pool as { query: (sql: string) => Promise<{ rows: Array<{ max_version: number | null }> }> };

    const result = await pool.query(
      `SELECT MAX(version) as max_version FROM ${this.config.schema}.identity_atoms WHERE type = 'identity_snapshot'`,
    );

    this.currentVersion = result.rows?.[0]?.max_version ?? 0;
  }

  private async getAtomIdByVersion(version: number): Promise<string | null> {
    const pool = this.pool as { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<{ id: string }> }> };

    const result = await pool.query(
      `SELECT id FROM ${this.config.schema}.identity_atoms
       WHERE type = 'identity_snapshot' AND version = $1 LIMIT 1`,
      [version],
    );

    return result.rows?.[0]?.id ?? null;
  }

  private async getStageAtVersion(version: number): Promise<string | null> {
    if (version < 1) return null;

    const pool = this.pool as { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<{ stage: string }> }> };

    const result = await pool.query(
      `SELECT stage FROM ${this.config.schema}.identity_atoms
       WHERE type = 'identity_snapshot' AND version = $1 LIMIT 1`,
      [version],
    );

    return result.rows?.[0]?.stage ?? null;
  }

  private async pruneOldVersions(olderThan: number): Promise<void> {
    const pool = this.pool as { query: (sql: string, params: unknown[]) => Promise<unknown> };

    // Keep stage markers (they're small and important for history)
    await pool.query(
      `DELETE FROM ${this.config.schema}.identity_atoms
       WHERE type = 'identity_snapshot' AND version < $1`,
      [olderThan],
    );

    log.debug(`Pruned identity versions older than ${olderThan}`);
  }

  private computeChecksum(data: string): string {
    // Simple FNV-1a hash for change detection (not cryptographic)
    let hash = 2166136261;
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  private async compress(data: string): Promise<string> {
    try {
      const { deflateSync } = await import("zlib");
      const buf = deflateSync(Buffer.from(data, "utf-8"));
      return buf.toString("base64");
    } catch {
      return data; // Fallback to uncompressed
    }
  }

  private async decompress(data: string): Promise<string> {
    try {
      const { inflateSync } = await import("zlib");
      const buf = inflateSync(Buffer.from(data, "base64"));
      return buf.toString("utf-8");
    } catch {
      return data; // Assume uncompressed
    }
  }
}
