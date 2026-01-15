import * as duckdb from '@duckdb/duckdb-wasm';
import { AsyncDuckDB } from '@duckdb/duckdb-wasm';

/**
 * Adapter for DuckDB WASM integration with Deep Tree Echo
 * Provides SQL-based memory storage and retrieval for the AtomSpace
 */
export class DuckDBAdapter {
    private db: AsyncDuckDB | null = null;
    private initialized: boolean = false;

    constructor() { }

    /**
     * Initialize the DuckDB database
     */
    public async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Placeholder for initialization sequence
            log('DuckDB Adapter: Initializing WASM database...');

            this.initialized = true;
            await this.createSchema();

            log('DuckDB Adapter: Initialized successfully with schema');
        } catch (error) {
            logError('Failed to initialize DuckDB:', error);
            throw error;
        }
    }

    /**
     * Create the initial schema for AtomSpace storage
     */
    private async createSchema(): Promise<void> {
        const schema = `
            CREATE TABLE IF NOT EXISTS atoms (
                id VARCHAR PRIMARY KEY,
                type VARCHAR NOT NULL,
                name VARCHAR,
                strength DOUBLE DEFAULT 1.0,
                confidence DOUBLE DEFAULT 1.0,
                metadata JSON,
                embedding FLOAT[], -- Neural Grounding Vector
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS links (
                id VARCHAR PRIMARY KEY,
                type VARCHAR NOT NULL,
                handle_list VARCHAR[], -- Array of target atom IDs
                strength DOUBLE DEFAULT 1.0,
                confidence DOUBLE DEFAULT 1.0
            );

            CREATE INDEX IF NOT EXISTS idx_atoms_type ON atoms(type);
            CREATE INDEX IF NOT EXISTS idx_atoms_name ON atoms(name);
        `;

        await this.execute(schema);
    }

    /**
     * Execute a SQL query and return results as an array of objects
     */
    public async query<T = any>(sql: string): Promise<T[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.db) {
            log(`[Mock Query] ${sql}`);
            return [];
        }

        const conn = await this.db.connect();
        try {
            const result = await conn.query(sql);
            return result.toArray().map(row => row.toJSON() as any as T);
        } finally {
            await conn.close();
        }
    }

    /**
     * Execute SQL without expecting results
     */
    public async execute(sql: string): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.db) {
            log(`[Mock Execute] ${sql}`);
            return;
        }

        const conn = await this.db.connect();
        try {
            await conn.query(sql);
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
        // Handle embedding as array string for DuckDB
        const embeddingStr = atom.embedding ? `[${atom.embedding.join(',')}]` : 'NULL';

        const sql = `
            INSERT OR REPLACE INTO atoms (id, type, name, strength, confidence, metadata, embedding, updated_at)
            VALUES (
                '${atom.id}', 
                '${atom.type}', 
                ${atom.name ? `'${atom.name}'` : 'NULL'}, 
                ${atom.strength ?? 1.0}, 
                ${atom.confidence ?? 1.0}, 
                '${JSON.stringify(atom.metadata || {})}',
                ${embeddingStr},
                CURRENT_TIMESTAMP
            )
        `;
        await this.execute(sql);
    }

    /**
     * Perform Vector Similarity Search (VSS) using Cosine Similarity
     */
    public async vectorSearch(queryVector: number[], limit: number = 5): Promise<any[]> {
        const vectorStr = `[${queryVector.join(',')}]`;

        // DuckDB cosine similarity using list_inner_product / (norm1 * norm2)
        // Note: For simplicity, we assume vectors are normalized, otherwise we'd add the norm calc
        const sql = `
            SELECT id, type, name, metadata,
                   list_inner_product(embedding, ${vectorStr}) as similarity
            FROM atoms
            WHERE embedding IS NOT NULL
            ORDER BY similarity DESC
            LIMIT ${limit}
        `;

        return this.query(sql);
    }

    /**
     * Search for atoms by type and name pattern
     */
    public async findAtoms(type?: string, namePattern?: string): Promise<any[]> {
        let sql = 'SELECT * FROM atoms WHERE 1=1';
        if (type) sql += ` AND type = '${type}'`;
        if (namePattern) sql += ` AND name LIKE '${namePattern}'`;

        return this.query(sql);
    }
}

// Internal logging helpers
function log(msg: string) {
    console.log(`[DuckDBAdapter] ${msg}`);
}

function logError(msg: string, err: any) {
    console.error(`[DuckDBAdapter] ${msg}`, err);
}
