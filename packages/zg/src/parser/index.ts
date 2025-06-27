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
  ZGAuthBlock,
  SchemaConfig,
  EntityDef,
  NormalizedAuthBlock,
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
 * @param localPolicyMap - The map of policies for the schema.
 * @param globalPolicyMap - The map of policies for the schema.
 * @returns A normalized AuthBlock object.
 */
function parseAuthBlock(
  auth: AuthBlock<string | string[]> | undefined,
  fieldNames: Set<string>,
  relationshipNames: Set<string>,
  localPolicyMap: Map<string, number>,
  globalPolicyMap: Map<string, number>
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
    if (globalPolicyMap.has(policy)) {
      // Use negative indices to signify global policies
      return (globalPolicyMap.get(policy)! + 1) * -1;
    }
    throw new Error(`Unknown auth policy: '${policy}'`);
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
          `Auth rule defined for non-existent field: '${fieldName}'`
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
          `Auth rule defined for non-existent relationship: '${relName}'`
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
 * @param config - The schema configuration object.
 * @returns An array of all normalized schema objects, including nested ones.
 */
export function parseSchemas<TActor>(
  config: SchemaConfig<TActor, Record<string, EntityDef<TActor>>>
): NormalizedSchema[] {
  const allSchemas: NormalizedSchema[] = [];

  const globalPolicies = Object.keys(config.policies || {});
  const globalPolicyMap = new Map(globalPolicies.map((p, i) => [p, i]));

  const rawSchemas = Object.values(config.entities);

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

    const localPolicies = Object.keys(rawSchema.policies || {});
    const localPolicyMap = new Map(localPolicies.map((p, i) => [p, i]));

    const topLevelSchema: NormalizedSchema = {
      name: rawSchema.name,
      description: rawSchema.description,
      fields,
      relationships: standard,
      manyToMany: manyToMany,
      indexes: (rawSchema.indexes || []).map((index: any) => ({
        ...index,
        on: Array.isArray(index.on) ? index.on : [index.on],
        type: index.type || "btree",
      })),
      auth: parseAuthBlock(
        rawSchema.auth,
        fieldNames,
        relationshipNames,
        localPolicyMap,
        globalPolicyMap
      ),
      policies: globalPolicies, // Storing global policies for the generator
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
