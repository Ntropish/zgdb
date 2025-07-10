import { NormalizedSchema } from "../../parser/types.js";
import { IGenerator } from "./interface.js";
import { mapTsType } from "../utils.js";

function generateSingleCollectionClass(schema: NormalizedSchema): string {
  if (schema.isJoinTable || schema.isNested) {
    return "";
  }

  const schemaName = schema.name;
  const nodeName = `${schemaName}Node<TActor>`;
  const fbsName = `${schemaName}FB.${schemaName}`;
  const createInputType = `Create${schemaName}Input`;

  const sortedFields = [...schema.fields].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const createParams = sortedFields
    .map((f) => {
      const fieldName = f.name;
      if (f.type === "string") {
        return `    const ${fieldName}Offset = data.${fieldName} ? builder.createString(data.${fieldName}) : 0;`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  const addMethods = sortedFields
    .map((f) => {
      const capitalizedFieldName =
        f.name.charAt(0).toUpperCase() + f.name.slice(1);
      if (f.type === "string") {
        return `    ${fbsName}.add${capitalizedFieldName}(builder, ${f.name}Offset);`;
      }
      if (f.type === "long") {
        return `    ${fbsName}.add${capitalizedFieldName}(builder, data.${f.name});`;
      }
      return `    ${fbsName}.add${capitalizedFieldName}(builder, data.${f.name});`;
    })
    .join("\n");

  return `
export class ${schemaName}Collection<TActor> extends ZgCollection<${fbsName}, ${nodeName}> {
  add(data: ${createInputType} & { id: string }): ${nodeName} {
    const builder = new Builder(1024);
${createParams}

    ${fbsName}.start${schemaName}(builder);
${addMethods}
    const entityOffset = ${fbsName}.end${schemaName}(builder);

    builder.finish(entityOffset);
    const buffer = builder.asUint8Array();

    this['tx'].put('${schemaName}', data.id, buffer);

    const fbb = ${fbsName}.getRootAs${schemaName}(new ByteBuffer(buffer));

    return new ${nodeName}(this['tx'], fbb, this['authContext']);
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
