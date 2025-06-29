import { NormalizedSchema, Relationship } from "../parser/types.js";
import { topologicalSort } from "./topological-sort.js";
import { execSync } from "child_process";
import { GeneratorConfig } from "./types.js";

const asArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

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
      // Flatbuffers returns null for string fields that are not set.
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
      const resolvedNodeType = `ResolvedNode<${relNodeName}, TEntityResolvers["${relSchemaName}"], TGlobalResolvers>`;
      return `  get ${rel.name}(): ${resolvedNodeType} | null {
    const id = this.fbb.${foreignKeyField}();
    if (!id) {
      return null;
    }
    // This assumes the generator will correctly pass down the full TEntityResolvers and TGlobalResolvers types
    return this.db.get<LowLevel.${relSchemaName}, ${relNodeName}>(
      '${relSchemaName}',
      id,
      (db, fbb, ac) => new ${relNodeName}(db, fbb, ac),
      (bb) => LowLevel.${relSchemaName}.getRootAs${relSchemaName}(bb),
      this.authContext
    ) as ${resolvedNodeType} | null;
  }`;
    })
    .join("\n\n");

  return `export class ${schema.name}Node<TActor> extends ZgBaseNode<LowLevel.${schema.name}, TActor> {
  constructor(
    db: ZgDatabase,
    fbb: LowLevel.${schema.name},
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(db, fbb, authContext);
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
      (f) => `    const ${f.name}Offset = builder.createString(data.${f.name});`
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
        return this.db.get<LowLevel.${schema.name}, ${nodeName}>(
          '${schema.name}',
          id,
          (db, fbb, ac) => new ${nodeName}(db, fbb, ac),
          (bb) => LowLevel.${schema.name}.getRootAs${schema.name}(bb),
          this.authContext,
        ) as ${resolvedNodeType} | null;
      },
      create: (data: ${createInputType}): ${resolvedNodeType} => {
        const builder = new Builder(1024);
        
${createStrings}
        
        const entityOffset = LowLevel.${schema.name}.create${schema.name}(builder, ${createParams});
        builder.finish(entityOffset);
        
        const buffer = builder.asUint8Array();
        
        if (!data.id || typeof data.id !== 'string') {
          throw new Error("The 'id' field is required and must be a string to create an entity.");
        }

        return this.db.create<LowLevel.${schema.name}, ${nodeName}>(
          '${schema.name}',
          data.id,
          buffer,
          (db, fbb, ac) => new ${nodeName}(db, fbb, ac),
          (bb) => LowLevel.${schema.name}.getRootAs${schema.name}(bb),
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

  const interfaces = sortedSchemas.map(generateInterface).join("\n\n");
  const nodeClasses = sortedSchemas.map(generateNodeClass).join("\n\n");
  const dbAccessors = sortedSchemas.map(generateDbAccessors).join("\n");
  const importExt = options.importExtension ?? ".js";

  return `// Generated by ZG. Do not edit.
import { ZgDatabase, ZgBaseNode, ZgAuthContext } from '@zgdb/client';
import * as LowLevel from './schema${importExt}';
import { Builder, ByteBuffer } from 'flatbuffers';

// --- Helper Types ---
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
