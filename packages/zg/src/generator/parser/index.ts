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
 * @param zodSchema - The Zod schema object from a raw schema.
 * @returns An array of normalized Field objects.
 */
function parseZodSchema(
  zodSchema: ZodObject<any>,
  parentName: string
): Field[] {
  const fields: Field[] = [];
  const shape = zodSchema.shape;

  for (const fieldName in shape) {
    const originalFieldDef = shape[fieldName] as ZodTypeAny;
    let unwrappedFieldDef = originalFieldDef;

    // Handle optional types by unwrapping to the inner type to get the correct type name.
    if (unwrappedFieldDef._def.typeName === "ZodOptional") {
      unwrappedFieldDef = unwrappedFieldDef._def.innerType;
    }

    const type = mapZodToFlatBufferType(
      unwrappedFieldDef._def,
      parentName,
      fieldName
    );

    fields.push({
      name: fieldName,
      type: type,
      // `isOptional` must be called on the original definition, before unwrapping.
      required: !originalFieldDef.isOptional(),
      // description is not available on the zod object directly in this form
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
 *
 * @param rawSchemas - An array of raw schema objects from the loader.
 * @returns An array of normalized schema objects.
 */
export function parseSchemas(rawSchemas: RawSchema[]): NormalizedSchema[] {
  const normalizedSchemas: NormalizedSchema[] = [];

  for (const rawSchema of rawSchemas) {
    const fields = parseZodSchema(rawSchema.schema, rawSchema.name);
    const relationships = parseRelationships(rawSchema.relationships);

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
