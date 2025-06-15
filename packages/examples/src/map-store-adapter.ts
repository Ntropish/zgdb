import type { StoreAdapter } from "./dist/graph/index.js";

/**
 * An in-memory store adapter that supports atomic transactions.
 */
export class MapStoreAdapter implements StoreAdapter {
  private mainDb = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | undefined> {
    return this.mainDb.get(key);
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.mainDb.set(key, value);
  }

  async transact<T>(
    updateFn: (transactionCtx: {
      get(key: string): Promise<Uint8Array | undefined>;
      set(key: string, value: Uint8Array): void;
    }) => Promise<T>
  ): Promise<T> {
    // 1. Create a temporary buffer for the transaction.
    const txBuffer = new Map<string, Uint8Array>();

    // 2. Define the transactional get/set operations.
    const transactionCtx = {
      get: async (key: string): Promise<Uint8Array | undefined> => {
        // Read from the transaction buffer first, then fall back to the main DB.
        return txBuffer.get(key) ?? this.mainDb.get(key);
      },
      set: (key: string, value: Uint8Array): void => {
        // Writes only go to the transaction buffer.
        txBuffer.set(key, value);
      },
    };

    try {
      // 3. Execute the user's logic with the transactional context.
      const result = await updateFn(transactionCtx);

      // 4. If successful, commit the changes by merging the buffer into the main DB.
      for (const [key, value] of txBuffer.entries()) {
        this.mainDb.set(key, value);
      }
      return result;
    } catch (error) {
      // 5. If an error occurs, the buffer is discarded and an error is thrown.
      console.error("Transaction failed, rolling back.");
      throw error;
    }
  }
}
