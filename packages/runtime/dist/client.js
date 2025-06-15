"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAsyncClient = createAsyncClient;
exports.createSyncClient = createSyncClient;
const key_encoder_js_1 = require("./key-encoder.js");
// ===========================================
//  Client Factories
// ===========================================
function createAsyncClient(store, helpers) {
    const { serializeNode, deserializeNode, createNodeData, updateNodeData } = helpers;
    const createTxClient = (txStore) => {
        const txCache = new Map();
        const client = {
            async getNode(nodeType, nodeId) {
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, nodeId).toString();
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
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, node.id).toString();
                const buffer = serializeNode[nodeType](node);
                txCache.set(key, node);
                txStore.set(key, buffer);
                return node;
            },
            async updateNode(nodeType, nodeId, recipe) {
                const existingNode = await client.getNode(nodeType, nodeId);
                if (!existingNode) {
                    throw new Error(`Node ${nodeType}:${nodeId} not found for update.`);
                }
                const updatedNode = updateNodeData[nodeType](existingNode, recipe);
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, nodeId).toString();
                const buffer = serializeNode[nodeType](updatedNode);
                txCache.set(key, updatedNode);
                txStore.set(key, buffer);
                return updatedNode;
            },
        };
        return client;
    };
    return {
        transact: async (recipe) => {
            return store.transact(async (txStore) => {
                const txClient = createTxClient(txStore);
                return recipe(txClient);
            });
        },
    };
}
function createSyncClient(store, helpers) {
    const { serializeNode, deserializeNode, createNodeDataSync, updateNodeDataSync, } = helpers;
    const createTxClientSync = (txStore) => {
        const txCache = new Map();
        const client = {
            getNode(nodeType, nodeId) {
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, nodeId).toString();
                if (txCache.has(key))
                    return txCache.get(key);
                const buffer = txStore.get(key);
                if (!buffer)
                    return undefined;
                const node = deserializeNode[nodeType](buffer);
                txCache.set(key, node);
                return node;
            },
            createNode(nodeType, data) {
                const node = createNodeDataSync[nodeType](data);
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, node.id).toString();
                const buffer = serializeNode[nodeType](node);
                txCache.set(key, node);
                txStore.set(key, buffer);
                return node;
            },
            updateNode(nodeType, nodeId, recipe) {
                const existingNode = client.getNode(nodeType, nodeId);
                if (!existingNode) {
                    throw new Error(`Node ${nodeType}:${nodeId} not found for update.`);
                }
                const updatedNode = updateNodeDataSync[nodeType](existingNode, recipe);
                const key = key_encoder_js_1.KeyEncoder.nodeKey(nodeType, nodeId).toString();
                const buffer = serializeNode[nodeType](updatedNode);
                txCache.set(key, updatedNode);
                txStore.set(key, buffer);
                return updatedNode;
            },
        };
        return client;
    };
    return {
        transactSync: (recipe) => {
            return store.transactSync((txStore) => {
                const txClient = createTxClientSync(txStore);
                return recipe(txClient);
            });
        },
    };
}
