"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapStoreAdapterSync = void 0;
class MapStoreAdapterSync {
    store = new Map();
    get(key) {
        return this.store.get(key);
    }
    set(key, value) {
        this.store.set(key, value);
    }
    transactSync(updateFn) {
        // For this in-memory adapter, we can create a cheap backup.
        // For a real file-based sync adapter, you'd use file journaling.
        const originalState = new Map(this.store);
        const pendingWrites = new Map();
        const transactionCtx = {
            get: (key) => {
                if (pendingWrites.has(key)) {
                    return pendingWrites.get(key);
                }
                return this.store.get(key);
            },
            set: (key, value) => {
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
        }
        catch (error) {
            // If an error occurs, roll back to the original state.
            this.store = originalState;
            console.error("Sync transaction failed, rolling back.", error);
            throw error;
        }
    }
}
exports.MapStoreAdapterSync = MapStoreAdapterSync;
