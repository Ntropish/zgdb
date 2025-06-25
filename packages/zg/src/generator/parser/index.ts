import {
  RawSchema,
  NormalizedSchema,
  Field,
  Relationship,
  PolymorphicRelationship,
} from "./types";
import { ZodTypeAny, ZodObject } from "zod";
import { mapZodToFlatBufferType } from "./type-map";

/**
 * Parses the Zod schema definition to extract a normalized list of fields.
 * This function is now recursive and populates a shared list of schemas.
 * @param zodSchema - The Zod schema object from a raw schema.
 * @param parentName - The name of the parent schema.
 * @param allSchemas - The accumulator for all discovered schemas.
 * @returns An array of normalized Field objects for the current schema.
 */
export function parseZodSchema(
  zodSchema: ZodObject<any>,
  parentName: string,
  allSchemas: NormalizedSchema[]
): Field[] {
  const fields: Field[] = [];
  const shape = zodSchema.shape;

  for (const fieldName in shape) {
    const originalFieldDef = shape[fieldName] as ZodTypeAny;
    let unwrappedFieldDef = originalFieldDef;

    // Handle optional and default types by unwrapping to the inner type.
    const typeName = unwrappedFieldDef._def.typeName;
    if (typeName === "ZodOptional" || typeName === "ZodDefault") {
      unwrappedFieldDef = unwrappedFieldDef._def.innerType;
    }

    const type = mapZodToFlatBufferType(
      unwrappedFieldDef,
      parentName,
      fieldName,
      allSchemas
    );

    fields.push({
      name: fieldName,
      type: type,
      // A field is required unless it's EXPLICITLY optional.
      // .default() implies a value will always be present.
      required: originalFieldDef._def.typeName !== "ZodOptional",
    });
  }

  return fields;
}

/**
 * Parses the `relationships` block of a raw schema into a normalized array.
 * @param relationships - The raw relationships object.
 * @returns An array of normalized Relationship objects.
 */
function parseRelationships(
  relationships: RawSchema["relationships"]
): (Relationship | PolymorphicRelationship)[] {
  const normalized: (Relationship | PolymorphicRelationship)[] = [];
  if (!relationships) {
    return normalized;
  }

  for (const nodeName in relationships) {
    const relGroup = relationships[nodeName];
    for (const relName in relGroup) {
      const relDef = relGroup[relName];

      // Check if the relationship is polymorphic
      if (relDef.type === "polymorphic") {
        normalized.push({
          name: relName,
          node: nodeName, // e.g., 'polymorphic'
          type: "polymorphic",
          cardinality: relDef.cardinality,
          required: relDef.required,
          description: relDef.description,
          discriminator: relDef.discriminator,
          foreignKey: relDef.foreignKey,
          references: relDef.references,
        });
      } else {
        normalized.push({
          name: relName,
          node: nodeName, // e.g., 'user', 'post'
          cardinality: relDef.cardinality,
          required: relDef.required,
          description: relDef.description,
          mappedBy: relDef.mappedBy,
        });
      }
    }
  }

  return normalized;
}

/**
 * The main parser function that transforms raw schemas into the Intermediate Representation (IR).
 * It now discovers and returns nested schemas as well.
 *
 * @param rawSchemas - An array of raw schema objects from the loader.
 * @returns An array of all normalized schema objects, including nested ones.
 */
export function parseSchemas(rawSchemas: RawSchema[]): NormalizedSchema[] {
  const allSchemas: NormalizedSchema[] = [];

  for (const rawSchema of rawSchemas) {
    // Create the top-level schema first, but its fields will be populated transitively
    // by the call to parseZodSchema.
    const topLevelSchema: NormalizedSchema = {
      name: rawSchema.name,
      description: rawSchema.description,
      fields: [], // This will be populated below
      relationships: parseRelationships(rawSchema.relationships),
      indexes: (rawSchema.indexes || []).map((index) => ({
        ...index,
        on: Array.isArray(index.on) ? index.on : [index.on],
        type: index.type || "btree",
      })),
      manyToMany: rawSchema.manyToMany,
    };

    topLevelSchema.fields = parseZodSchema(
      rawSchema.schema,
      rawSchema.name,
      allSchemas
    );

    // Add the fully-populated top-level schema to the list.
    // Any nested schemas will have already been added to allSchemas by the call above.
    allSchemas.push(topLevelSchema);
  }

  return allSchemas;
}
