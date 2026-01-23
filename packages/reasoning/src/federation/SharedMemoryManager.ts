/* eslint-disable no-console */
import { Atom, AtomType } from "../atomspace/atom.js";

export interface FederationQuery {
  topic?: string;
  type?: AtomType;
  limit?: number;
}

export class SharedMemoryManager {
  private static instance: SharedMemoryManager;
  private publicAtoms: Map<string, Atom> = new Map();
  private subscribers: Map<string, ((atom: Atom) => void)[]> = new Map();

  private constructor() {}

  public static getInstance(): SharedMemoryManager {
    if (!SharedMemoryManager.instance) {
      SharedMemoryManager.instance = new SharedMemoryManager();
    }
    return SharedMemoryManager.instance;
  }

  /**
   * Publishes an atom to the shared memory space.
   * The atom must be marked as 'public' or 'shared'.
   */
  public async publishAtom(atom: Atom): Promise<boolean> {
    if (atom.visibility === "private") {
      console.warn(`Attempted to publish private atom ${atom.id}`);
      return false;
    }

    // Add Origin ID if missing
    if (!atom.originId) {
      // In a real system, this would be the actual Bot ID.
      // For simulation, we'll assume a generic origin if none provided.
      atom.originId = "unknown-origin";
    }

    this.publicAtoms.set(atom.id, atom);
    this.notifySubscribers(atom);
    return true;
  }

  /**
   * Queries the shared memory for atoms matching the criteria.
   */
  public async querySharedAtoms(query: FederationQuery): Promise<Atom[]> {
    const results: Atom[] = [];
    for (const atom of this.publicAtoms.values()) {
      if (query.type && atom.type !== query.type) continue;

      // Simple keyword matching for topic on Node names
      if (query.topic && atom.isNode() && !atom.name.includes(query.topic))
        continue;

      results.push(atom);
      if (query.limit && results.length >= query.limit) break;
    }
    return results;
  }

  /**
   * Subscribes to new atoms containing a specific topic.
   */
  public subscribeToTopic(topic: string, callback: (atom: Atom) => void): void {
    const callbacks = this.subscribers.get(topic) || [];
    callbacks.push(callback);
    this.subscribers.set(topic, callbacks);
  }

  private notifySubscribers(atom: Atom): void {
    if (atom.isNode()) {
      // Notify specific topic subscribers
      for (const [topic, callbacks] of this.subscribers.entries()) {
        if (atom.name.includes(topic)) {
          callbacks.forEach((cb) => cb(atom));
        }
      }
    }
  }

  // Debug method to inspect shared memory state
  public getPublicAtomCount(): number {
    return this.publicAtoms.size;
  }
}
