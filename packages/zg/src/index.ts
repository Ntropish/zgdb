import { generate as generateFiles } from "./generator/generator.js";
import { generateFbsFile } from "./generator/generator.js";
import { parseSchemas } from "./parser/index.js";
import type {
  SchemaConfig,
  EntityDef,
  RelationshipDef,
  StandardRelationshipDef,
  PolymorphicRelationshipDef,
  IndexDef,
  Resolver,
  ResolverContext,
} from "./parser/types.js";

type GenerateOptions = {
  schema: SchemaConfig;
  outputDir: string;
};

/**
 * The main entry point for the ZG code generator.
 * @param options - The generation options.
 */
export async function generate(options: GenerateOptions): Promise<void> {
  const normalizedSchemas = parseSchemas(options.schema);
  await generateFiles(normalizedSchemas, options.outputDir);
}

export {
  parseSchemas,
  generateFbsFile,
  SchemaConfig,
  EntityDef,
  RelationshipDef,
  StandardRelationshipDef,
  PolymorphicRelationshipDef,
  IndexDef,
  Resolver,
  ResolverContext,
};
