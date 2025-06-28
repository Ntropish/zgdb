import { NormalizedSchema, Field } from "../parser/types.js";
import { topologicalSort } from "./topological-sort.js";

const asArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

function mapTsType(fbsType: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    long: "number",
    bool: "boolean",
  };
  return typeMap[fbsType] || "any"; // Default for nested tables etc.
}

function generateInterface(schema: NormalizedSchema): string {
  const fields = schema.fields
    .map((f) => `  ${f.name}: ${mapTsType(f.type)};`)
    .join("\n");

  // TODO: Add relationships to interface
  return `export interface I${schema.name} {\n${fields}\n}`;
}

function generateNodeClass(schema: NormalizedSchema): string {
  const fields = schema.fields
    .map(
      (f) => `  get ${f.name}(): ${mapTsType(f.type)} {
    return this.fbb.${f.name}();
  }`
    )
    .join("\n\n");

  // TODO: Add relationship accessors

  return `export class ${schema.name}Node extends ZgBaseNode<LowLevel.${schema.name}> {
  // --- Fields ---
${fields}

  // --- Relationships ---
  // (to be implemented)
}`;
}

function generateDbAccessors(schema: NormalizedSchema): string {
  const schemaNameLower =
    schema.name.charAt(0).toLowerCase() + schema.name.slice(1);
  const { auth, localResolvers, globalResolvers } = schema;

  const generateAuthCheck = (
    action: "create" | "read" | "update" | "delete",
    options: {
      isGet?: boolean;
      takesInput?: boolean;
      fetchRecord?: boolean;
    } = {}
  ) => {
    if (!auth || !auth[action]) {
      return `// No '${action}' auth rules defined for ${schema.name}`;
    }

    const rules = asArray(auth[action] as string | string[]);

    if (rules.length === 0) {
      return `// No '${action}' auth rules defined for ${schema.name}`;
    }

    const checkLogic = rules
      .map((policyName: string) => {
        // This logic now assumes policy names directly map to resolver functions.
        // We need to determine if it's a global or local resolver.
        // For simplicity, we'll check local first, then global.
        const localResolverAccess = `this.localResolvers['${schema.name}']['${policyName}']`;
        const globalResolverAccess = `this.globalResolvers['${policyName}']`;

        const resolverAccess = `(${localResolverAccess} || ${globalResolverAccess})`;

        const contextParts = ["actor: this.authContext.actor", "db: this"];
        if (options.takesInput) {
          contextParts.push("input: data");
        }
        // The record is passed under the 'record' key.
        // For get, it's the result. For update/delete, it's fetched.
        contextParts.push("record: record");

        return `await ${resolverAccess}({ ${contextParts.join(", ")} })`;
      })
      .join(" || "); // Use OR logic for multiple policies

    let authArg = "";
    if (options.isGet) {
      authArg = "result";
    } else if (options.fetchRecord) {
      authArg = "record";
    }

    return `
      const checkAuth = async (record?: any) => {
        if (!this.authContext) throw new Error("Auth context not set");
        const passed = ${checkLogic || "true"};
        if (!passed) {
          throw new Error('Authorization failed for ${action} on ${
      schema.name
    }');
        }
      };
      ${
        options.fetchRecord
          ? `const record = await this.db.getRaw('${schema.name}', id);`
          : ""
      }
      // In a get() call, auth is checked AFTER the result is fetched.
      // For create, it's checked before. For update/delete, it's checked on the fetched record.
      await checkAuth(${authArg});
      `;
  };

  return `
  get ${schemaNameLower}s() {
    return {
      get: async (id: string): Promise<${schema.name}Node | null> => {
        const result = await this.db.get<LowLevel.${schema.name}, ${
    schema.name
  }Node>('${schema.name}', id, (db, fbb, ac) => new ${
    schema.name
  }Node(db, fbb, ac));
        ${generateAuthCheck("read", { isGet: true }).replace(
          "await checkAuth(result);",
          "if (result) await checkAuth(result);"
        )}
        return result;
      },
      create: async (data: Partial<I${schema.name}>): Promise<${
    schema.name
  }Node> => {
        ${generateAuthCheck("create", { takesInput: true })}
        return this.db.create<LowLevel.${schema.name}, ${schema.name}Node>('${
    schema.name
  }', data, (db, fbb, ac) => new ${schema.name}Node(db, fbb, ac));
      },
      update: async (id: string, data: Partial<I${schema.name}>): Promise<${
    schema.name
  }Node> => {
        ${generateAuthCheck("update", { takesInput: true, fetchRecord: true })}
        return this.db.update<LowLevel.${schema.name}, ${schema.name}Node>('${
    schema.name
  }', id, data, (db, fbb, ac) => new ${schema.name}Node(db, fbb, ac));
      },
      delete: async (id: string): Promise<void> => {
        ${generateAuthCheck("delete", { fetchRecord: true })}
        return this.db.delete('${schema.name}', id);
      }
    };
  }`;
}

export function generateZgFile(schemas: NormalizedSchema[]): string {
  const sortedSchemas = topologicalSort(schemas);

  const interfaces = sortedSchemas.map(generateInterface).join("\n\n");
  const nodeClasses = sortedSchemas.map(generateNodeClass).join("\n\n");
  const dbAccessors = sortedSchemas.map(generateDbAccessors).join("\n");

  return `// Generated by ZG. Do not edit.

import { ZgDatabase, ZgBaseNode, ZgAuthContext } from '@zg/client';
import * as LowLevel from './schema_generated.js';

// --- Interfaces ---
${interfaces}

// --- Node Classes ---
${nodeClasses}

// --- Database Class ---
export class ZgClient {
  private db: ZgDatabase;
  private authContext: ZgAuthContext | null = null;
  private localResolvers: Record<string, Record<string, Function>>;
  private globalResolvers: Record<string, Function>;

  constructor(config: any) {
    this.db = new ZgDatabase(config.db);
    this.globalResolvers = config.resolvers.global;
    this.localResolvers = config.resolvers.local;
  }

  setAuthContext(context: ZgAuthContext) {
    this.authContext = context;
  }
${dbAccessors}
}

export function createZgClient(config: any): ZgClient {
  return new ZgClient(config);
}
`;
}
