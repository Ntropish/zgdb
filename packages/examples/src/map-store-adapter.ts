import type { StoreAdapter } from "./dist/graph/index.js";

/**
 * An in-memory store adapter that wraps a JavaScript Map.
 * Perfect for testing and simple use cases.
 */
export class MapStoreAdapter implements StoreAdapter {
  private db = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | undefined> {
    return this.db.get(key);
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.db.set(key, value);
  }
}
