import { NormalizedSchema } from "../../parser/types.js";
import { IGenerator } from "./interface.js";

function generateSingleCollectionClass(schema: NormalizedSchema): string {
  if (schema.isJoinTable) {
    return "";
  }

  const collectionName = `${schema.name}Collection<TActor>`;
  const createInputName = `${schema.name}CreateInput`;
  const nodeName = `${schema.name}Node<TActor>`;
  const fbsNodeName = `${schema.name}FB.${schema.name}`;
  const fbsRootGetter = `getRootAs${schema.name}`;

  const sortedFields = [...schema.fields].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const createStrings = sortedFields
    .filter((f) => f.type === "string" && !f.isVector)
    .map(
      (f) =>
        `    const ${f.name}Offset = data.${f.name} ? builder.createString(data.${f.name}) : 0;`
    )
    .join("\n");

  const createVectorStrings = sortedFields
    .filter((f) => f.type === "string" && f.isVector)
    .map((f) => {
      const fieldName = f.name;
      const upperFieldName =
        fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      return `    const ${fieldName}VectorOffset = ${fbsNodeName}.create${upperFieldName}Vector(builder, (data.${fieldName} ?? []).map(s => builder.createString(s)));`;
    })
    .join("\n");

  const createListVectors = sortedFields
    .filter((f) => f.isVector && f.type !== "string")
    .map((f) => {
      const fieldName = f.name;
      const upperFieldName =
        fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      const count = `data.${fieldName}?.length ?? 0`;
      `${fbsNodeName}.start${upperFieldName}Vector(builder, ${count});`;
      return `    ${fbsNodeName}.start${upperFieldName}Vector(builder, ${count});
    for (const item of (data.${fieldName} ?? []).reverse()) {
      // numbers are added directly, other types might need builder offsets
      builder.add${f.type.charAt(0).toUpperCase() + f.type.slice(1)}(item);
    }
    const ${fieldName}VectorOffset = builder.endVector();`;
    })
    .join("\n\n");

  const addFields = sortedFields
    .map((f) => {
      const capName = f.name.charAt(0).toUpperCase() + f.name.slice(1);
      if (f.isVector) {
        return `${fbsNodeName}.add${capName}(builder, ${f.name}VectorOffset);`;
      }
      if (f.type === "string") {
        return `${fbsNodeName}.add${capName}(builder, ${f.name}Offset);`;
      }
      return `${fbsNodeName}.add${capName}(builder, data.${f.name});`;
    })
    .join("\n    ");

  return `export class ${collectionName} extends EntityCollection<${fbsNodeName}, ${nodeName}> {
    add(data: ${createInputName}): ${nodeName} {
      const builder = new Builder(1024);
      
      ${createStrings}
      ${createVectorStrings}
      ${createListVectors}

      ${fbsNodeName}.start${schema.name}(builder);
      
      ${addFields}

      const entityOffset = ${fbsNodeName}.end${schema.name}(builder);
      
      builder.finish(entityOffset);
      const buffer = builder.asUint8Array();

      this['tx'].put('${schema.name}', data.id, buffer);

      const fbb = ${fbsNodeName}.${fbsRootGetter}(new ByteBuffer(buffer));

      return new ${nodeName}(this['tx'], fbb, this['authContext']);
    }
  }`;
}

export class CollectionClassGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const classes = schemas
      .map((s) => generateSingleCollectionClass(s))
      .filter(Boolean)
      .join("\n\n");

    return `// --- Collection Classes ---\n${classes}`;
  }
}
