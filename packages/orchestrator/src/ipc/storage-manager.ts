import * as fs from "fs";
import * as path from "path";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("StorageManager");

/**
 * Simple key-value storage manager for the orchestrator
 *
 * This provides persistent storage for desktop applications through the IPC server.
 * Supports both in-memory and file-based persistence using JSON storage.
 */
export class StorageManager {
  private storage: Map<string, string> = new Map();
  private persistencePath?: string;
  private persistenceFile?: string;
  private saveDebounceTimer?: ReturnType<typeof setTimeout>;
  private readonly DEBOUNCE_MS = 100;

  constructor(persistencePath?: string) {
    this.persistencePath = persistencePath;
    if (persistencePath) {
      this.persistenceFile = path.join(persistencePath, "storage.json");
      this.loadFromDisk();
    }
  }

  /**
   * Load storage from disk if persistence path is configured
   */
  private loadFromDisk(): void {
    if (!this.persistenceFile) return;

    try {
      // Ensure directory exists
      if (this.persistencePath && !fs.existsSync(this.persistencePath)) {
        fs.mkdirSync(this.persistencePath, { recursive: true });
      }

      if (fs.existsSync(this.persistenceFile)) {
        const data = fs.readFileSync(this.persistenceFile, "utf-8");
        const parsed = JSON.parse(data);

        if (typeof parsed === "object" && parsed !== null) {
          this.storage = new Map(Object.entries(parsed));
        }
      }
    } catch (error) {
      logger.error("Failed to load from disk:", error);
    }
  }

  /**
   * Persist storage to disk with debouncing to avoid excessive writes
   */
  private persistToDisk(): void {
    if (!this.persistenceFile) return;

    // Clear existing debounce timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Debounce writes
    this.saveDebounceTimer = setTimeout(() => {
      this.saveToDiskImmediate();
    }, this.DEBOUNCE_MS);
  }

  /**
   * Immediately save to disk (bypass debouncing)
   */
  private saveToDiskImmediate(): void {
    if (!this.persistenceFile || !this.persistencePath) return;

    try {
      // Ensure directory exists
      if (!fs.existsSync(this.persistencePath)) {
        fs.mkdirSync(this.persistencePath, { recursive: true });
      }

      const data = Object.fromEntries(this.storage);
      const tempFile = this.persistenceFile + ".tmp";

      // Write to temp file first, then rename for atomicity
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tempFile, this.persistenceFile);
    } catch (error) {
      logger.error("Failed to persist to disk:", error);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | undefined> {
    return this.storage.get(key);
  }

  /**
   * Set a value for a key
   */
  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
    this.persistToDisk();
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
    this.persistToDisk();
  }

  /**
   * Clear all keys matching a prefix
   */
  async clear(prefix: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.storage.delete(key);
    }
    this.persistToDisk();
  }

  /**
   * Get all keys matching a prefix
   */
  async keys(prefix?: string): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());

    if (prefix) {
      return allKeys.filter((key) => key.startsWith(prefix));
    }

    return allKeys;
  }

  /**
   * Get storage size (number of keys)
   */
  size(): number {
    return this.storage.size;
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.storage.has(key);
  }

  /**
   * Force immediate persistence (useful before shutdown)
   */
  async flush(): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = undefined;
    }
    this.saveToDiskImmediate();
  }
}
