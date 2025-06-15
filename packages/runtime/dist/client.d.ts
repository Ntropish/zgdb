/**
 * @file packages/runtime/src/client.ts
 * @description A type-safe, store-agnostic database client with transaction support.
 */
import type { Draft } from "immer";
export interface StoreAdapter {
    get(key: string): Promise<Uint8Array | undefined>;
    set(key: string, value: Uint8Array): Promise<void>;
    transact<T>(updateFn: (transactionCtx: {
        get: (key: string) => Promise<Uint8Array | undefined>;
        set: (key: string, value: Uint8Array) => void;
    }) => Promise<T>): Promise<T>;
}
export type TransactionClient<NodeDataMap extends Record<string, any>> = {
    getNode<T extends keyof NodeDataMap>(nodeType: T, nodeId: string): Promise<NodeDataMap[T] | undefined>;
    createNode<T extends keyof NodeDataMap>(nodeType: T, data: {
        fields: NodeDataMap[T]["fields"];
        relationIds: NodeDataMap[T]["relationIds"];
    }): Promise<NodeDataMap[T]>;
    updateNode<T extends keyof NodeDataMap>(nodeType: T, nodeId: string, recipe: (draft: Draft<NodeDataMap[T]>) => void): Promise<NodeDataMap[T]>;
};
export interface SyncStoreAdapter {
    get(key: string): Uint8Array | undefined;
    set(key: string, value: Uint8Array): void;
    transactSync<T>(updateFn: (transactionCtx: {
        get(key: string): Uint8Array | undefined;
        set(key: string, value: Uint8Array): void;
    }) => T): T;
}
export type TransactionClientSync<NodeDataMap extends Record<string, any>> = {
    getNode<T extends keyof NodeDataMap>(nodeType: T, nodeId: string): NodeDataMap[T] | undefined;
    createNode<T extends keyof NodeDataMap>(nodeType: T, data: {
        fields: NodeDataMap[T]["fields"];
        relationIds: NodeDataMap[T]["relationIds"];
    }): NodeDataMap[T];
    updateNode<T extends keyof NodeDataMap>(nodeType: T, nodeId: string, recipe: (draft: Draft<NodeDataMap[T]>) => void): NodeDataMap[T];
};
export declare function createAsyncClient<NodeDataMap extends Record<string, any>>(store: StoreAdapter, helpers: {
    serializeNode: any;
    deserializeNode: any;
    createNodeData: any;
    updateNodeData: any;
}): {
    transact: <T>(recipe: (tx: TransactionClient<NodeDataMap>) => Promise<T>) => Promise<T>;
};
export declare function createSyncClient<NodeDataMap extends Record<string, any>>(store: SyncStoreAdapter, helpers: {
    serializeNode: any;
    deserializeNode: any;
    createNodeDataSync: any;
    updateNodeDataSync: any;
}): {
    transactSync: <T>(recipe: (tx: TransactionClientSync<NodeDataMap>) => T) => T;
};
