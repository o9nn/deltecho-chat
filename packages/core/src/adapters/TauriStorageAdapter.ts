import { MemoryStorage } from "../memory/storage.js";
import { getLogger } from "../utils/logger.js";

const log = getLogger("deep-tree-echo-core/adapters/TauriStorageAdapter");

/**
 * Tauri Store interface (matches @tauri-apps/plugin-store API)
 */
interface TauriStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
  save(): Promise<void>;
}

/**
 * Storage adapter for Tauri runtime using the Tauri Store API
 *
 * This adapter provides persistent storage for cognitive modules in Tauri apps
 * by leveraging the @tauri-apps/plugin-store plugin.
 *
 * @example
 * ```typescript
 * // In Tauri frontend
 * const storage = new TauriStorageAdapter();
 * const ragMemory = new RAGMemoryStore(storage);
 * ```
 */
export class TauriStorageAdapter implements MemoryStorage {
  private store: TauriStore | null = null;
  private readonly storagePrefix: string;
  private initialized = false;

  constructor(storagePrefix = "deltecho") {
    this.storagePrefix = storagePrefix;
  }

  /**
   * Initialize the Tauri store
   * Must be called before using the adapter
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import to avoid issues when not in Tauri environment
       
      const tauriStore = await (Function(
        'return import("@tauri-apps/plugin-store")',
      )() as Promise<{
        Store: new (path: string) => TauriStore;
      }>);
      this.store = new tauriStore.Store("deltecho.dat");
      this.initialized = true;
    } catch (error) {
      throw new Error(
        "TauriStorageAdapter requires Tauri environment with @tauri-apps/plugin-store. " +
          "Make sure the plugin is installed and configured.",
      );
    }
  }

  /**
   * Load data from Tauri persistent storage
   */
  async load(key: string): Promise<string | undefined> {
    await this.ensureInitialized();

    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      const result = await this.store!.get(prefixedKey);
      return result ?? undefined;
    } catch (error) {
      log.error(`Failed to load key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Save data to Tauri persistent storage
   */
  async save(key: string, value: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      await this.store!.set(prefixedKey, value);
      await this.store!.save();
    } catch (error) {
      log.error(`Failed to save key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete data from storage
   */
  async delete(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      await this.store!.delete(prefixedKey);
      await this.store!.save();
    } catch (error) {
      log.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data with the current prefix
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      const keys = await this.keys();
      for (const key of keys) {
        await this.delete(key);
      }
    } catch (error) {
      log.error("Failed to clear storage:", error);
      throw error;
    }
  }

  /**
   * List all keys with the current prefix
   */
  async keys(): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const allKeys = await this.store!.keys();
      return allKeys
        .filter((key: string) => key.startsWith(`${this.storagePrefix}:`))
        .map((key: string) => key.replace(`${this.storagePrefix}:`, ""));
    } catch (error) {
      log.error("Failed to list keys:", error);
      return [];
    }
  }
}
