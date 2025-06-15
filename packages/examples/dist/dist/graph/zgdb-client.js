import { KeyEncoder } from '@zgdb/runtime';
import { serializeNode, deserializeNode } from './generated-serializers.js';
import { createNodeData, updateNodeData } from './mutation-helpers.js';
// ============================================
//  Client Factory
// ============================================
export function createClient(store) {
    return {
        /**
         * Creates a new node, serializes it, and saves it to the store.
         */
        async createNode(nodeType, data) {
            const node = createNodeData[nodeType](data);
            const key = KeyEncoder.nodeKey(nodeType, node.id).toString();
            const buffer = serializeNode[nodeType](node);
            await store.set(key, buffer);
            return node;
        },
        /**
         * Retrieves and deserializes a node from the store.
         */
        async getNode(nodeType, nodeId) {
            const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
            const buffer = await store.get(key);
            if (!buffer)
                return undefined;
            return deserializeNode[nodeType](buffer);
        },
        /**
         * Atomically retrieves, updates, and saves a node.
         */
        async updateNode(nodeType, nodeId, recipe) {
            const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
            const existingBuffer = await store.get(key);
            if (!existingBuffer) {
                throw new Error(`Node with key ${key} not found for update.`);
            }
            const existingNode = deserializeNode[nodeType](existingBuffer);
            const updatedNode = updateNodeData[nodeType](existingNode, recipe);
            const updatedBuffer = serializeNode[nodeType](updatedNode);
            await store.set(key, updatedBuffer);
            return updatedNode;
        }
    };
}
