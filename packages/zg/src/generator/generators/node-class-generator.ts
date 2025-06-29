import {
  NormalizedSchema,
  Relationship,
  PolymorphicRelationship,
} from "../../parser/types.js";
import { IGenerator } from "./interface.js";
import { mapTsType } from "../utils.js";

type ProcessedRelationship = {
  name: string;
  entity: string;
  cardinality: "one" | "many";
  foreignKey: string;
};

function isStandardRelationship(
  rel: Relationship | PolymorphicRelationship
): rel is Relationship & { type: "standard"; entity: string } {
  return rel.type === "standard" && typeof rel.entity === "string";
}

function preprocessRelationships(
  schema: NormalizedSchema,
  allSchemas: NormalizedSchema[]
): ProcessedRelationship[] {
  const processed: ProcessedRelationship[] = [];
  const relationships = schema.relationships ?? [];

  for (const rel of relationships) {
    if (!isStandardRelationship(rel)) {
      continue;
    }

    if (rel.cardinality === "one") {
      processed.push({
        ...rel,
        foreignKey: rel.field ?? `${rel.name}Id`,
      });
    } else {
      // 'many' cardinality
      const remoteSchema = allSchemas.find((s) => s.name === rel.entity);
      if (!remoteSchema)
        throw new Error(`Schema not found for relationship: ${rel.entity}`);

      const remoteRel = (remoteSchema.relationships ?? []).find(
        (r) => r.name === rel.mappedBy
      );

      if (!remoteRel)
        throw new Error(
          `Could not find reverse relationship for ${schema.name}.${rel.name}`
        );

      let remoteFk: string | undefined;
      if (remoteRel.type === "polymorphic") {
        const remotePolyRel = remoteRel as PolymorphicRelationship;
        remoteFk = remotePolyRel.foreignKey;
      } else if (remoteRel.type === "standard") {
        const remoteStandardRel = remoteRel as Relationship;
        remoteFk = remoteStandardRel.field ?? `${remoteStandardRel.name}Id`;
      }

      if (!remoteFk)
        throw new Error(
          `Could not determine foreign key for reverse relationship ${remoteSchema.name}.${remoteRel.name}`
        );
      processed.push({ ...rel, foreignKey: remoteFk });
    }
  }
  return processed;
}

function generateSingleNodeClass(
  schema: NormalizedSchema,
  schemas: NormalizedSchema[]
): string {
  if (schema.isJoinTable) {
    return "";
  }
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

  const relationships = preprocessRelationships(schema, schemas)
    .map((rel) => {
      const relSchemaName = rel.entity;
      const relNodeName = `${relSchemaName}Node<TActor>`;
      const foreignKeyField = rel.foreignKey;
      const resolvedNodeType = `${relNodeName}`;

      if (rel.cardinality === "many") {
        return `  get ${rel.name}(): ${relNodeName}[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.db.${
      rel.entity.charAt(0).toLowerCase() + rel.entity.slice(1)
    }s);
    // TODO: This is inefficient. We should use an index.
    return allNodes.filter(n => {
      const remoteNode = n as any;
      const fkValue = remoteNode.fbb.${foreignKeyField}();
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

  const sortedFields = [...schema.fields].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const rehydrationParams = sortedFields
    .map((f) => {
      const accessor = `target.fbb.${f.name}()`;
      return `${f.name}: (prop === '${f.name}') ? value : ${accessor}`;
    })
    .join(", ");

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

export class NodeClassGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const classes = schemas
      .map((s) => generateSingleNodeClass(s, schemas))
      .filter(Boolean)
      .join("\n\n");
    return `// --- Node Classes ---\n${classes}`;
  }
}
