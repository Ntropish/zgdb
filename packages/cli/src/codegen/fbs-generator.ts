import { z } from "zod";

type RelationType = "one" | "many";
type RelationDefinition = [RelationType, string];

interface SchemaDefinition {
  fields: z.ZodObject<any>;
  relations: Record<string, RelationDefinition>;
}

type Schema = Record<string, SchemaDefinition>;

/**
 * Maps Zod types to FlatBuffers types
 */
function zodToFbsType(zodType: z.ZodTypeAny): string {
  if (zodType instanceof z.ZodString) {
    return "string";
  } else if (zodType instanceof z.ZodNumber) {
    const zodNumber = zodType as z.ZodNumber;
    // Check if it's an integer
    if (zodNumber._def.checks?.some((check: any) => check.kind === "int")) {
      return "int32";
    }
    return "float";
  } else if (zodType instanceof z.ZodBoolean) {
    return "bool";
  } else if (zodType instanceof z.ZodOptional) {
    return zodToFbsType(zodType._def.innerType);
  } else if (zodType instanceof z.ZodArray) {
    const innerType = zodToFbsType(zodType._def.type);
    return `[${innerType}]`;
  }
  // Default fallback
  return "string";
}

/**
 * Generates FlatBuffers schema from a Zod-based schema definition
 * following graph database design principles
 */
export function generateFbsSchema(
  schema: Schema,
  namespace: string = "GraphDB"
): string {
  const lines: string[] = [];

  // Add namespace
  lines.push(`namespace ${namespace};`);
  lines.push("");

  // First, generate all the table definitions
  const tableNames = Object.keys(schema);

  // Generate edge tables for many-to-many relationships
  const edgeTables = new Map<string, { from: string; to: string }>();

  for (const [tableName, tableDef] of Object.entries(schema)) {
    for (const [relationName, [relationType, targetTable]] of Object.entries(
      tableDef.relations
    )) {
      if (relationType === "many") {
        // Check if the target also has a many relationship back
        const targetRelations = schema[targetTable]?.relations || {};
        const hasReverseMany = Object.values(targetRelations).some(
          ([type, target]) => type === "many" && target === tableName
        );

        if (hasReverseMany) {
          // Create edge table name (alphabetically ordered to avoid duplicates)
          const edgeTableName =
            [tableName, targetTable].sort().join("_") + "_edge";
          if (!edgeTables.has(edgeTableName)) {
            edgeTables.set(edgeTableName, {
              from: tableName < targetTable ? tableName : targetTable,
              to: tableName < targetTable ? targetTable : tableName,
            });
          }
        }
      }
    }
  }

  // Generate node tables
  for (const [tableName, tableDef] of Object.entries(schema)) {
    const capitalizedName =
      tableName.charAt(0).toUpperCase() + tableName.slice(1);

    lines.push(`table ${capitalizedName} {`);

    // Add ID field (following graph database principles, every node needs an ID)
    lines.push(`  id: string;`);

    // Add fields from Zod schema
    const shape = tableDef.fields.shape;
    for (const [fieldName, fieldType] of Object.entries(shape)) {
      const fbsType = zodToFbsType(fieldType as z.ZodTypeAny);
      lines.push(`  ${fieldName}: ${fbsType};`);
    }

    // Add one-to-one and one-to-many relationships as direct references
    for (const [relationName, [relationType, targetTable]] of Object.entries(
      tableDef.relations
    )) {
      const targetCapitalized =
        targetTable.charAt(0).toUpperCase() + targetTable.slice(1);

      if (relationType === "one") {
        // One-to-one relationship: store reference ID
        lines.push(`  ${relationName}_id: string;`);
      } else if (relationType === "many") {
        // Check if it's a many-to-many (handled by edge table) or one-to-many
        const targetRelations = schema[targetTable]?.relations || {};
        const hasReverseMany = Object.values(targetRelations).some(
          ([type, target]) => type === "many" && target === tableName
        );

        if (!hasReverseMany) {
          // One-to-many: store array of IDs on the "one" side
          // This would typically be on the other side, but we'll add a reference here
          lines.push(`  ${relationName}_ids: [string];`);
        }
        // Many-to-many relationships are handled by edge tables
      }
    }

    // Add timestamps for graph database best practices
    lines.push(`  created_at: int64;`);
    lines.push(`  updated_at: int64;`);

    lines.push(`}`);
    lines.push("");
  }

  // Generate edge tables for many-to-many relationships
  for (const [edgeTableName, { from, to }] of edgeTables.entries()) {
    const capitalizedName = edgeTableName
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    lines.push(`table ${capitalizedName} {`);
    lines.push(`  id: string;`);
    lines.push(`  ${from}_id: string;`);
    lines.push(`  ${to}_id: string;`);
    lines.push(`  created_at: int64;`);
    lines.push(`}`);
    lines.push("");
  }

  // Generate a root type that can reference all tables
  lines.push(`union GraphNode {`);
  for (const tableName of tableNames) {
    const capitalizedName =
      tableName.charAt(0).toUpperCase() + tableName.slice(1);
    lines.push(`  ${capitalizedName},`);
  }
  for (const edgeTableName of edgeTables.keys()) {
    const capitalizedName = edgeTableName
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    lines.push(`  ${capitalizedName},`);
  }
  lines.push(`}`);
  lines.push("");

  // Generate root table for file storage
  lines.push(`table GraphDatabase {`);
  lines.push(`  nodes: [GraphNode];`);
  lines.push(`}`);
  lines.push("");

  lines.push(`root_type GraphDatabase;`);

  return lines.join("\n");
}
