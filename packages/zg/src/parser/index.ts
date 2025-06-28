import {
  EntityDef,
  NormalizedSchema,
  Field,
  Relationship,
  PolymorphicRelationship,
  ManyToManyRelationship,
  AuthBlock,
  AuthRule,
  AuthAction,
  RelationshipAction,
  NormalizedAuthBlock,
  SchemaConfig,
  Index,
} from "./types.js";
import { ZodTypeAny, ZodObject } from "zod";
import { mapZodToFlatBufferType } from "./type-map.js";

const asArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

/**
 * Parses and normalizes the `auth` block from a raw schema definition.
 * @param entityName - The name of the entity.
 * @param auth - The raw `auth` block from the user's schema file.
 * @param fieldNames - The set of field names in the schema.
 * @param relationshipNames - The set of relationship names in the schema.
 * @param localPolicyMap - The local policy map for the entity.
 * @param globalResolverMap - The global resolver map for the entity.
 * @returns A normalized AuthBlock object.
 */
function parseAuthBlock(
  entityName: string,
  auth: AuthBlock<string | string[]> | undefined,
  fieldNames: Set<string>,
  relationshipNames: Set<string>,
  localPolicyMap: Map<string, number>,
  globalResolverMap: Map<string, number>
): NormalizedAuthBlock {
  const defaultBlock: NormalizedAuthBlock = {
    fields: {},
    relationships: {},
  };

  if (!auth) {
    return defaultBlock;
  }

  const parsedBlock: NormalizedAuthBlock = { ...defaultBlock };

  const resolvePolicy = (policy: string): number => {
    // Local policies take precedence
    if (localPolicyMap.has(policy)) {
      return localPolicyMap.get(policy)!;
    }
    if (globalResolverMap.has(policy)) {
      // Use negative indices to signify global policies
      return (globalResolverMap.get(policy)! + 1) * -1;
    }
    const available = [
      ...[...localPolicyMap.keys()].map((k) => `'${k}' (local)`),
      ...[...globalResolverMap.keys()].map((k) => `'${k}' (global)`),
    ].join(", ");
    throw new Error(
      `[${entityName}] Unknown auth policy: '${policy}'. Available policies: ${available}`
    );
  };

  // Normalize top-level actions
  const topLevelActions: AuthAction[] = ["create", "read", "update", "delete"];
  for (const action of topLevelActions) {
    const rule = auth[action];
    if (rule !== undefined) {
      const indices = asArray(rule).map(resolvePolicy);
      (parsedBlock as any)[action] = indices;
    }
  }

  // Normalize field-level actions
  if (auth.fields) {
    for (const fieldName in auth.fields) {
      if (!fieldNames.has(fieldName)) {
        throw new Error(
          `[${entityName}] Auth rule defined for non-existent field: '${fieldName}'`
        );
      }
      const fieldRules = auth.fields[fieldName];
      (parsedBlock.fields as any)![fieldName] = {};
      for (const action in fieldRules) {
        const rule = (fieldRules as any)[action];
        if (rule !== undefined) {
          const indices = asArray(rule).map(resolvePolicy);
          (parsedBlock.fields as any)![fieldName][action] = indices;
        }
      }
    }
  }

  // Normalize relationship-level actions
  if (auth.relationships) {
    for (const relName in auth.relationships) {
      if (!relationshipNames.has(relName)) {
        throw new Error(
          `[${entityName}] Auth rule defined for non-existent relationship: '${relName}'`
        );
      }
      const relRules = auth.relationships[relName];
      (parsedBlock.relationships as any)![relName] = {};
      for (const action in relRules) {
        const rule = (relRules as any)[action];
        if (rule !== undefined) {
          const indices = asArray(rule).map(resolvePolicy);
          (parsedBlock.relationships as any)![relName][action] = indices;
        }
      }
    }
  }

  return parsedBlock;
}

/**
 * Parses and validates the `indexes` block from a raw schema definition.
 * @param indexes - The raw `indexes` array from the user's schema file.
 * @param fieldNames - A set of all valid field names for the entity.
 * @returns A normalized array of Index objects.
 */
function parseIndexes(
  indexes: Index[] | undefined,
  fieldNames: Set<string>
): Index[] {
  if (!indexes) {
    return [];
  }

  return indexes.map((index) => {
    // Ensure `on` is always an array and validate fields.
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
    // Return a new object with `on` normalized to an array.
    return { ...index, on: fields, type: index.type ?? "btree" };
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
  if (!manyToMany) {
    return relationships;
  }

  for (const relName in manyToMany) {
    const relDef = manyToMany[relName];
    relationships.push({
      name: relName,
      node: relDef.node,
      through: relDef.through,
      myKey: relDef.myKey,
      theirKey: relDef.theirKey,
      description: relDef.description,
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
 * @returns An array of normalized standard and polymorphic relationships.
 */
function parseAllRelationships(
  relationships: EntityDef["relationships"]
): (Relationship | PolymorphicRelationship)[] {
  const standard: (Relationship | PolymorphicRelationship)[] = [];

  if (!relationships) {
    return standard;
  }

  for (const nodeName in relationships) {
    const relGroup = relationships[nodeName];
    for (const relName in relGroup) {
      const relDef = relGroup[relName];

      if (relDef.type === "polymorphic") {
        standard.push({
          name: relName,
          node: "polymorphic", // nodeName is 'polymorphic' here
          type: "polymorphic",
          cardinality: relDef.cardinality,
          discriminator: relDef.discriminator,
          foreignKey: relDef.foreignKey,
          references: relDef.references,
          description: relDef.description,
        });
      } else {
        standard.push({
          name: relName,
          node: nodeName,
          cardinality: relDef.cardinality,
          required: relDef.required,
          description: relDef.description,
          mappedBy: relDef.mappedBy,
        });
      }
    }
  }
  return standard;
}

/**
 * The main parser function that transforms raw schemas into the Intermediate Representation (IR).
 * It now discovers and returns nested schemas as well.
 *
 * @param config - The schema configuration object.
 * @returns An array of all normalized schema objects, including nested ones.
 */
export function parseSchemas(
  config: SchemaConfig<any, any, any, any, any>
): NormalizedSchema[] {
  const allSchemas: NormalizedSchema[] = [];
  const {
    entities,
    globalResolvers = {},
    resolvers: entityResolvers = {},
    auth: rootAuth = {},
  } = config;

  // Pre-process to build the global policy map
  const globalResolverMap = new Map<string, number>();
  Object.keys(globalResolvers).forEach((name, i) =>
    globalResolverMap.set(name, i)
  );

  for (const entityName in entities) {
    const schemaDef = entities[entityName];

    // Merge all possible resolvers for this entity into one set
    const allPolicyNames = new Set<string>([
      ...Object.keys(globalResolvers),
      ...Object.keys(schemaDef.resolvers || {}),
      ...Object.keys((entityResolvers as any)[entityName] || {}),
    ]);

    const standardRelationships = parseAllRelationships(
      schemaDef.relationships
    );
    const manyToManyRelationships = parseManyToMany(schemaDef.manyToMany);

    const relationshipNames = new Set([
      ...standardRelationships.map((r) => r.name),
      ...manyToManyRelationships.map((r) => r.name),
    ]);

    const zodSchema = schemaDef.schema as ZodObject<any>;
    const fields = parseZodSchema(zodSchema, schemaDef.name, allSchemas);
    const fieldNames = new Set(fields.map((f) => f.name));

    const localResolvers = {
      ...(schemaDef.resolvers || {}),
      ...((entityResolvers as any)[entityName] || {}),
    };

    const localPolicyMap = new Map<string, number>();
    Object.keys(localResolvers).forEach((name, i) =>
      localPolicyMap.set(name, i)
    );

    const auth = parseAuthBlock(
      schemaDef.name,
      (rootAuth as any)[entityName],
      fieldNames,
      relationshipNames,
      localPolicyMap,
      globalResolverMap
    );

    const indexes = parseIndexes(schemaDef.indexes, fieldNames);

    const normalizedSchema: NormalizedSchema = {
      name: schemaDef.name,
      description: schemaDef.description,
      fields,
      relationships: standardRelationships,
      manyToMany: manyToManyRelationships,
      auth,
      indexes,
      localResolvers: localResolvers as Record<string, Function>,
      globalResolvers: globalResolvers as Record<string, Function>,
    };
    allSchemas.push(normalizedSchema);
  }

  // Final pass to link relationships
  for (const schema of allSchemas) {
    for (const rel of schema.relationships) {
      if (rel.mappedBy) {
        const targetSchema = allSchemas.find((s) => s.name === rel.node);
        if (!targetSchema) {
          throw new Error(
            `Relationship '${schema.name}.${rel.name}' points to non-existent entity '${rel.node}'`
          );
        }
        const mappedRel = targetSchema.relationships.find(
          (r) => r.name === rel.mappedBy
        );
        if (!mappedRel) {
          throw new Error(
            `Relationship '${schema.name}.${rel.name}' has 'mappedBy' pointing to non-existent relationship '${targetSchema.name}.${rel.mappedBy}'`
          );
        }
        // This is where you might add linking logic if needed in the IR
      }
    }
  }

  return allSchemas;
}
