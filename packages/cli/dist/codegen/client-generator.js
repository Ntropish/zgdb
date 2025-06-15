/**
 * @file src/codegen/client-generator.ts
 * @description Generates the configured ZGDB client.
 */
export function generateClient() {
    const lines = [];
    // --- Imports ---
    lines.push(`import { createAsyncClient, createSyncClient as createGenericSyncClient, StoreAdapter, SyncStoreAdapter } from '@zgdb/runtime';`);
    lines.push(`import { serializeNode, deserializeNode } from "./generated-serializers.js";`);
    lines.push(`import { createNodeData, updateNodeData, createNodeDataSync, updateNodeDataSync } from "./mutation-helpers.js";`);
    lines.push(`import type { NodeDataTypeMap } from './generated-types.js';`);
    lines.push(``);
    // --- Re-exports ---
    // We re-export the types from the runtime for convenience.
    lines.push(`export type { StoreAdapter, SyncStoreAdapter, TransactionClient, TransactionClientSync } from '@zgdb/runtime';`);
    lines.push(`export * from './generated-types.js';`);
    lines.push(``);
    // --- Async Client Factory ---
    lines.push(`export function createClient(store: StoreAdapter) {`);
    lines.push(`    return createAsyncClient<NodeDataTypeMap>(store, {`);
    lines.push(`        serializeNode,`);
    lines.push(`        deserializeNode,`);
    lines.push(`        createNodeData,`);
    lines.push(`        updateNodeData,`);
    lines.push(`    });`);
    lines.push(`}`);
    lines.push(``);
    // --- Sync Client Factory ---
    lines.push(`export function createSyncClient(store: SyncStoreAdapter) {`);
    lines.push(`    return createGenericSyncClient<NodeDataTypeMap>(store, {`);
    lines.push(`        serializeNode,`);
    lines.push(`        deserializeNode,`);
    lines.push(`        createNodeDataSync,`);
    lines.push(`        updateNodeDataSync,`);
    lines.push(`    });`);
    lines.push(`}`);
    lines.push(``);
    return lines.join("\n");
}
