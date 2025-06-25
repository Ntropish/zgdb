import { RawSchema, NormalizedSchema, Field, Relationship } from "./types";
import { ZodTypeAny, ZodObject } from "zod";

/**
 * Parses the Zod schema definition to extract a normalized list of fields.
 * @param zodSchema - The Zod schema object from a raw schema.
 * @returns An array of normalized Field objects.
 */
function parseZodSchema(zodSchema: ZodObject<any>): Field[] {
  const fields: Field[] = [];
  const shape = zodSchema.shape;

  for (const fieldName in shape) {
    const fieldDef = shape[fieldName] as ZodTypeAny;
    const typeName = fieldDef._def.typeName;

    // TODO: Add more robust type mapping
    let type = "string";
    if (typeName === "ZodNumber") {
      type = "number";
    } else if (typeName === "ZodDate") {
      type = "date";
    } else if (typeName === "ZodBoolean") {
      type = "boolean";
    }

    fields.push({
      name: fieldName,
      type: type,
      required: !fieldDef.isOptional(),
      // description is not available on the zod object directly in this form
    });
  }

  return fields;
}

/**
 * The main parser function that transforms raw schemas into the Intermediate Representation (IR).
 *
 * @param rawSchemas - An array of raw schema objects from the loader.
 * @returns An array of normalized schema objects.
 */
export function parseSchemas(rawSchemas: RawSchema[]): NormalizedSchema[] {
  const normalizedSchemas: NormalizedSchema[] = [];

  for (const rawSchema of rawSchemas) {
    const fields = parseZodSchema(rawSchema.schema);

    // TODO: Implement relationship parsing
    const relationships: Relationship[] = [];

    normalizedSchemas.push({
      name: rawSchema.name,
      description: rawSchema.description,
      fields,
      relationships,
      indexes: rawSchema.indexes || [],
      manyToMany: rawSchema.manyToMany,
    });
  }

  return normalizedSchemas;
}
