import { IGenerator } from "./interface.js";
import { NormalizedSchema, Field } from "../../parser/types.js";

function getFieldCreateValue(field: Field): string {
  if (field.type === "long") {
    // Dates are passed as numbers, need to convert to BigInt for FlatBuffers
    return `BigInt(data.${field.name} ?? 0)`;
  }
  if (field.type === "string") {
    return `${field.name}Offset`;
  }
  return `data.${field.name}`;
}

function generateSingleCollectionClass(schema: NormalizedSchema): string {
  if (schema.isJoinTable) {
    return "";
  }

  const nodeName = `${schema.name}Node<TActor>`;
  const createInputType = `${schema.name}CreateInput`;

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

  const createParams = sortedFields.map(getFieldCreateValue).join(", ");

  return `
export class ${schema.name}Collection<TActor> extends EntityCollection<${nodeName}> {

  create(data: ${createInputType}): ${nodeName} {
    const builder = new Builder(1024);
    
${createStrings}
    
    const entityOffset = ${schema.name}FB.${schema.name}.create${schema.name}(builder, ${createParams});
    builder.finish(entityOffset);
    
    const buffer = builder.asUint8Array();
    
    if (!data.id || typeof data.id !== 'string') {
      throw new Error("The 'id' field is required and must be a string to create an entity.");
    }

    return this.db.create(
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

export class CollectionClassGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const classes = schemas
      .map(generateSingleCollectionClass)
      .filter(Boolean)
      .join("\n\n");
    return `// --- Collection Classes ---\n${classes}`;
  }
}
