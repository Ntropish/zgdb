import { NormalizedSchema, Relationship } from "../parser/types.js";
import { topologicalSort } from "./topological-sort.js";
import { execSync } from "child_process";
import { GeneratorConfig } from "./types.js";

const asArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

const toKebabCase = (str: string) =>
  str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();

// TODO: This should be configurable
const importExt = ".js";

function mapTsType(fbsType: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    long: "bigint",
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
    .map((f) => {
      let tsType = mapTsType(f.type);
      if (f.type === "string") {
        tsType = "string | null";
      }
      return `  get ${f.name}(): ${tsType} {
    return this.fbb.${f.name}();
  }`;
    })
    .join("\n\n");

  const relationships = (schema.relationships ?? [])
    .filter(
      (rel): rel is Relationship =>
        !("type" in rel && rel.type === "polymorphic")
    )
    .map((rel) => {
      const relSchemaName = rel.node;
      const relNodeName = `${relSchemaName}Node<TActor>`;
      const foreignKeyField = `${rel.name}Id`;
      const resolvedNodeType = `${relNodeName}`; // Simplified
      return `  get ${rel.name}(): ${resolvedNodeType} | null {
    const id = this.fbb.${foreignKeyField}();
    if (!id) return null;
    return this.db.get(
      '${relSchemaName}',
       id,
       (db, fbb, ac) => new ${relNodeName}(db, fbb, ac),
       (bb) => ${relSchemaName}FB.${relSchemaName}.getRootAs${relSchemaName}(bb),
       this.authContext
    ) as ${resolvedNodeType} | null;
  }`;
    })
    .join("\n\n");

  const fieldsList = schema.fields.map((f) => `'${f.name}'`).join(", ");

  const rehydrationParams = schema.fields
    .map((f) => {
      const accessor = `target.fbb.${f.name}()`;
      return `${f.name}: (prop === '${f.name}') ? value : ${accessor}`;
    })
    .join(", ");

  const createStrings = schema.fields
    .filter((f) => f.type === "string")
    .map(
      (f) =>
        `    const ${f.name}Offset = data.${f.name} ? builder.createString(data.${f.name}) : 0;`
    )
    .join("\n");

  const createParams = schema.fields
    .map((f) => {
      if (f.type === "string") return `${f.name}Offset`;
      return `data.${f.name}`;
    })
    .join(", ");

  return `export class ${schema.name}Node<TActor> extends ZgBaseNode<${schema.name}FB.${schema.name}, TActor> {
  constructor(
    db: ZgDatabase,
    fbb: ${schema.name}FB.${schema.name},
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(db, fbb, authContext);
    
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const entityResolvers = target.db.config.entityResolvers?.['${schema.name}'] ?? {};
        if (prop in entityResolvers) {
          return entityResolvers[prop as keyof typeof entityResolvers]({ actor: target.authContext?.actor, db: target.db, node: target });
        }
        const globalResolvers = target.db.config.globalResolvers ?? {};
        if (prop in globalResolvers) {
          return globalResolvers[prop as keyof typeof globalResolvers]({ actor: target.authContext?.actor, db: target.db, node: target });
        }
        return Reflect.get(target, prop, receiver);
      },
      set: (target, prop, value, receiver) => {
        const schemaFields = new Set([${fieldsList}]);
        if (!schemaFields.has(prop as string)) {
          return Reflect.set(target, prop, value, receiver);
        }

        const builder = new Builder(1024);
        const data = { ${rehydrationParams} };
        
${createStrings}
        
        const entityOffset = ${schema.name}FB.${schema.name}.create${schema.name}(builder, ${createParams});
        builder.finish(entityOffset);
        const buffer = builder.asUint8Array();

        target.db.update(
          '${schema.name}',
          target.id,
          buffer
        );
        
        const newFbb = ${schema.name}FB.${schema.name}.getRootAs${schema.name}(new ByteBuffer(buffer));
        target.fbb = newFbb;

        return true;
      }
    });
  }

  // --- Fields ---
${fields}

  // --- Relationships ---
${relationships}
}`;
}

function generateDbAccessors(schema: NormalizedSchema): string {
  const schemaNameLower =
    schema.name.charAt(0).toLowerCase() + schema.name.slice(1);
  const nodeName = `${schema.name}Node<TActor>`;

  // Helper type for this specific accessor
  const resolvedNodeType = `ResolvedNode<${nodeName}, TEntityResolvers["${schema.name}"], TGlobalResolvers>`;

  const createArgs = schema.fields
    .map((f) => `${f.name}: ${mapTsType(f.type)}`)
    .join(", ");
  const createInputType = `{ ${createArgs} }`;

  const stringFields = schema.fields.filter((f) => f.type === "string");
  const otherFields = schema.fields.filter((f) => f.type !== "string");

  const createStrings = stringFields
    .map(
      (f) =>
        `    const ${f.name}Offset = data.${f.name} ? builder.createString(data.${f.name}) : 0;`
    )
    .join("\n");
  const createParams = schema.fields
    .map((f) => {
      if (f.type === "string") {
        return `${f.name}Offset`;
      }
      return `data.${f.name}`;
    })
    .join(", ");

  return `
  get ${schemaNameLower}s() {
    return {
      get: (id: string): ${resolvedNodeType} | null => {
        return this.db.get<${schema.name}FB.${schema.name}, ${nodeName}>(
          '${schema.name}',
          id,
          (db, fbb, ac) => new ${nodeName}(db, fbb, ac),
          (bb) => ${schema.name}FB.${schema.name}.getRootAs${schema.name}(bb),
          this.authContext,
        ) as ${resolvedNodeType} | null;
      },
      create: (data: ${createInputType}): ${resolvedNodeType} => {
        const builder = new Builder(1024);
        
${createStrings}
        
        const entityOffset = ${schema.name}FB.${schema.name}.create${schema.name}(builder, ${createParams});
        builder.finish(entityOffset);
        
        const buffer = builder.asUint8Array();
        
        if (!data.id || typeof data.id !== 'string') {
          throw new Error("The 'id' field is required and must be a string to create an entity.");
        }

        return this.db.create<${schema.name}FB.${schema.name}, ${nodeName}>(
          '${schema.name}',
          data.id,
          buffer,
          (db, fbb, ac) => new ${nodeName}(db, fbb, ac),
          (bb) => ${schema.name}FB.${schema.name}.getRootAs${schema.name}(bb),
          this.authContext,
        ) as ${resolvedNodeType};
      },
      update: (id: string, data: Partial<${createInputType}>): ${resolvedNodeType} => {
        // Update is more complex: it requires getting the old buffer,
        // parsing it, creating a new buffer with the merged data,
        // and then writing it back. This is a placeholder.
        throw new Error("Update is not implemented yet.");
      },
    };
  }`;
}

export function generateZgFile(
  schemas: NormalizedSchema[],
  options: GeneratorConfig["options"] = {}
): string {
  const sortedSchemas = topologicalSort(schemas);
  const importExt = options.importExtension ?? ".js";

  const schemaImports = sortedSchemas
    .map((s) => {
      return `import * as ${s.name}FB from './schema/${toKebabCase(
        s.name
      )}${importExt}';`;
    })
    .join("\n");

  const allTypes = sortedSchemas
    .map((s) => `${s.name}FB.${s.name}`)
    .join(" | ");

  const interfaces = sortedSchemas.map(generateInterface).join("\n\n");
  const nodeClasses = sortedSchemas.map(generateNodeClass).join("\n\n");
  const dbAccessors = sortedSchemas.map(generateDbAccessors).join("\n");

  return `// Generated by ZG. Do not edit.
import { ZgDatabase, ZgBaseNode, ZgAuthContext } from '@zgdb/client';
${schemaImports}
import { Builder, ByteBuffer } from 'flatbuffers';

// This is a hack. The generated schema.ts file exports all root functions,
// but we need a single entry point to look them up dynamically.
const getRootAs = (bb: ByteBuffer, identifier: string) => {
  const funcName = \`getRootAs\${identifier}\`;
  if (funcName in LowLevel) {
    return (LowLevel as any)[funcName](bb);
  }
  throw new Error(\`Invalid identifier for getRootAs: \${identifier}\`);
}

// --- Helper Types ---
type AnyZgNode = ${allTypes};
type ResolverFn = (context: any) => any;
type ResolverMap = Record<string, ResolverFn>;
type ResolvedNode<TNode, TEntityResolvers extends ResolverMap, TGlobalResolvers extends ResolverMap> = TNode & {
  [K in keyof TEntityResolvers]: ReturnType<TEntityResolvers[K]>;
} & {
  [K in keyof TGlobalResolvers]: ReturnType<TGlobalResolvers[K]>;
};

// --- Interfaces ---
${interfaces}

// --- Node Classes ---
${nodeClasses}

// --- Database Class ---
export class ZgClient<
  TActor,
  TGlobalResolvers extends ResolverMap,
  TEntityResolvers extends Record<string, ResolverMap>
> {
  private db: ZgDatabase;
  private authContext: ZgAuthContext<TActor>;

  constructor(db: ZgDatabase, authContext: ZgAuthContext<TActor>) {
    this.db = db;
    this.authContext = authContext;
  }
${dbAccessors}
}

// The main database instance, created once
class Database<
  TGlobalResolvers extends ResolverMap,
  TEntityResolvers extends Record<string, ResolverMap>
> {
  private db: ZgDatabase;

  constructor(config: {
    globalResolvers: TGlobalResolvers;
    entityResolvers: TEntityResolvers;
    auth: Record<string, any>;
  }) {
    this.db = new ZgDatabase(config);
  }

  createClient<TActor>(actor: TActor): ZgClient<TActor, TGlobalResolvers, TEntityResolvers> {
    return new ZgClient(this.db, { actor });
  }
}

export function createDB<
  TActor,
  const TGlobalResolvers extends ResolverMap,
  const TEntityResolvers extends Record<string, ResolverMap>
>(config: {
  globalResolvers: TGlobalResolvers;
  entityResolvers: TEntityResolvers;
  auth: Record<string, any>;
}): Database<TGlobalResolvers, TEntityResolvers> {
  return new Database(config);
}
`;
}

export function generateZgFileFromFlatc(
  schemaFilePath: string,
  outputDir: string
): string {
  const flatcArgs = [
    "--ts",
    "--gen-mutable",
    "--gen-all",
    "-o",
    outputDir,
    schemaFilePath,
  ];

  try {
    execSync(`flatc ${flatcArgs.join(" ")}`);
  } catch (error) {
    console.error("Error generating ZG file from flatc:", error);
    throw error;
  }

  return generateZgFileFromDirectory(outputDir);
}

export function generateZgFileFromDirectory(outputDir: string): string {
  // Implementation of generateZgFileFromDirectory
  throw new Error("Method not implemented");
}
