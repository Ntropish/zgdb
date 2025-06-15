/**
 * @file src/codegen/type-generator.ts
 * @description Generates the NodeDataTypeMap type definition file.
 */
import { Schema } from "./utils.js";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateTypes(schema: Schema): string {
  const lines: string[] = [];
  const nodeTypes = Object.keys(schema);

  lines.push(
    `import type { ${nodeTypes
      .map((t) => `${capitalize(t)}Data`)
      .join(", ")} } from './generated-serializers.js';`
  );
  lines.push("");
  lines.push("export type NodeDataTypeMap = {");
  lines.push(
    `${nodeTypes.map((t) => `  '${t}': ${capitalize(t)}Data;`).join("\n")}`
  );
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}
