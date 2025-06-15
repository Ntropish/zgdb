import { createAsyncClient, createSyncClient as createGenericSyncClient, StoreAdapter, SyncStoreAdapter } from '@zgdb/runtime';
import { serializeNode, deserializeNode } from "./generated-serializers.js";
import { createNodeData, updateNodeData, createNodeDataSync, updateNodeDataSync } from "./mutation-helpers.js";
import type { NodeDataTypeMap } from './generated-types.js';

export type { StoreAdapter, SyncStoreAdapter, TransactionClient, TransactionClientSync } from '@zgdb/runtime';
export * from './generated-types.js';

export function createClient(store: StoreAdapter) {
    return createAsyncClient<NodeDataTypeMap>(store, {
        serializeNode,
        deserializeNode,
        createNodeData,
        updateNodeData,
    });
}

export function createSyncClient(store: SyncStoreAdapter) {
    return createGenericSyncClient<NodeDataTypeMap>(store, {
        serializeNode,
        deserializeNode,
        createNodeDataSync,
        updateNodeDataSync,
    });
}
