/**
 * @file src/codegen/client-generator.ts
 * @description Generates the configured ZGDB client.
 */

export function generateClient(): string {
  const lines: string[] = [];

  // --- Imports ---
  lines.push(
    `import { createClient as createGenericClient } from '@zgdb/runtime';`
  );
  lines.push(`import type { StoreAdapter } from '@zgdb/runtime';`);
  lines.push(
    `import { serializeNode, deserializeNode } from "./generated-serializers.js";`
  );
  lines.push(
    `import { createNodeData, updateNodeData } from "./mutation-helpers.js";`
  );
  lines.push(`import type { NodeDataTypeMap } from './generated-types.js';`);
  lines.push(``);

  // --- Re-exports ---
  lines.push(`export * from '@zgdb/runtime';`);
  lines.push(`export * from './generated-types.js';`);
  lines.push(``);

  // --- Client Factory ---
  lines.push(`export function createClient(store: StoreAdapter) {`);
  lines.push(`    return createGenericClient<NodeDataTypeMap>(store, {`);
  lines.push(`        serializeNode,`);
  lines.push(`        deserializeNode,`);
  lines.push(`        createNodeData,`);
  lines.push(`        updateNodeData,`);
  lines.push(`    });`);
  lines.push(`}`);
  lines.push(``);

  return lines.join("\n");
}
