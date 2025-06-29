import { NormalizedSchema } from "../../parser/types.js";
import { IGenerator } from "./interface.js";
import { mapTsType } from "../utils.js";

function generateSingleInterface(schema: NormalizedSchema): string {
  if (schema.isJoinTable) {
    return "";
  }
  const fields = schema.fields
    .map((f) => `  ${f.name}: ${mapTsType(f.type)};`)
    .join("\n");

  return `export interface I${schema.name} {\n${fields}\n}`;
}

export class InterfaceGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const interfaces = schemas
      .map(generateSingleInterface)
      .filter(Boolean)
      .join("\n\n");
    return `// --- Interfaces ---\n${interfaces}`;
  }
}
