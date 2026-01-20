import { MemoryStorage } from "../memory/storage.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("ElectronStorageAdapter");

/**
 * Storage adapter for Electron runtime using IPC to communicate with main process
 *
 * This adapter provides persistent storage for cognitive modules in Electron apps
 * by leveraging the electron-store or similar persistence mechanisms.
 *
 * @example
 * ```typescript
 * // In renderer process
 * const storage = new ElectronStorageAdapter();
 * const ragMemory = new RAGMemoryStore(storage);
 * ```
 */
export class ElectronStorageAdapter implements MemoryStorage {
  private readonly ipcRenderer: any;
  private readonly storagePrefix: string;

  constructor(storagePrefix = "deltecho") {
    // Dynamic import to avoid issues when not in Electron environment
    try {
      const { ipcRenderer } = require("electron");
      this.ipcRenderer = ipcRenderer;
    } catch (error) {
      throw new Error(
        "ElectronStorageAdapter requires Electron environment. " +
          "Make sure this is running in an Electron renderer process.",
      );
    }
    this.storagePrefix = storagePrefix;
  }

  /**
   * Load data from Electron persistent storage
   */
  async load(key: string): Promise<string | undefined> {
    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      const result = await this.ipcRenderer.invoke("storage:get", prefixedKey);
      return result ?? undefined;
    } catch (error) {
      logger.error(`Failed to load key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Save data to Electron persistent storage
   */
  async save(key: string, value: string): Promise<void> {
    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      await this.ipcRenderer.invoke("storage:set", prefixedKey, value);
    } catch (error) {
      logger.error(`Failed to save key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete data from storage
   */
  async delete(key: string): Promise<void> {
    try {
      const prefixedKey = `${this.storagePrefix}:${key}`;
      await this.ipcRenderer.invoke("storage:delete", prefixedKey);
    } catch (error) {
      logger.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data with the current prefix
   */
  async clear(): Promise<void> {
    try {
      await this.ipcRenderer.invoke("storage:clear", this.storagePrefix);
    } catch (error) {
      logger.error("Failed to clear storage:", error);
      throw error;
    }
  }

  /**
   * List all keys with the current prefix
   */
  async keys(): Promise<string[]> {
    try {
      const allKeys = await this.ipcRenderer.invoke(
        "storage:keys",
        this.storagePrefix,
      );
      return allKeys.map((key: string) =>
        key.replace(`${this.storagePrefix}:`, ""),
      );
    } catch (error) {
      logger.error("Failed to list keys:", error);
      return [];
    }
  }
}
