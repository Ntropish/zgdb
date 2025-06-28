import {
  EntityDef,
  NormalizedSchema,
  Field,
  Relationship,
  PolymorphicRelationship,
  ManyToManyRelationship,
  AuthBlock,
  SchemaConfig,
  IndexDef,
  Index,
  PolymorphicRelationshipDef,
  StandardRelationshipDef,
  Resolver,
  InferredResolvers,
} from "./types.js";
import { ZodTypeAny, ZodObject } from "zod";
import { mapZodToFlatBufferType } from "./type-map.js";

const asArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

/**
 * Parses and validates the `indexes` block from a raw schema definition.
 * @param indexes - The raw `indexes` array from the user's schema file.
 * @param fieldNames - A set of all valid field names for the entity.
 * @returns A normalized array of Index objects.
 */
function parseIndexes(
  indexes: IndexDef[] | undefined,
  fieldNames: Set<string>
): Index[] {
  if (!indexes) {
    return [];
  }
  return indexes.map((index, i) => {
    const fields = asArray(index.on);
    for (const field of fields) {
      if (!fieldNames.has(field)) {
        throw new Error(
          `Index defined on non-existent field: '${field}'. Valid fields are: ${[
            ...fieldNames,
          ].join(", ")}`
        );
      }
    }
    return {
      name: `idx_${i}`, // Simple auto-name for now
      on: fields,
      type: index.type ?? "btree",
      unique: index.unique ?? false,
    };
  });
}

/**
 * Parses the `manyToMany` block of a raw schema into a normalized array of relationship objects.
 * @param manyToMany - The raw manyToMany object from the schema definition.
 * @returns An array of normalized ManyToManyRelationship objects.
 */
function parseManyToMany(
  manyToMany: EntityDef["manyToMany"]
): ManyToManyRelationship[] {
  const relationships: ManyToManyRelationship[] = [];
  if (!manyToMany) return relationships;

  for (const relName in manyToMany) {
    const relDef = manyToMany[relName];
    relationships.push({
      name: relName,
      ...relDef,
    });
  }
  return relationships;
}

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
      required: originalFieldDef._def.typeName !== "ZodOptional",
      attributes: new Map(),
    });
  }

  return fields;
}

/**
 * Parses the `relationships` block of a raw schema into a normalized array.
 * @param relationships - The raw relationships object.
 * @returns An array of normalized standard and polymorphic relationships.
 */
function parseRelationships(
  relationships: EntityDef["relationships"]
): (Relationship | PolymorphicRelationship)[] {
  const parsed: (Relationship | PolymorphicRelationship)[] = [];
  if (!relationships) return parsed;

  for (const relName in relationships) {
    const relDef = relationships[relName];

    if (relDef.type === "polymorphic") {
      parsed.push({
        name: relName,
        type: "polymorphic",
        field: relDef.foreignKey,
      });
    } else {
      // It's a standard relationship
      parsed.push({
        name: relName,
        node: relDef.entity,
        cardinality: relDef.cardinality,
        required: relDef.required,
        description: relDef.description,
        mappedBy: relDef.mappedBy,
      });
    }
  }
  return parsed;
}

/**
 * The main parser function that transforms raw schemas into the Intermediate Representation (IR).
 * It now discovers and returns nested schemas as well.
 *
 * @param config - The schema configuration object.
 * @returns An array of all normalized schema objects, including nested ones.
 */
export function parseSchemas(config: SchemaConfig): NormalizedSchema[] {
  const allSchemas: NormalizedSchema[] = [];
  const { entities } = config;

  for (const schemaDef of entities) {
    const zodSchema = schemaDef.schema as ZodObject<any>;
    const fields = parseZodSchema(zodSchema, schemaDef.name, allSchemas);
    const fieldNames = new Set(fields.map((f) => f.name));

    const standardRelationships = parseRelationships(schemaDef.relationships);
    const manyToManyRelationships = parseManyToMany(schemaDef.manyToMany);

    const indexes = parseIndexes(schemaDef.indexes, fieldNames);

    const isJoinTable = manyToManyRelationships.some(
      (rel) => rel.through === schemaDef.name
    );

    const normalizedSchema: NormalizedSchema = {
      name: schemaDef.name,
      description: schemaDef.description,
      fields,
      relationships: standardRelationships,
      manyToMany: manyToManyRelationships,
      indexes,
      isJoinTable,
    };
    allSchemas.push(normalizedSchema);
  }

  // A final pass could be done here to validate relationships, e.g., mappedBy
  return allSchemas;
}
