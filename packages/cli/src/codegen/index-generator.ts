/**
 * @file src/codegen/index-generator.ts
 * @description Generates the main index.ts file for the generated graph client.
 */

export function generateIndex(): string {
  const lines: string[] = [];

  lines.push(
    "// ==================================================================="
  );
  lines.push("//  Re-export all generated assets for easy consumption.");
  lines.push(
    "// ==================================================================="
  );
  lines.push("");

  // Re-export the original schema for reference
  lines.push(`export { default as schema } from './graph-schema.js';`);

  // Re-export all the type-safe serializers and data interfaces
  lines.push(`export * from './generated-serializers.js';`);

  // Re-export the mutation helpers
  lines.push(`export * from './mutation-helpers.js';`);
  lines.push("");

  return lines.join("\n");
}
