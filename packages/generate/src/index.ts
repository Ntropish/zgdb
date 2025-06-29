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
import type { GeneratorConfig } from "./generator/types.js";

type GenerateOptions = {
  schema: SchemaConfig;
  outputDir: string;
  options?: GeneratorConfig["options"];
};

/**
 * The main entry point for the ZG code generator.
 * @param options - The generation options.
 */
export async function generate(options: GenerateOptions): Promise<void> {
  const normalizedSchemas = parseSchemas(options.schema);
  await generateFiles({
    schemas: normalizedSchemas,
    outputDirectory: options.outputDir,
    options: options.options ?? {},
  });
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
