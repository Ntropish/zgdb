import type { StoreAdapter } from "./client.js";
/**
 * An in-memory store adapter that supports atomic transactions.
 */
export declare class MapStoreAdapter implements StoreAdapter {
    private mainDb;
    get(key: string): Promise<Uint8Array | undefined>;
    set(key: string, value: Uint8Array): Promise<void>;
    transact<T>(updateFn: (transactionCtx: {
        get(key: string): Promise<Uint8Array | undefined>;
        set(key: string, value: Uint8Array): void;
    }) => Promise<T>): Promise<T>;
}
