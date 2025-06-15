"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapStoreAdapter = void 0;
/**
 * An in-memory store adapter that supports atomic transactions.
 */
class MapStoreAdapter {
    mainDb = new Map();
    async get(key) {
        return this.mainDb.get(key);
    }
    async set(key, value) {
        this.mainDb.set(key, value);
    }
    async transact(updateFn) {
        // 1. Create a temporary buffer for the transaction.
        const txBuffer = new Map();
        // 2. Define the transactional get/set operations.
        const transactionCtx = {
            get: async (key) => {
                // Read from the transaction buffer first, then fall back to the main DB.
                return txBuffer.get(key) ?? this.mainDb.get(key);
            },
            set: (key, value) => {
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
        }
        catch (error) {
            // 5. If an error occurs, the buffer is discarded and an error is thrown.
            console.error("Transaction failed, rolling back.");
            throw error;
        }
    }
}
exports.MapStoreAdapter = MapStoreAdapter;
