import {
  RawSchema,
  NormalizedSchema,
  Field,
  Relationship,
  PolymorphicRelationship,
  ManyToManyRelationship,
} from "./types.js";
import { ZodTypeAny, ZodObject } from "zod";
import { mapZodToFlatBufferType } from "./type-map.js";

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
 * @returns An object containing arrays of normalized relationships.
 */
function parseAllRelationships(relationships: RawSchema["relationships"]): {
  standard: (Relationship | PolymorphicRelationship)[];
  manyToMany: ManyToManyRelationship[];
} {
  const standard: (Relationship | PolymorphicRelationship)[] = [];
  const manyToMany: ManyToManyRelationship[] = [];

  if (!relationships) {
    return { standard, manyToMany };
  }

  for (const nodeName in relationships) {
    const relGroup = relationships[nodeName];

    // Handle the special 'many-to-many' block
    if (nodeName === "many-to-many") {
      for (const relName in relGroup) {
        const relDef = relGroup[relName];
        manyToMany.push({
          name: relName,
          node: relDef.node,
          through: relDef.through,
          myKey: relDef.myKey,
          theirKey: relDef.theirKey,
          description: relDef.description,
        });
      }
      continue; // Move to the next block
    }

    for (const relName in relGroup) {
      const relDef = relGroup[relName];

      if (relDef.type === "polymorphic") {
        standard.push({
          name: relName,
          node: "polymorphic", // nodeName is 'polymorphic' here
          type: "polymorphic",
          cardinality: relDef.cardinality,
          required: relDef.required,
          description: relDef.description,
          discriminator: relDef.discriminator,
          foreignKey: relDef.foreignKey,
          references: relDef.references,
        });
      } else {
        standard.push({
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

  return { standard, manyToMany };
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
    const { standard, manyToMany } = parseAllRelationships(
      rawSchema.relationships
    );

    const topLevelSchema: NormalizedSchema = {
      name: rawSchema.name,
      description: rawSchema.description,
      fields: [], // This will be populated below
      relationships: standard,
      manyToMany: manyToMany,
      indexes: (rawSchema.indexes || []).map((index) => ({
        ...index,
        on: Array.isArray(index.on) ? index.on : [index.on],
        type: index.type || "btree",
      })),
      auth: rawSchema.auth || {},
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

  // Final pass: resolve one-to-many relationships
  for (const schema of allSchemas) {
    for (const rel of schema.relationships) {
      if (rel.mappedBy) {
        const targetSchema = allSchemas.find((s) => s.name === rel.node);
        if (!targetSchema) {
          throw new Error(
            `Could not find target schema '${rel.node}' for relationship '${rel.name}' on schema '${schema.name}'.`
          );
        }

        const targetRelation = targetSchema.relationships.find(
          (r) => r.name === rel.mappedBy
        );

        if (!targetRelation) {
          throw new Error(
            `Could not find 'mappedBy' relation '${rel.mappedBy}' on target schema '${rel.node}'.`
          );
        }

        rel.targetField = rel.mappedBy;
      }
    }
  }

  return allSchemas;
}
