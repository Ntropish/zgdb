import { createClient as createGenericClient } from '@zgdb/runtime';
import type { StoreAdapter } from '@zgdb/runtime';
import { serializeNode, deserializeNode } from "./generated-serializers.js";
import { createNodeData, updateNodeData } from "./mutation-helpers.js";
import type { NodeDataTypeMap } from './generated-types.js';

export * from '@zgdb/runtime';
export * from './generated-types.js';

export function createClient(store: StoreAdapter) {
    return createGenericClient<NodeDataTypeMap>(store, {
        serializeNode,
        deserializeNode,
        createNodeData,
        updateNodeData,
    });
}
