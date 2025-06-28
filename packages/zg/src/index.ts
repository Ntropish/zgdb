import { SchemaConfig } from "./parser/types.js";
import { parseSchemas } from "./parser/index.js";
import { generate } from "./generator/generator.js";

export interface GenerateOptions {
  config: SchemaConfig;
  outputDir: string;
}

export async function zg(options: GenerateOptions) {
  const schemas = parseSchemas(options.config);
  await generate(schemas, options.outputDir);
}

export { createSchemaFactory, parseSchemas } from "./parser/index.js";
export * from "./parser/types.js";

export default zg;
