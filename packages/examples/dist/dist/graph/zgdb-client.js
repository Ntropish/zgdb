import { KeyEncoder } from '@zgdb/runtime';
import { serializeNode, deserializeNode } from './generated-serializers.js';
import { createNodeData, updateNodeData } from './mutation-helpers.js';
// ============================================
//  Client Factory
// ============================================
export function createClient(store) {
    const createTxClient = (txStore) => {
        const txCache = new Map();
        // This object now correctly implements the generic methods from TransactionClient
        return {
            async getNode(nodeType, nodeId) {
                const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
                if (txCache.has(key))
                    return txCache.get(key);
                const buffer = await txStore.get(key);
                if (!buffer)
                    return undefined;
                const node = deserializeNode[nodeType](buffer);
                txCache.set(key, node);
                return node;
            },
            async createNode(nodeType, data) {
                const node = createNodeData[nodeType](data);
                const key = KeyEncoder.nodeKey(nodeType, node.id).toString();
                const buffer = serializeNode[nodeType](node);
                txCache.set(key, node);
                txStore.set(key, buffer);
                return node;
            },
            async updateNode(nodeType, nodeId, recipe) {
                const existingNode = await this.getNode(nodeType, nodeId);
                if (!existingNode) {
                    throw new Error(`Node ${nodeType}:${nodeId} not found for update.`);
                }
                const updatedNode = updateNodeData[nodeType](existingNode, recipe);
                const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
                const buffer = serializeNode[nodeType](updatedNode);
                txCache.set(key, updatedNode);
                txStore.set(key, buffer);
                return updatedNode;
            },
        };
    };
    return {
        async transact(recipe) {
            return store.transact(async (txStore) => {
                const txClient = createTxClient(txStore);
                return recipe(txClient);
            });
        }
    };
}
