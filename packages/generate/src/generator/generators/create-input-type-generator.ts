import { NormalizedSchema } from "../../parser/types.js";
import { IGenerator } from "./interface.js";
import { mapTsType } from "../utils.js";

function generateSingleCreateInputType(schema: NormalizedSchema): string {
  if (schema.isJoinTable) {
    return "";
  }
  const createArgs = schema.fields
    .filter((f) => f.name !== "id")
    .map((f) => `${f.name}: ${mapTsType(f.type)}`)
    .join(", ");

  return `export type Create${schema.name}Input = { ${createArgs} };`;
}

export class CreateInputTypeGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const types = schemas
      .map(generateSingleCreateInputType)
      .filter(Boolean)
      .join("\n");
    return `// --- Create Input Types ---\n${types}`;
  }
}
