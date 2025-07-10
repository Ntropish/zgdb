import {
  NormalizedSchema,
  Field,
  Relationship,
  PolymorphicRelationship,
} from "../../parser/types.js";
import { IGenerator } from "./interface.js";
import { mapTsType } from "../utils.js";

const toPascalCase = (str: string) => {
  if (!str) return "";
  return str
    .replace(/_(\w)/g, (s) => s[1].toUpperCase())
    .replace(/^\w/, (s) => s.toUpperCase());
};

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
  if (!schema.relationships) {
    return [];
  }
  const relationships = schema.relationships;

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
        const remotePolyRel = remoteRel as any; // PolymorphicRelationship;
        remoteFk = remotePolyRel.foreignKey;
      } else if (remoteRel.type === "standard") {
        const remoteStandardRel = remoteRel as any; // Relationship;
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
  if (schema.isJoinTable || schema.isNested) {
    return "";
  }

  const propertyDeclarations = schema.fields
    .filter((f) => f.name !== "id")
    .map((f) => `  declare public ${f.name}: ${mapTsType(f.type)};`)
    .join("\n");

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
       (tx, fbb: ${relSchemaName}FB.${relSchemaName}, ac) => new ${relNodeName}(tx as ZgTransactionWithCollections<TActor>, fbb, ac),
       (bb) => ${relSchemaName}FB.${relSchemaName}.getRootAs${relSchemaName}(bb),
       this.authContext
    ) as ${resolvedNodeType} | null;
  }`;
    })
    .join("\n\n");

  const fieldsList = schema.fields.map((f: Field) => `'${f.name}'`);

  const sortedFields = [...schema.fields].sort((a: Field, b: Field) =>
    a.name.localeCompare(b.name)
  );

  const createParams = sortedFields
    .map((f: Field) => {
      const fieldName = f.name;
      const nestedSchema = schemas.find(
        (s: NormalizedSchema) => s.name === f.type && s.isNested
      );
      if (nestedSchema) {
        const nestedFields = nestedSchema.fields
          .map((nf: Field) => {
            if (nf.type === "string") {
              return {
                fieldName: nf.name,
                offsetName: `${nf.name}Offset`,
                paramDef: `const ${nf.name}Offset = data.${fieldName}.${nf.name} ? builder.createString(data.${fieldName}.${nf.name}) : 0;`,
              };
            }
            return null;
          })
          .filter(Boolean) as {
          fieldName: string;
          offsetName: string;
          paramDef: string;
        }[];

        const paramDefs = nestedFields
          .map((nf) => nf.paramDef)
          .join("\n        ");

        const addCalls = nestedSchema.fields
          .map((ff: Field) => {
            const fieldData = nestedFields.find(
              (nf) => nf.fieldName === ff.name
            );
            if (!fieldData) return null; // Should not happen
            if (ff.type === "long") {
              return `${nestedSchema.name}FB.${
                nestedSchema.name
              }.add${toPascalCase(ff.name)}(builder, BigInt(data.${f.name}.${
                ff.name
              } || 0))`;
            }
            return `${nestedSchema.name}FB.${
              nestedSchema.name
            }.add${toPascalCase(ff.name)}(builder, ${fieldData.offsetName});`;
          })
          .join("\n        ");

        return `const ${fieldName}Offset = (() => {
        ${paramDefs}
        ${nestedSchema.name}FB.${nestedSchema.name}.start${nestedSchema.name}(builder);
        ${addCalls}
        return ${nestedSchema.name}FB.${nestedSchema.name}.end${nestedSchema.name}(builder);
      })();`;
      }
      if (f.type === "string") {
        return `const ${f.name}Offset = data.${f.name} ? builder.createString(data.${f.name}) : 0;`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n      ");

  const addCalls = sortedFields
    .map((f: Field) => {
      const nestedSchema = schemas.find((s) => s.name === f.type && s.isNested);
      if (f.type === "string" || nestedSchema) {
        return `${schema.name}FB.${schema.name}.add${toPascalCase(
          f.name
        )}(builder, ${f.name}Offset);`;
      }
      if (f.type === "long") {
        return `${schema.name}FB.${schema.name}.add${toPascalCase(
          f.name
        )}(builder, BigInt(data.${f.name} || 0));`;
      }
      return `${schema.name}FB.${schema.name}.add${toPascalCase(
        f.name
      )}(builder, data.${f.name});`;
    })
    .join("\n      ");

  const createMethod = `create: (builder, data) => {
      ${createParams}
      ${schema.name}FB.${schema.name}.start${schema.name}(builder);
      ${addCalls}
      const entityOffset = ${schema.name}FB.${schema.name}.end${schema.name}(builder);
      return entityOffset;
   },`;

  return `
const ${schema.name}Schema: NodeSchema = {
  name: '${schema.name}',
  fields: [${fieldsList.join(", ")}],
  ${createMethod}
  getRootAs: (bb) => ${schema.name}FB.${schema.name}.getRootAs${
    schema.name
  }(bb),
};

export class ${schema.name}Node<TActor> extends ZgBaseNode<
  ${schema.name}FB.${schema.name},
  ZgTransactionWithCollections<TActor>,
  TActor
> implements I${schema.name} {
${propertyDeclarations}

  constructor(
    tx: ZgTransactionWithCollections<TActor>,
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
      .map((s: NormalizedSchema) => generateSingleNodeClass(s, schemas))
      .filter(Boolean)
      .join("\n\n\n");
    return `// --- Node Classes ---\n${classes}`;
  }
}
