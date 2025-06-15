/**
 * @file src/codegen/client-generator.ts
 * @description Generates a type-safe, store-agnostic database client with transaction support.
 */

import { Schema } from "./utils.js";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateClient(schema: Schema): string {
  const lines: string[] = [];
  const nodeTypes = Object.keys(schema);

  // --- Type Definitions ---
  const clientNodeTypes = `(typeof supportedNodeTypes)[number]`;
  const nodeDataMap = `
export type NodeDataTypeMap = {
${nodeTypes.map((t) => `  '${t}': ${capitalize(t)}Data;`).join("\n")}
};
    `;

  // --- Imports ---
  lines.push(`import { KeyEncoder } from '@zgdb/runtime';`);
  lines.push(
    `import { serializeNode, deserializeNode, supportedNodeTypes } from './generated-serializers.js';`
  );
  lines.push(
    `import { createNodeData, updateNodeData } from './mutation-helpers.js';`
  );
  lines.push(
    `import type { ${nodeTypes
      .map((t) => `${capitalize(t)}Data`)
      .join(", ")} } from './generated-serializers.js';`
  );
  lines.push(`import type { Draft } from 'immer';`);
  lines.push("");

  // --- StoreAdapter Interface ---
  lines.push("// ============================================");
  lines.push("//  Store Adapter Interface");
  lines.push("// ============================================");
  lines.push(`export interface StoreAdapter {`);
  lines.push(`  get(key: string): Promise<Uint8Array | undefined>;`);
  lines.push(`  set(key: string, value: Uint8Array): Promise<void>;`);
  lines.push(`  transact<T>(`);
  lines.push(`    updateFn: (transactionCtx: {`);
  lines.push(`      get(key: string): Promise<Uint8Array | undefined>;`);
  lines.push(`      set(key: string, value: Uint8Array): void;`);
  lines.push(`    }) => Promise<T>`);
  lines.push(`  ): Promise<T>;`);
  lines.push(`}`);
  lines.push("");

  // --- Type Helpers ---
  lines.push(nodeDataMap);
  lines.push(`type ClientNodeType = keyof NodeDataTypeMap;`);
  lines.push(`
export type TransactionClient = {
  getNode<T extends ClientNodeType>(nodeType: T, nodeId: string): Promise<NodeDataTypeMap[T] | undefined>;
  createNode<T extends ClientNodeType>(nodeType: T, data: { fields: NodeDataTypeMap[T]['fields'], relationIds: NodeDataTypeMap[T]['relationIds'] }): Promise<NodeDataTypeMap[T]>;
  updateNode<T extends ClientNodeType>(nodeType: T, nodeId: string, recipe: (draft: Draft<NodeDataTypeMap[T]>) => void): Promise<NodeDataTypeMap[T]>;
};
    `);

  // --- createClient Factory ---
  lines.push("// ============================================");
  lines.push("//  Client Factory");
  lines.push("// ============================================");
  lines.push(`export function createClient(store: StoreAdapter) {`);
  lines.push(`  const createTxClient = (txStore: { get: (key: string) => Promise<Uint8Array | undefined>; set: (key: string, value: Uint8Array) => void; }): TransactionClient => {
        const txCache = new Map<string, any>();

        // This object now correctly implements the generic methods from TransactionClient
        return {
            async getNode<T extends ClientNodeType>(nodeType: T, nodeId: string) {
                const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
                if (txCache.has(key)) return txCache.get(key);
                
                const buffer = await txStore.get(key);
                if (!buffer) return undefined;

                const node = (deserializeNode as any)[nodeType](buffer);
                txCache.set(key, node);
                return node;
            },
            async createNode<T extends ClientNodeType>(nodeType: T, data: { fields: NodeDataTypeMap[T]['fields'], relationIds: NodeDataTypeMap[T]['relationIds'] }) {
                const node = (createNodeData as any)[nodeType](data);
                const key = KeyEncoder.nodeKey(nodeType, node.id).toString();
                const buffer = (serializeNode as any)[nodeType](node);
                
                txCache.set(key, node);
                txStore.set(key, buffer);
                return node;
            },
            async updateNode<T extends ClientNodeType>(nodeType: T, nodeId: string, recipe: (draft: Draft<NodeDataTypeMap[T]>) => void) {
                const existingNode = await this.getNode(nodeType, nodeId);
                if (!existingNode) {
                    throw new Error(\`Node \${nodeType}:\${nodeId} not found for update.\`);
                }
                const updatedNode = (updateNodeData as any)[nodeType](existingNode, recipe);
                const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
                const buffer = (serializeNode as any)[nodeType](updatedNode);

                txCache.set(key, updatedNode);
                txStore.set(key, buffer);
                return updatedNode;
            },
        };
    };`);
  lines.push(``);

  lines.push(`  return {`);
  lines.push(
    `    async transact<T>(recipe: (tx: TransactionClient) => Promise<T>): Promise<T> {`
  );
  lines.push(`      return store.transact(async (txStore) => {`);
  lines.push(`        const txClient = createTxClient(txStore);`);
  lines.push(`        return recipe(txClient);`);
  lines.push(`      });`);
  lines.push(`    }`);
  lines.push(`  };`);
  lines.push(`}`);

  return lines.join("\n");
}
