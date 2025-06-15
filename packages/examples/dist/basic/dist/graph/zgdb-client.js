import { createAsyncClient, createSyncClient as createGenericSyncClient } from '@zgdb/runtime';
import { serializeNode, deserializeNode } from "./generated-serializers.js";
import { createNodeData, updateNodeData, createNodeDataSync, updateNodeDataSync } from "./mutation-helpers.js";
export * from './generated-types.js';
export function createClient(store) {
    return createAsyncClient(store, {
        serializeNode,
        deserializeNode,
        createNodeData,
        updateNodeData,
    });
}
export function createSyncClient(store) {
    return createGenericSyncClient(store, {
        serializeNode,
        deserializeNode,
        createNodeDataSync,
        updateNodeDataSync,
    });
}
