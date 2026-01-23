import * as duckdb from "@duckdb/duckdb-wasm";
import { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import { drizzle } from "drizzle-orm/pg-proxy";
import { PgDatabase } from "drizzle-orm/pg-core";
import { atoms } from "./schema";
import { eq, like, and } from "drizzle-orm";

/**
 * Adapter for DuckDB WASM integration with Deep Tree Echo
 * Provides SQL-based memory storage and retrieval for the AtomSpace
 */
export class DuckDBAdapter {
  private db: AsyncDuckDB | null = null;
  private drizzleDb: PgDatabase<any> | null = null;
  private initialized: boolean = false;

  constructor() {}

  /**
   * Initialize the DuckDB database
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      log("DuckDB Adapter: Initializing WASM database...");

      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

      // specific bundle selection or auto
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      // In Node.js environment, we might need to handle Worker instantiation differently
      // but for now assuming standard Web Worker API is available or polyfilled
      // Check if Worker is available, if not, we can't fully run WASM in this env
      if (typeof Worker === "undefined") {
        log(
          "Web Worker API not available. Skipping DuckDB WASM init (mock mode).",
        );
        return;
      }

      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger();

      this.db = new AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      // Initialize Drizzle with PG Proxy to bridge to DuckDB WASM
      this.drizzleDb = drizzle(async (sql, params, _method) => {
        try {
          const rows = await this.query(sql, params);
          return { rows };
        } catch (e) {
          logError("Drizzle Query execution failed", e);
          return { rows: [] };
        }
      });

      this.initialized = true;

      await this.createSchema();

      // Load persisted data if available
      await this.loadFromPersistence();

      log("DuckDB Adapter: Initialized successfully with schema");
    } catch (error) {
      logError("Failed to initialize DuckDB:", error);
    }
  }

  /**
     * Create the initial schema for AtomSpace storage
...
        // Browser environment (OPFS)
        else if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
            try {
                const root = await navigator.storage.getDirectory();
                const fileHandle = await root.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                // Cast to any to avoid SharedArrayBuffer vs ArrayBuffer type issues with OPFS types
                await writable.write(buffer as any);
                await writable.close();
            } catch (e) {
                logError('OPFS save failed', e);
            }
        }
    }
     */
  private async createSchema(): Promise<void> {
    if (!this.db) return;

    const connection = await this.db.connect();
    try {
      // Manually creating tables since we don't have migration tool setup
      // This matches the schema.ts definitions
      await connection.query(`
                CREATE TABLE IF NOT EXISTS atoms (
                    id VARCHAR PRIMARY KEY,
                    type VARCHAR NOT NULL,
                    name VARCHAR,
                    strength DOUBLE DEFAULT 1.0,
                    confidence DOUBLE DEFAULT 1.0,
                    metadata JSON,
                    embedding VARCHAR, -- Storing as text for Drizzle compat
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS links (
                    id VARCHAR PRIMARY KEY,
                    type VARCHAR NOT NULL,
                    handle_list VARCHAR, -- Storing as text (JSON array)
                    strength DOUBLE DEFAULT 1.0,
                    confidence DOUBLE DEFAULT 1.0
                );
            `);
    } finally {
      await connection.close();
    }
  }

  /**
   * Execute a SQL query and return results as an array of objects
   */
  public async query<T = any>(
    sqlQuery: string,
    params: any[] = [],
  ): Promise<T[]> {
    if (!this.initialized) await this.initialize();
    if (!this.db) return [];

    const conn = await this.db.connect();
    try {
      if (params && params.length > 0) {
        const stmt = await conn.prepare(sqlQuery);
        try {
          // DuckDB WASM prepare/query expects params
          const result = await stmt.query(...params);
          return result.toArray().map((row) => row.toJSON() as any as T);
        } finally {
          await stmt.close();
        }
      } else {
        const result = await conn.query(sqlQuery);
        return result.toArray().map((row) => row.toJSON() as any as T);
      }
    } finally {
      await conn.close();
    }
  }

  /**
   * Execute SQL without expecting results
   */
  public async execute(sqlQuery: string, params: any[] = []): Promise<void> {
    if (!this.initialized) await this.initialize();
    if (!this.db) return;

    const conn = await this.db.connect();
    try {
      if (params && params.length > 0) {
        const stmt = await conn.prepare(sqlQuery);
        try {
          await stmt.query(...params);
        } finally {
          await stmt.close();
        }
      } else {
        await conn.query(sqlQuery);
      }
    } finally {
      await conn.close();
    }
  }

  /**
   * Store an atom in the database
   */
  public async storeAtom(atom: {
    id: string;
    type: string;
    name?: string;
    strength?: number;
    confidence?: number;
    metadata?: any;
    embedding?: number[];
  }): Promise<void> {
    if (!this.initialized) await this.initialize();
    if (!this.drizzleDb) return;

    const embeddingStr = atom.embedding ? JSON.stringify(atom.embedding) : null;
    const metadataVal = atom.metadata ? atom.metadata : {}; // Drizzle handles object to JSON

    await this.drizzleDb
      .insert(atoms)
      .values({
        id: atom.id,
        type: atom.type,
        name: atom.name,
        strength: atom.strength,
        confidence: atom.confidence,
        metadata: metadataVal,
        embedding: embeddingStr,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: atoms.id,
        set: {
          strength: atom.strength,
          confidence: atom.confidence,
          metadata: metadataVal,
          embedding: embeddingStr,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Perform Vector Similarity Search (VSS) using Cosine Similarity
   */
  public async vectorSearch(
    queryVector: number[],
    limit: number = 5,
  ): Promise<any[]> {
    if (!this.initialized) await this.initialize();
    if (!this.db) return [];

    const vectorStr = `[${queryVector.join(",")}]`;

    try {
      // Using raw SQL directly via adapter query
      // Using list_cosine_similarity or list_inner_product depending on DuckDB version
      // Assuming list_cosine_similarity is available in recent WASM builds
      const query = `
                SELECT id, type, name, metadata,
                       list_cosine_similarity(CAST(embedding AS FLOAT[]), CAST('${vectorStr}' AS FLOAT[])) as similarity
                FROM atoms
                WHERE embedding IS NOT NULL
                ORDER BY similarity DESC
                LIMIT ${limit}
            `;
      return await this.query(query);
    } catch (e) {
      logError("Vector search failed (extensions missing?):", e);
      return [];
    }
  }

  /**
   * Search for atoms by type and name pattern
   */
  public async findAtoms(type?: string, namePattern?: string): Promise<any[]> {
    if (!this.initialized) await this.initialize();
    if (!this.drizzleDb) return [];

    const conditions = [];
    if (type) conditions.push(eq(atoms.type, type));
    if (namePattern) conditions.push(like(atoms.name, namePattern));

    if (conditions.length === 0) {
      return await this.drizzleDb.select().from(atoms);
    }

    return await this.drizzleDb
      .select()
      .from(atoms)
      .where(and(...conditions));
  }

  /**
   * Persist database to local storage (Browser: OPFS, Node: FS)
   * Strategy: Export tables to Parquet in virtual FS, then copy to host storage.
   */
  public async flush(): Promise<void> {
    if (!this.initialized || !this.db) return;
    log("Flushing Memory DB to persistence...");

    try {
      // 1. Export memory tables to Parquet in DuckDB Virtual FS
      await this.execute(`COPY atoms TO 'atoms.parquet' (FORMAT PARQUET)`);
      await this.execute(`COPY links TO 'links.parquet' (FORMAT PARQUET)`);

      // 2. Read parquet buffers from DuckDB Virtual FS
      const atomBuffer = await this.db.copyFileToBuffer("atoms.parquet");
      const linkBuffer = await this.db.copyFileToBuffer("links.parquet");

      // 3. Save to Host Storage
      await this.saveToHostStorage("atoms.parquet", atomBuffer);
      await this.saveToHostStorage("links.parquet", linkBuffer);

      log("Flushed successfully.");
    } catch (e) {
      logError("Flush failed:", e);
    }
  }

  /**
   * Load data from persistence into memory
   */
  private async loadFromPersistence(): Promise<void> {
    if (!this.db) return;
    try {
      // 1. Try to read from Host Storage
      const atomBuffer = await this.loadFromHostStorage("atoms.parquet");
      const linkBuffer = await this.loadFromHostStorage("links.parquet");

      if (atomBuffer) {
        await this.db.registerFileBuffer("atoms.parquet", atomBuffer);
        // Load into table
        await this.execute(
          `INSERT INTO atoms SELECT * FROM read_parquet('atoms.parquet')`,
        );
        log("Loaded atoms from persistence.");
      }

      if (linkBuffer) {
        await this.db.registerFileBuffer("links.parquet", linkBuffer);
        await this.execute(
          `INSERT INTO links SELECT * FROM read_parquet('links.parquet')`,
        );
        log("Loaded links from persistence.");
      }
    } catch (_e) {
      // If file doesn't exist or schema mismatch, just log - start fresh is fine
      log("No valid persistence found or load failed, starting fresh.");
    }
  }

  /**
   * Save buffer to Host Storage (Node FS or Browser OPFS)
   */
  private async saveToHostStorage(
    filename: string,
    buffer: Uint8Array,
  ): Promise<void> {
    // Node.js environment
    if (
      typeof process !== "undefined" &&
      process.versions &&
      process.versions.node
    ) {
      try {
        // Dynamic import to avoid webpack polyfill errors in browser build
        // const fs = await import('node:fs/promises');
        // const path = await import('node:path');
        // Use naive dynamic import or assume global 'require' if available via bundler config
        // For safety in typical mixed repos, we might check if 'fs' module is available
        // Here we simply assume a standard pattern for our ecosystem

        // Using global require if available (Electron/Node)
        if (typeof require !== "undefined") {
          const fs = require("fs");
          const path = require("path");
          const dataDir = path.join(process.cwd(), "data", "memory");
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          fs.writeFileSync(path.join(dataDir, filename), buffer);
        }
      } catch (e) {
        logError("Node FS save failed", e);
      }
    }
    // Browser environment (OPFS)
    else if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      navigator.storage.getDirectory
    ) {
      try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(buffer as any);
        await writable.close();
      } catch (e) {
        logError("OPFS save failed", e);
      }
    }
  }

  /**
   * Load buffer from Host Storage
   */
  private async loadFromHostStorage(
    filename: string,
  ): Promise<Uint8Array | null> {
    // Node.js
    if (
      typeof process !== "undefined" &&
      process.versions &&
      process.versions.node
    ) {
      if (typeof require !== "undefined") {
        try {
          const fs = require("fs");
          const path = require("path");
          const filePath = path.join(process.cwd(), "data", "memory", filename);
          if (fs.existsSync(filePath)) {
            return new Uint8Array(fs.readFileSync(filePath));
          }
        } catch (_e) {
          return null;
        }
      }
    }
    // Browser OPFS
    else if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      navigator.storage.getDirectory
    ) {
      try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(filename); // Errors if not found
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (_e) {
        return null;
      }
    }
    return null;
  }
}

// Internal logging helpers
function log(msg: string) {
  console.log(`[DuckDBAdapter] ${msg}`);
}

function logError(msg: string, err: any) {
  console.error(`[DuckDBAdapter] ${msg}`, err);
}
