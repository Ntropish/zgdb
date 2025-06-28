import { SchemaConfig, EntityDef, Resolver, Policy } from "./parser/types.js";
import { parseSchemas } from "./parser/index.js";
import { generate } from "./generator/generator.js";

export { parseSchemas, generate };

export type { SchemaConfig, EntityDef, Resolver, Policy };
