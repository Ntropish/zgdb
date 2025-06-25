import { ZodTypeAny } from "zod";

// A simplified mapping from Zod types to FlatBuffer scalar types.
// This can be expanded to include more complex types and logic.
const ZOD_TO_FLATBUFFER_TYPE_MAP: Record<string, string> = {
  ZodString: "string",
  ZodNumber: "long", // Defaulting to long for numbers
  ZodBoolean: "bool",
  ZodDate: "long", // Dates are often stored as UNIX timestamps
  ZodEnum: "string", // Enums can be represented as strings
  ZodLiteral: "string", // Literals can also be strings
  ZodUnion: "string", // Unions are complex, default to string for now
  // TODO: Add mappings for more complex types like unions, objects, etc.
};

/**
 * Maps a Zod type definition to its corresponding FlatBuffer type.
 *
 * @param zodDef - The Zod type definition object.
 * @param parentName - The name of the parent object.
 * @param fieldName - The name of the field.
 * @returns The corresponding FlatBuffer type as a string.
 */
export function mapZodToFlatBufferType(
  zodDef: ZodTypeAny["_def"],
  parentName: string,
  fieldName: string
): string {
  const typeName = zodDef.typeName;

  if (typeName === "ZodArray") {
    const innerType = mapZodToFlatBufferType(
      zodDef.type._def,
      parentName,
      fieldName
    );
    return `[${innerType}]`;
  }

  if (typeName === "ZodObject") {
    // For nested objects, we generate a new table name based on the parent and field name.
    // e.g., User + metadata -> User_Metadata
    return `${parentName}_${
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    }`;
  }

  return ZOD_TO_FLATBUFFER_TYPE_MAP[typeName] || "string"; // Default to string
}
