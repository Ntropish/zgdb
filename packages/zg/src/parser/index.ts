import {
  ZGEntityDef,
  NormalizedSchema,
  Field,
  Relationship,
  PolymorphicRelationship,
  ManyToManyRelationship,
  AuthBlock,
  AuthRule,
  AuthAction,
  RelationshipAction,
} from "./types.js";
import { ZodTypeAny, ZodObject } from "zod";
import { mapZodToFlatBufferType } from "./type-map.js";

const asArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

/**
 * Parses and normalizes the `auth` block from a raw schema definition.
 * @param auth - The raw `auth` block from the user's schema file.
 * @param fieldNames - The set of field names in the schema.
 * @param relationshipNames - The set of relationship names in the schema.
 * @returns A normalized AuthBlock object.
 */
function parseAuthBlock<T extends string>(
  auth: AuthBlock<T> | undefined,
  fieldNames: Set<string>,
  relationshipNames: Set<string>
): AuthBlock<string> {
  const defaultBlock: AuthBlock<string> = {
    fields: {},
    relationships: {},
  };

  if (!auth) {
    return defaultBlock;
  }

  const parsedBlock: AuthBlock<string> = { ...defaultBlock };

  // Normalize top-level actions
  const topLevelActions: AuthAction[] = ["create", "read", "update", "delete"];
  for (const action of topLevelActions) {
    if (auth[action] && (auth[action] as any[]).length > 0) {
      parsedBlock[action] = asArray(auth[action] as AuthRule<string>);
    }
  }

  // Normalize field-level actions
  if (auth.fields) {
    for (const fieldName in auth.fields) {
      if (!fieldNames.has(fieldName)) {
        throw new Error(
          `Auth rule defined for non-existent field: '${fieldName}'`
        );
      }
      const fieldRules = auth.fields[fieldName];
      parsedBlock.fields![fieldName] = {};
      for (const action in fieldRules) {
        const rule = fieldRules[action as AuthAction];
        if (rule && rule.length > 0) {
          parsedBlock.fields![fieldName][action as AuthAction] = asArray(
            rule as AuthRule<string>
          );
        }
      }
    }
  }

  // Normalize relationship-level actions
  if (auth.relationships) {
    for (const relName in auth.relationships) {
      if (!relationshipNames.has(relName)) {
        throw new Error(
          `Auth rule defined for non-existent relationship: '${relName}'`
        );
      }
      const relRules = auth.relationships[relName];
      parsedBlock.relationships![relName] = {};
      for (const action in relRules) {
        const rule = relRules[action as RelationshipAction];
        if (rule && rule.length > 0) {
          parsedBlock.relationships![relName][action as RelationshipAction] =
            asArray(rule as AuthRule<string>);
        }
      }
    }
  }

  return parsedBlock;
}

/**
 * Parses the `manyToMany` block of a raw schema into a normalized array of relationship names.
 * @param manyToMany - The raw manyToMany object.
 * @returns A set of relationship names defined in the block.
 */
function parseManyToManyRelationships(
  manyToMany: ZGEntityDef<any>["manyToMany"]
): Set<string> {
  const names = new Set<string>();
  if (!manyToMany) {
    return names;
  }

  for (const groupKey in manyToMany) {
    const group = manyToMany[groupKey];
    for (const relName in group) {
      names.add(relName);
    }
  }
  return names;
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
function parseAllRelationships(
  relationships: ZGEntityDef<any>["relationships"]
): {
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
export function parseSchemas(
  rawSchemas: ZGEntityDef<any>[]
): NormalizedSchema[] {
  const allSchemas: NormalizedSchema[] = [];

  for (const rawSchema of rawSchemas) {
    const { standard, manyToMany } = parseAllRelationships(
      rawSchema.relationships
    );

    const manyToManyNames = parseManyToManyRelationships(rawSchema.manyToMany);

    // Nested schemas discovered during field parsing are added to allSchemas.
    const fields = parseZodSchema(rawSchema.schema, rawSchema.name, allSchemas);
    const fieldNames = new Set(fields.map((f) => f.name));
    const relationshipNames = new Set([
      ...standard.map((rel) => rel.name),
      ...manyToManyNames,
    ]);

    const topLevelSchema: NormalizedSchema = {
      name: rawSchema.name,
      description: rawSchema.description,
      fields,
      relationships: standard,
      manyToMany: manyToMany,
      indexes: (rawSchema.indexes || []).map((index) => ({
        ...index,
        on: Array.isArray(index.on) ? index.on : [index.on],
        type: index.type || "btree",
      })),
      auth: parseAuthBlock(rawSchema.auth, fieldNames, relationshipNames),
    };

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
