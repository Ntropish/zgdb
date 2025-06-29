import { NormalizedSchema } from "../../parser/types.js";
import { IGenerator } from "./interface.js";

function generateSingleCollectionClass(schema: NormalizedSchema): string {
  if (schema.isJoinTable) {
    return "";
  }

  const collectionName = `${schema.name}Collection<TActor>`;
  const createInputName = `Create${schema.name}Input`;
  const nodeName = `${schema.name}Node<TActor>`;
  const fbsNodeName = `${schema.name}FB.${schema.name}`;
  const fbsRootGetter = `getRootAs${schema.name}`;

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

  const startVector = (fieldName: string, num: string) =>
    `${fbsNodeName}.start${
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    }Vector(builder, ${num});`;

  const createListVectors = sortedFields
    .filter((f) => f.isVector && f.type !== "string") // Assuming string arrays are handled differently or not at all for now
    .map((f) => {
      const fieldName = f.name;
      const count = `data.${fieldName}?.length ?? 0`;
      return `    ${startVector(fieldName, count)}
    for (const item of (data.${fieldName} ?? []).reverse()) {
      // numbers are added directly, other types might need builder offsets
      builder.add${f.type.charAt(0).toUpperCase() + f.type.slice(1)}(item);
    }
    const ${fieldName}VectorOffset = builder.endVector();`;
    })
    .join("\n\n");

  const addFields = sortedFields
    .map((f, index) => {
      const capName = f.name.charAt(0).toUpperCase() + f.name.slice(1);
      const param = f.isVector
        ? `${f.name}VectorOffset`
        : f.type === "string"
        ? `${f.name}Offset`
        : `data.${f.name}`;

      const defaultValue = f.type === "string" || f.isVector ? "0" : "null";
      return `${fbsNodeName}.add${capName}(builder, ${param} ?? ${defaultValue});`;
    })
    .join("\n    ");

  return `export class ${collectionName} {
    constructor(
      private db: ZgDatabase,
      private authContext: ZgAuthContext<TActor> | null
    ) {}

    get collectionName(): string {
      return '${schema.name}';
    }

    create(data: ${createInputName}): ${nodeName} {
      const builder = new Builder(1024);
      
      ${createStrings}
      ${createListVectors}

      ${fbsNodeName}.start${schema.name}(builder);
      
      ${addFields}

      const entityOffset = ${fbsNodeName}.end${schema.name}(builder);
      
      builder.finish(entityOffset);
      const buffer = builder.asUint8Array();

      this.db.insert(this.collectionName, data.id, buffer);

      const fbb = ${fbsNodeName}.${fbsRootGetter}(new ByteBuffer(buffer));

      return new ${nodeName}(
        this.db,
        fbb,
        this.authContext,
      );
    }

    *[Symbol.iterator](): Generator<${nodeName}> {
      for (const [id, buffer] of this.db.scan(this.collectionName)) {
        const fbb = ${fbsNodeName}.${fbsRootGetter}(new ByteBuffer(buffer));
        yield new ${nodeName}(
          this.db,
          fbb,
          this.authContext,
        );
      }
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
