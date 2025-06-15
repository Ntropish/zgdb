"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const key_encoder_js_1 = require("./key-encoder.js");
function createClient(store, helpers) {
    const { serializeNode, deserializeNode, createNodeData, updateNodeData } = helpers;
    const createTxClient = (txStore) => {
        const txCache = new Map();
        const client = {
            async getNode(nodeType, nodeId) {
                console.log(`[[GET NODE]] ${String(nodeType)}:${nodeId}`);
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, nodeId).toString();
                if (txCache.has(key))
                    return txCache.get(key);
                const buffer = await txStore.get(key);
                if (!buffer)
                    return undefined;
                const node = deserializeNode[nodeType](buffer);
                console.log(`[[GET NODE:result]] ${String(nodeType)}:${nodeId}`, node);
                txCache.set(key, node);
                return node;
            },
            async createNode(nodeType, data) {
                console.log(`[[CREATE NODE]] ${String(nodeType)}`, data);
                const node = createNodeData[nodeType](data);
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, node.id).toString();
                const buffer = serializeNode[nodeType](node);
                txCache.set(key, node);
                txStore.set(key, buffer);
                console.log(`[[CREATE NODE:result]] ${String(nodeType)}`, node);
                return node;
            },
            async updateNode(nodeType, nodeId, recipe) {
                console.log(`[[UPDATE NODE]] ${String(nodeType)}:${nodeId}`);
                const existingNode = await client.getNode(nodeType, nodeId);
                if (!existingNode) {
                    throw new Error(`Node ${nodeType}:${nodeId} not found for update.`);
                }
                const updatedNode = updateNodeData[nodeType](existingNode, recipe);
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, nodeId).toString();
                const buffer = serializeNode[nodeType](updatedNode);
                txCache.set(key, updatedNode);
                txStore.set(key, buffer);
                console.log(`[[UPDATE NODE:result]] ${String(nodeType)}:${nodeId}`, updatedNode);
                return updatedNode;
            },
        };
        return client;
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
