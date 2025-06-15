/**
 * @file src/codegen/mutation-helpers-generator.ts
 * @description Generates type-safe helper functions for creating and updating node data.
 */

import { Schema } from "./utils.js";
import { produce, type Draft } from "immer";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateMutationHelpers(schema: Schema): string {
  const lines: string[] = [];
  const nodeTypes = Object.keys(schema);

  // --- Imports ---
  lines.push(`import schema from './graph-schema.js';`);
  lines.push(
    `import type { ${nodeTypes
      .map((t) => `${capitalize(t)}Data`)
      .join(", ")} } from './generated-serializers.js';`
  );
  lines.push(`import { uuidv7 as uuid } from 'uuidv7';`);
  lines.push(`import { produce, Draft } from 'immer';`);
  lines.push("");

  // --- Create Helpers ---
  lines.push("// ============================================");
  lines.push("//  Create Node Data Helpers");
  lines.push("// ============================================");
  lines.push("");
  const createLines = nodeTypes.map((type) => {
    const capitalizedType = capitalize(type);
    const dataInterface = `${capitalizedType}Data`;
    return `  ${type}: (data: { fields: ${dataInterface}['fields'], relationIds: ${dataInterface}['relationIds'] }): ${dataInterface} => ({
    id: uuid(),
    type: '${type}',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.${type}.fields.parse(data.fields),
    relationIds: data.relationIds,
  })`;
  });

  lines.push(`export const createNodeData = {
${createLines.join(",\n")}
};`);
  lines.push("");

  // --- Update Helpers (with Immer) ---
  lines.push("// ============================================");
  lines.push("//  Update Node Data Helpers (with Immer)");
  lines.push("// ============================================");
  lines.push("");

  const updateLines = nodeTypes.map((type) => {
    const capitalizedType = capitalize(type);
    const dataInterface = `${capitalizedType}Data`;
    return `  ${type}: (
    node: ${dataInterface},
    recipe: (draft: Draft<${dataInterface}>) => void
  ): ${dataInterface} => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.${type}.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  }`;
  });
  lines.push(`export const updateNodeData = {
${updateLines.join(",\n")}
};`);
  lines.push("");

  return lines.join("\n");
}
