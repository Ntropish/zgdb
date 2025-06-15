/**
 * @file src/codegen/client-generator.ts
 * @description Generates a type-safe, store-agnostic database client.
 */

import { Schema } from "./utils.js";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateClient(schema: Schema): string {
  const lines: string[] = [];
  const nodeTypes = Object.keys(schema);

  const allNodeDataTypes = nodeTypes
    .map((t) => `${capitalize(t)}Data`)
    .join(" | ");

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
  lines.push("/**");
  lines.push(
    " * Defines the contract for any storage backend. Implement this interface"
  );
  lines.push(
    " * to connect the ZGDB client to your chosen database (e.g., Map, LevelDB, IndexedDB)."
  );
  lines.push(" */");
  lines.push(`export interface StoreAdapter {`);
  lines.push(`  get(key: string): Promise<Uint8Array | undefined>;`);
  lines.push(`  set(key: string, value: Uint8Array): Promise<void>;`);
  lines.push(`}`);
  lines.push("");

  // --- Type Helpers ---
  lines.push(`type ClientNodeType = (typeof supportedNodeTypes)[number];`);
  lines.push(
    `type NodeDataType<T extends ClientNodeType> = T extends 'user' ? UserData : T extends 'post' ? PostData : T extends 'tag' ? TagData : T extends 'familiar' ? FamiliarData : never;`
  );
  lines.push("");

  // --- createClient Factory ---
  lines.push("// ============================================");
  lines.push("//  Client Factory");
  lines.push("// ============================================");
  lines.push(`export function createClient(store: StoreAdapter) {`);
  lines.push(`  return {`);

  // --- createNode Method ---
  lines.push(`    /**`);
  lines.push(
    `     * Creates a new node, serializes it, and saves it to the store.`
  );
  lines.push(`     */`);
  lines.push(`    async createNode<T extends ClientNodeType>(`);
  lines.push(`      nodeType: T,`);
  lines.push(
    `      data: { fields: NodeDataType<T>['fields'], relationIds: NodeDataType<T>['relationIds'] }`
  );
  lines.push(`    ): Promise<NodeDataType<T>> {`);
  lines.push(`      const node = createNodeData[nodeType](data as any);`);
  lines.push(
    `      const key = KeyEncoder.nodeKey(nodeType, node.id).toString();`
  );
  lines.push(`      const buffer = serializeNode[nodeType](node as any);`);
  lines.push(`      await store.set(key, buffer);`);
  lines.push(`      return node as NodeDataType<T>;`);
  lines.push(`    },`);
  lines.push(``);

  // --- getNode Method ---
  lines.push(`    /**`);
  lines.push(`     * Retrieves and deserializes a node from the store.`);
  lines.push(`     */`);
  lines.push(
    `    async getNode<T extends ClientNodeType>(nodeType: T, nodeId: string): Promise<NodeDataType<T> | undefined> {`
  );
  lines.push(
    `      const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();`
  );
  lines.push(`      const buffer = await store.get(key);`);
  lines.push(`      if (!buffer) return undefined;`);
  lines.push(
    `      return deserializeNode[nodeType](buffer) as NodeDataType<T>;`
  );
  lines.push(`    },`);
  lines.push(``);

  // --- updateNode Method ---
  lines.push(`    /**`);
  lines.push(`     * Atomically retrieves, updates, and saves a node.`);
  lines.push(`     */`);
  lines.push(`    async updateNode<T extends ClientNodeType>(`);
  lines.push(`      nodeType: T,`);
  lines.push(`      nodeId: string,`);
  lines.push(`      recipe: (draft: Draft<NodeDataType<T>>) => void`);
  lines.push(`    ): Promise<NodeDataType<T>> {`);
  lines.push(
    `      const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();`
  );
  lines.push(`      const existingBuffer = await store.get(key);`);
  lines.push(`      if (!existingBuffer) {`);
  lines.push(
    `        throw new Error(\`Node with key \${key} not found for update.\`);`
  );
  lines.push(`      }`);
  lines.push(``);
  lines.push(
    `      const existingNode = deserializeNode[nodeType](existingBuffer) as NodeDataType<T>;`
  );
  lines.push(
    `      const updatedNode = updateNodeData[nodeType](existingNode as any, recipe as any);`
  );
  lines.push(
    `      const updatedBuffer = serializeNode[nodeType](updatedNode as any);`
  );
  lines.push(``);
  lines.push(`      await store.set(key, updatedBuffer);`);
  lines.push(`      return updatedNode as NodeDataType<T>;`);
  lines.push(`    }`);
  lines.push(`  };`);
  lines.push(`}`);

  return lines.join("\n");
}
