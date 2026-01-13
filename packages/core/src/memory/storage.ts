/**
 * Storage interface for persisting memories
 * This allows the core package to be runtime-agnostic
 */
export interface MemoryStorage {
  load(key: string): Promise<string | undefined>;
  save(key: string, value: string): Promise<void>;
}

/**
 * In-memory storage implementation (for testing or non-persistent use)
 */
export class InMemoryStorage implements MemoryStorage {
  private storage: Map<string, string> = new Map();

  async load(key: string): Promise<string | undefined> {
    return this.storage.get(key);
  }

  async save(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  clear(): void {
    this.storage.clear();
  }
}
