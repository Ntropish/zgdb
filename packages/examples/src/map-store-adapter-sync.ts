import { SyncStoreAdapter } from "./university/dist/graph/zgdb-client.js";

export class MapStoreAdapterSync implements SyncStoreAdapter {
  private store = new Map<string, Uint8Array>();

  get(key: string): Uint8Array | undefined {
    return this.store.get(key);
  }

  set(key: string, value: Uint8Array): void {
    this.store.set(key, value);
  }

  transactSync<T>(
    updateFn: (transactionCtx: {
      get: (key: string) => Uint8Array | undefined;
      set: (key: string, value: Uint8Array) => void;
    }) => T
  ): T {
    // For this in-memory adapter, we can create a cheap backup.
    // For a real file-based sync adapter, you'd use file journaling.
    const originalState = new Map(this.store);
    const pendingWrites = new Map<string, Uint8Array>();

    const transactionCtx = {
      get: (key: string): Uint8Array | undefined => {
        if (pendingWrites.has(key)) {
          return pendingWrites.get(key);
        }
        return this.store.get(key);
      },
      set: (key: string, value: Uint8Array): void => {
        pendingWrites.set(key, value);
      },
    };

    try {
      const result = updateFn(transactionCtx);
      // If the function completes without error, commit the changes.
      pendingWrites.forEach((value, key) => {
        this.store.set(key, value);
      });
      return result;
    } catch (error) {
      // If an error occurs, roll back to the original state.
      this.store = originalState;
      console.error("Sync transaction failed, rolling back.", error);
      throw error;
    }
  }
}
