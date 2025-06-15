import { KeyEncoder } from "@zgdb/runtime";
import { serializeNode, deserializeNode, } from "./generated-serializers.js";
import { createNodeData, updateNodeData } from "./mutation-helpers.js";
// ============================================
//  Client Factory
// ============================================
export function createClient(store) {
    const createTxClient = (txStore) => {
        const txCache = new Map();
        // This object now correctly implements the generic methods from TransactionClient
        return {
            async getNode(nodeType, nodeId) {
                console.log(`[[GET NODE]] ${nodeType}:${nodeId}`);
                const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
                if (txCache.has(key))
                    return txCache.get(key);
                const buffer = await txStore.get(key);
                if (!buffer)
                    return undefined;
                const node = deserializeNode[nodeType](buffer);
                console.log(`[[GET NODE:result]] ${nodeType}:${nodeId}`, node);
                txCache.set(key, node);
                return node;
            },
            async createNode(nodeType, data) {
                console.log(`[[CREATE NODE]] ${nodeType}`, data);
                const node = createNodeData[nodeType](data);
                const key = KeyEncoder.nodeKey(nodeType, node.id).toString();
                const buffer = serializeNode[nodeType](node);
                txCache.set(key, node);
                txStore.set(key, buffer);
                return node;
            },
            async updateNode(nodeType, nodeId, recipe) {
                console.log(`[[UPDATE NODE]] ${nodeType}:${nodeId}`);
                const existingNode = await this.getNode(nodeType, nodeId);
                console.log(`[[UPDATE NODE:existingNode]] ${nodeType}:${nodeId}`, existingNode);
                if (!existingNode) {
                    throw new Error(`Node ${nodeType}:${nodeId} not found for update.`);
                }
                const updatedNode = updateNodeData[nodeType](existingNode, recipe);
                console.log(`[[UPDATE NODE:updatedNode]] ${nodeType}:${nodeId}`, updatedNode);
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
        },
    };
}
