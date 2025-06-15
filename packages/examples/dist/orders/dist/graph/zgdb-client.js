import { createClient as createGenericClient } from '@zgdb/runtime';
import { serializeNode, deserializeNode } from "./generated-serializers.js";
import { createNodeData, updateNodeData } from "./mutation-helpers.js";
export * from '@zgdb/runtime';
export * from './generated-types.js';
export function createClient(store) {
    return createGenericClient(store, {
        serializeNode,
        deserializeNode,
        createNodeData,
        updateNodeData,
    });
}
