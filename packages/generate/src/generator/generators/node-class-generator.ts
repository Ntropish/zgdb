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

  const relationships = preprocessRelationships(schema, schemas)
    .map((rel) => {
      const relSchemaName = rel.entity;
      const relNodeName = `${relSchemaName}Node<TActor>`;
      const foreignKeyField = rel.foreignKey;
      const resolvedNodeType = `${relNodeName}`;

      if (rel.cardinality === "many") {
        return `  get ${rel.name}(): ${relNodeName}[] {
    // This is a placeholder implementation. A real implementation would use an index.
    const allNodes = Array.from(this.tx.${
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
    return this.tx.get(
      '${relSchemaName}',
       id,
       (tx, fbb, ac) => new ${relNodeName}(tx, fbb, ac),
       (bb) => ${relSchemaName}FB.${relSchemaName}.getRootAs${relSchemaName}(bb),
       this.authContext
    ) as ${resolvedNodeType} | null;
  }`;
    })
    .join("\n\n");

  const fieldsList = schema.fields.map((f) => `'${f.name}'`);

  const sortedFields = [...schema.fields].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const createParams = sortedFields
    .map((f) => {
      const fieldName = f.name;
      if (f.type === "string") {
        return `const ${fieldName}Offset = data.${fieldName} ? builder.createString(data.${fieldName}) : 0;`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n      ");

  const createArgs = sortedFields
    .map((f) => {
      return f.type === "string" ? `${f.name}Offset` : `data.${f.name}`;
    })
    .join(", ");

  return `
const ${schema.name}Schema: NodeSchema = {
  name: '${schema.name}',
  fields: [${fieldsList.join(", ")}],
  create: (builder, data) => {
      ${createParams}
      return ${schema.name}FB.${schema.name}.create${
    schema.name
  }(builder, ${createArgs});
  },
  getRootAs: (bb) => ${schema.name}FB.${schema.name}.getRootAs${
    schema.name
  }(bb),
};

export class ${schema.name}Node<TActor> extends ZgBaseNode<${schema.name}FB.${
    schema.name
  }, TActor> implements I${schema.name} {
  constructor(
    tx: ZgTransaction,
    fbb: ${schema.name}FB.${schema.name},
    authContext: ZgAuthContext<TActor> | null
  ) {
    super(tx, fbb, ${schema.name}Schema, authContext);
  }

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
