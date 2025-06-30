import { IGenerator } from "./interface.js";
import { NormalizedSchema } from "../../parser/types.js";
import { toSnakeCase } from "../utils.js";

export class ImportGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const imports = schemas
      .filter((s) => !s.isJoinTable)
      .map((s) => {
        const schemaName = s.name;
        const importPath = `./schema/${toSnakeCase(schemaName)}.js`;
        return `import * as ${schemaName}FB from '${importPath}';`;
      })
      .join("\n");

    return `
// --- Imports ---
import { 
  ZgClient, 
  ZgTransaction, 
  ZgBaseNode, 
  ZgDatabase, 
  ZgAuthContext,
  NodeSchema,
  ZgCollection 
} from '@zgdb/client';

${imports}
`;
  }
}
