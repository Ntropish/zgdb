/**
 * @file src/codegen/mutation-helpers-generator.ts
 * @description Generates helper functions for creating and updating nodes.
 */

import type { Schema } from "./utils.js";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateMutationHelpers(schema: Schema): string {
  const lines: string[] = [];
  const nodeTypes = Object.keys(schema);

  lines.push(`import { produce, Draft } from '@zgdb/runtime';`);
  lines.push(`import { ulid } from '@zgdb/runtime';`);
  lines.push(`import { z } from '@zgdb/runtime';`);
  lines.push(`import GraphSchema from './graph-schema.js';`);
  lines.push(
    `import type { ${nodeTypes
      .map((t) => `${capitalize(t)}Data`)
      .join(", ")} } from './generated-serializers.js';`
  );
  lines.push(``);

  // ===========================================
  //  Async Mutation Helpers
  // ===========================================
  lines.push(`\n// --- Async Helpers ---`);
  lines.push(`export const createNodeData = {`);
  for (const nodeType of nodeTypes) {
    const capNodeType = capitalize(nodeType);
    lines.push(
      `  ${nodeType}: (data: { fields: ${capNodeType}Data['fields'], relationIds: ${capNodeType}Data['relationIds'] }): ${capNodeType}Data => {`
    );
    lines.push(`    const now = Date.now();`);
    lines.push(`    return {`);
    lines.push(`      id: ulid(),`);
    lines.push(`      type: '${nodeType}',`);
    lines.push(`      createdAt: now,`);
    lines.push(`      updatedAt: now,`);
    lines.push(`      fields: data.fields,`);
    lines.push(`      relationIds: data.relationIds,`);
    lines.push(`    };`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);

  lines.push(`export const updateNodeData = {`);
  for (const nodeType of nodeTypes) {
    const capNodeType = capitalize(nodeType);
    lines.push(`  ${nodeType}: (`);
    lines.push(`    base: ${capNodeType}Data,`);
    lines.push(`    recipe: (draft: Draft<${capNodeType}Data>) => void`);
    lines.push(`  ): ${capNodeType}Data => {`);
    lines.push(`    return produce(base, (draft) => {`);
    lines.push(`      recipe(draft);`);
    lines.push(`      draft.updatedAt = Date.now();`);
    lines.push(`    });`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);

  // ===========================================
  //  Sync Mutation Helpers
  // ===========================================
  lines.push(`\n// --- Sync Helpers ---`);
  lines.push(`export const createNodeDataSync = {`);
  for (const nodeType of nodeTypes) {
    const capNodeType = capitalize(nodeType);
    lines.push(
      `  ${nodeType}: (data: { fields: ${capNodeType}Data['fields'], relationIds: ${capNodeType}Data['relationIds'] }): ${capNodeType}Data => {`
    );
    lines.push(`    const now = Date.now();`);
    lines.push(`    return {`);
    lines.push(`      id: ulid(),`);
    lines.push(`      type: '${nodeType}',`);
    lines.push(`      createdAt: now,`);
    lines.push(`      updatedAt: now,`);
    lines.push(`      fields: data.fields,`);
    lines.push(`      relationIds: data.relationIds,`);
    lines.push(`    };`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);

  lines.push(`export const updateNodeDataSync = {`);
  for (const nodeType of nodeTypes) {
    const capNodeType = capitalize(nodeType);
    lines.push(`  ${nodeType}: (`);
    lines.push(`    base: ${capNodeType}Data,`);
    lines.push(`    recipe: (draft: Draft<${capNodeType}Data>) => void`);
    lines.push(`  ): ${capNodeType}Data => {`);
    lines.push(`    return produce(base, (draft) => {`);
    lines.push(`      recipe(draft);`);
    lines.push(`      draft.updatedAt = Date.now();`);
    lines.push(`    });`);
    lines.push(`  },`);
  }
  lines.push(`};`);

  return lines.join("\n");
}
