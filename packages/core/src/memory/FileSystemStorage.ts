/**
 * FileSystemStorage - Persistent MemoryStorage backed by the filesystem
 *
 * Provides durable key-value storage for DTE cognitive state.
 * Uses atomic writes (write-to-temp + rename) to prevent corruption.
 * Falls back gracefully to in-memory if filesystem is unavailable.
 */
import { MemoryStorage } from './storage.js';
import { getLogger } from '../utils/logger.js';

const log = getLogger('deep-tree-echo-core/memory/FileSystemStorage');

export interface FileSystemStorageConfig {
  /** Directory to store data files */
  storagePath: string;
  /** File extension for storage files */
  extension?: string;
}

export class FileSystemStorage implements MemoryStorage {
  private storagePath: string;
  private extension: string;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  // In-memory cache for fast reads
  private cache: Map<string, string> = new Map();

  constructor(config: FileSystemStorageConfig) {
    this.storagePath = config.storagePath;
    this.extension = config.extension || '.json';
  }

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initialize();
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    try {
      const fs = await import('node:fs/promises');
      await fs.mkdir(this.storagePath, { recursive: true });
      this.initialized = true;
      log.info(`FileSystemStorage initialized at ${this.storagePath}`);
    } catch (error) {
      log.error('Failed to initialize FileSystemStorage:', error);
      // Still mark as initialized — will fall back to cache-only mode
      this.initialized = true;
    }
  }

  private keyToPath(key: string): string {
    // Sanitize key for filesystem safety
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${this.storagePath}/${safeKey}${this.extension}`;
  }

  async load(key: string): Promise<string | undefined> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    await this.ensureInit();

    try {
      const fs = await import('node:fs/promises');
      const filePath = this.keyToPath(key);
      const data = await fs.readFile(filePath, 'utf-8');
      this.cache.set(key, data);
      return data;
    } catch (error: unknown) {
      // File not found is expected for first-time loads
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'ENOENT') {
        return undefined;
      }
      log.error(`Failed to load key "${key}":`, error);
      return undefined;
    }
  }

  async save(key: string, value: string): Promise<void> {
    await this.ensureInit();

    // Update cache immediately
    this.cache.set(key, value);

    try {
      const fs = await import('node:fs/promises');
      const filePath = this.keyToPath(key);
      const tempPath = `${filePath}.tmp`;

      // Atomic write: write to temp file, then rename
      await fs.writeFile(tempPath, value, 'utf-8');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      log.error(`Failed to save key "${key}":`, error);
      // Data is still in cache, so reads will work until process restart
    }
  }

  /**
   * Delete a key from storage
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);

    try {
      const fs = await import('node:fs/promises');
      const filePath = this.keyToPath(key);
      await fs.unlink(filePath);
    } catch {
      // Ignore — file may not exist
    }
  }

  /**
   * List all stored keys
   */
  async keys(): Promise<string[]> {
    await this.ensureInit();

    try {
      const fs = await import('node:fs/promises');
      const files = await fs.readdir(this.storagePath);
      return files
        .filter(f => f.endsWith(this.extension))
        .map(f => f.slice(0, -this.extension.length));
    } catch {
      return [];
    }
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    this.cache.clear();

    try {
      const fs = await import('node:fs/promises');
      const files = await fs.readdir(this.storagePath);
      await Promise.all(
        files.map(f => fs.unlink(`${this.storagePath}/${f}`).catch(() => {}))
      );
    } catch {
      // Ignore
    }
  }
}
