import { readdir } from "fs/promises";
import { resolve } from "path";

// A simplified representation of the raw schema file.
export interface RawSchema {
  name: string;
  [key: string]: any;
}

/**
 * Discovers and loads all user-defined schema files from a given directory.
 *
 * @param schemaDir - The absolute path to the directory containing the schemas.
 * @returns A promise that resolves to an array of the raw schema objects.
 */
export async function loadSchemas(schemaDir: string): Promise<RawSchema[]> {
  const schemas: RawSchema[] = [];
  const files = await readdir(schemaDir);

  for (const file of files) {
    if (file.endsWith(".ts")) {
      const schemaPath = resolve(schemaDir, file);
      try {
        // Use a dynamic import to load the TypeScript module.
        const module = await import(schemaPath);
        if (module.default) {
          schemas.push(module.default);
        }
      } catch (error) {
        console.error(`Error loading schema from ${schemaPath}:`, error);
        // Depending on desired strictness, you might want to re-throw here.
      }
    }
  }

  return schemas;
}
