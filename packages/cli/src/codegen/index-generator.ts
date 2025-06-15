/**
 * @file src/codegen/index-generator.ts
 * @description Generates the main index.ts file for the generated graph client.
 */

export function generateIndex(): string {
  const lines: string[] = [];

  lines.push(
    "// ==================================================================="
  );
  lines.push("//  ZGDB: Re-export all generated assets for easy consumption.");
  lines.push(
    "// ==================================================================="
  );
  lines.push("");

  // Export the core client factory and StoreAdapter interface
  lines.push(`export * from './zgdb-client.js';`);

  // Export the schema for advanced use cases
  lines.push(`export { default as schema } from './graph-schema.js';`);

  // Export lower-level tools for users who need them
  lines.push(`export * from './generated-serializers.js';`);
  lines.push(`export * from './mutation-helpers.js';`);
  lines.push("");

  return lines.join("\n");
}
