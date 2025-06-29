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

function generateNodeClass(
  schema: NormalizedSchema,
  schemas: NormalizedSchema[]
): string {
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
    .flatMap((rel) => {
      if (rel.type === "polymorphic") {
        return [];
      }
      const relSchemaName = rel.node;
      const relNodeName = `${relSchemaName}Node<TActor>`;
      const foreignKeyField = rel.foreignKey ?? `${rel.name}Id`;
      const resolvedNodeType = `${relNodeName}`;

      if (rel.cardinality === "many") {
        // Find the foreign key on the 'many' side of the relationship
        const remoteSchema = schemas.find((s) => s.name === rel.node);
        if (!remoteSchema)
          throw new Error(`Schema not found for relationship: ${rel.node}`);

        // Find the reverse relationship definition
        const remoteRel = remoteSchema.relationships?.find(
          (r) => r.name === rel.mappedBy
        );
        if (!remoteRel)
          throw new Error(
            `Could not find reverse relationship for ${schema.name}.${rel.name}`
          );

        let remoteFk: string | undefined;
        if (remoteRel.type === "polymorphic") {
          remoteFk = remoteRel.foreignKey;
        } else {
          remoteFk = remoteRel.foreignKey ?? `${remoteRel.name}Id`;
        }

        if (!remoteFk) {
          throw new Error(
            `Could not determine foreign key for reverse relationship ${remoteSchema.name}.${remoteRel.name}`
          );
        }

        return `  get ${rel.name}(): ${relNodeName}[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.db.${
      rel.node.charAt(0).toLowerCase() + rel.node.slice(1)
    }s);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any; // ZgBaseNode<any, TActor>
      const fkValue = remoteNode.fbb.${remoteFk}();
      return fkValue === this.id;
    });
  }`;
      }

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

function generateCollectionClass(schema: NormalizedSchema): string {
  if (schema.isJoinTable) return "";
  const nodeName = `${schema.name}Node<TActor>`;
  const createInputType = `${schema.name}CreateInput`;

  // Ensure fields are sorted alphabetically to match the FBS file order
  const sortedFields = [...schema.fields].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const createStrings = sortedFields
    .filter((f) => f.type === "string")
    .map(
      (f) =>
        `    const ${f.name}Offset = data.${f.name} ? builder.createString(data.${f.name}) : 0;`
    )
    .join("\n");

  const createParams = sortedFields
    .map((f) => {
      if (f.type === "string") {
        return `${f.name}Offset`;
      }
      return `data.${f.name}`;
    })
    .join(", ");

  return `
export class ${schema.name}Collection<TActor> extends EntityCollection<${schema.name}FB.${schema.name}, ${nodeName}> {
  constructor(
    db: ZgDatabase,
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(
      db,
      '${schema.name}',
      (db, fbb, ac) => new ${nodeName}(db, fbb, ac),
      (bb) => ${schema.name}FB.${schema.name}.getRootAs${schema.name}(bb),
      authContext
    );
  }

  create(data: ${createInputType}): ${nodeName} {
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
      this.nodeFactory,
      this.getRootAs,
      this.authContext,
    );
  }
}
`;
}

export function generateZgFile(
  schemas: NormalizedSchema[],
  options: GeneratorConfig["options"] = {}
): string {
  const sortedSchemas = topologicalSort(schemas);
  const importExt = options.importExtension ?? ".js";

  const schemaImports = sortedSchemas
    .map((s) => {
      // Don't generate imports for join tables
      if (s.isJoinTable) {
        return null;
      }
      return `import * as ${s.name}FB from './schema/${toKebabCase(
        s.name
      )}${importExt}';`;
    })
    .filter(Boolean)
    .join("\n");

  const allTypes = sortedSchemas
    .map((s) => `${s.name}FB.${s.name}`)
    .join(" | ");

  const interfaces = sortedSchemas
    .map((s) => (s.isJoinTable ? "" : generateInterface(s)))
    .join("\n\n");
  const nodeClasses = sortedSchemas
    .map((s) => (s.isJoinTable ? "" : generateNodeClass(s, sortedSchemas)))
    .join("\n\n");

  const collectionClasses = sortedSchemas
    .map(generateCollectionClass)
    .join("\n\n");

  const createInputTypes = sortedSchemas
    .map((s) => {
      if (s.isJoinTable) return "";
      const createArgs = s.fields
        .map((f) => `${f.name}: ${mapTsType(f.type)}`)
        .join(", ");
      return `export type ${s.name}CreateInput = { ${createArgs} };`;
    })
    .join("\n");

  const resolverTypes = `
export type TEntityResolvers = {
${sortedSchemas
  .map(
    (s) => `  ${s.name}?: any; // Define your entity-specific resolvers here`
  )
  .join("\n")}
};
export type TGlobalResolvers = any; // Define your global resolvers here
`;

  const clientProperties = sortedSchemas
    .map((s) => {
      if (s.isJoinTable) return "";
      const schemaNameLower = s.name.charAt(0).toLowerCase() + s.name.slice(1);
      return `  public readonly ${schemaNameLower}s: ${s.name}Collection<TActor>;`;
    })
    .join("\n");

  const clientConstructorAssignments = sortedSchemas
    .map((s) => {
      if (s.isJoinTable) return "";
      const schemaNameLower = s.name.charAt(0).toLowerCase() + s.name.slice(1);
      return `    this.${schemaNameLower}s = new ${s.name}Collection<TActor>(this.db, this.authContext);`;
    })
    .join("\n");

  const fullFile = `// @ts-nocheck
// This file is generated by @zgdb/zg. Do not edit it manually.
// TODO: Generate based on the user's config
import { ZgDatabase, ZgBaseNode, ZgAuthContext, EntityCollection } from '@zgdb/client';
import { Builder, ByteBuffer } from 'flatbuffers';
${schemaImports}

// --- Create Input Types ---
${createInputTypes}

// --- Interfaces ---
${interfaces}

// --- Node Classes ---
${nodeClasses}

// --- Collection Classes ---
${collectionClasses}

// --- Resolver Types ---
${resolverTypes}

// --- Client Class ---
export class ZgClient<TActor = any, TEntityResolvers extends TEntityResolvers = {}, TGlobalResolvers extends TGlobalResolvers = {}> {
  public db: ZgDatabase;
  private authContext: ZgAuthContext<TActor> | null = null;
  public config: any;

  ${clientProperties}

  constructor(options?: any, db?: ZgDatabase) {
    this.config = options ?? {};
    this.db = db || new ZgDatabase(this.config);

${clientConstructorAssignments}
  }

  public with(actor: TActor): ZgClient<TActor, TEntityResolvers, TGlobalResolvers> {
    const newClient = new ZgClient<TActor, TEntityResolvers, TGlobalResolvers>(this.config, this.db);
    newClient.authContext = { actor };
    // Re-initialize collections with the new auth context
${sortedSchemas
  .map((s) => {
    if (s.isJoinTable) return "";
    const schemaNameLower = s.name.charAt(0).toLowerCase() + s.name.slice(1);
    return `    newClient.${schemaNameLower}s = new ${s.name}Collection<TActor>(
      newClient.db,
      newClient.authContext,
    );`;
  })
  .join("\n")}
    return newClient;
  }
}

// --- createDB ---
export function createDB<TActor = any, TEntityResolvers extends TEntityResolvers = {}, TGlobalResolvers extends TGlobalResolvers = {}>(options?: any): ZgClient<TActor, TEntityResolvers, TGlobalResolvers> {
  return new ZgClient<TActor, TEntityResolvers, TGlobalResolvers>(options);
}
`;
  return fullFile;
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
