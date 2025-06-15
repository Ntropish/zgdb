import { SyncStoreAdapter } from "./client.js";
export declare class MapStoreAdapterSync implements SyncStoreAdapter {
    private store;
    get(key: string): Uint8Array | undefined;
    set(key: string, value: Uint8Array): void;
    transactSync<T>(updateFn: (transactionCtx: {
        get: (key: string) => Uint8Array | undefined;
        set: (key: string, value: Uint8Array) => void;
    }) => T): T;
}
