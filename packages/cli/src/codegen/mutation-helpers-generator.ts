/**
 * @file src/codegen/mutation-helpers-generator.ts
 * @description Generates type-safe helper functions for creating and updating node data.
 */

import { Schema } from "./utils.js";

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

  // --- Update Helpers ---
  lines.push("// ============================================");
  lines.push("//  Update Node Data Helpers");
  lines.push("// ============================================");
  lines.push("");

  const updateLines = nodeTypes.map((type) => {
    const capitalizedType = capitalize(type);
    const dataInterface = `${capitalizedType}Data`;
    return `  ${type}: (
    node: ${dataInterface},
    updates: Partial<{ fields: Partial<${dataInterface}['fields']>, relationIds: Partial<${dataInterface}['relationIds']> }>
  ): ${dataInterface} => {
    const newFields = { ...node.fields, ...updates.fields };
    const newRelations = { ...node.relationIds, ...updates.relationIds };
    
    return {
      ...node,
      fields: schema.${type}.fields.parse(newFields),
      relationIds: newRelations,
      updatedAt: Date.now(),
    }
  }`;
  });
  lines.push(`export const updateNodeData = {
${updateLines.join(",\n")}
};`);
  lines.push("");

  return lines.join("\n");
}
