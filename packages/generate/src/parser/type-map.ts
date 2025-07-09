import { ZodTypeAny, ZodObject } from "zod";
import { NormalizedSchema } from "./types.js";
import { parseZodSchema } from "./index.js";

// A simplified mapping from Zod types to FlatBuffer scalar types.
// This can be expanded to include more complex types and logic.
const ZOD_TO_FLATBUFFER_TYPE_MAP: Record<string, string> = {
  ZodString: "string",
  ZodNumber: "long", // Defaulting to long for numbers
  ZodBoolean: "bool",
  ZodDate: "long", // Dates are often stored as UNIX timestamps
  ZodBigInt: "long", // BigInts are 64-bit integers
  ZodEnum: "string", // Enums can be represented as strings
  ZodLiteral: "string", // Literals can also be strings
  ZodUnion: "string", // Unions are complex, default to string for now
  // TODO: Add mappings for more complex types like unions, objects, etc.
};

/**
 * Recursively maps a Zod type definition to its FlatBuffer type.
 * If a nested ZodObject is found, it creates a new NormalizedSchema for it
 * and adds it to the `allSchemas` accumulator.
 *
 * @param zodType - The Zod type object.
 * @param parentName - The name of the parent object.
 * @param fieldName - The name of the field.
 * @param allSchemas - The accumulator for all discovered schemas.
 * @returns The corresponding FlatBuffer type as a string.
 */
export function mapZodToFlatBufferType(
  zodType: ZodTypeAny,
  parentName: string,
  fieldName: string,
  allSchemas: NormalizedSchema[]
): string {
  const typeName = zodType._def.typeName;

  if (typeName === "ZodArray") {
    // Recursively call for the inner type of the array
    const innerType = mapZodToFlatBufferType(
      zodType._def.type,
      parentName,
      fieldName,
      allSchemas
    );
    return `[${innerType}]`;
  }

  if (typeName === "ZodObject") {
    const newSchemaName = `${parentName}${
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    }`;

    // This is a new, nested schema that we need to define.
    const newSchema: NormalizedSchema = {
      name: newSchemaName,
      description: `Nested schema for ${fieldName} of ${parentName}`,
      fields: [], // We will populate this recursively
      relationships: [],
      manyToMany: [],
      indexes: [],
    };

    // IMPORTANT: Add the schema to the list *before* parsing its fields.
    // This prevents infinite recursion if the object refers to itself.
    allSchemas.push(newSchema);

    // Recursively parse the fields of this new schema.
    newSchema.fields = parseZodSchema(
      zodType as ZodObject<any>,
      newSchemaName,
      allSchemas
    );

    return newSchemaName;
  }

  return ZOD_TO_FLATBUFFER_TYPE_MAP[typeName] || "string"; // Default to string for primitives
}
