/**
 * @file src/codegen/utils.ts
 * @description Shared utilities and type definitions for code generation.
 */

import { z } from "zod";

export type RelationType = "one" | "many";
export type RelationDefinition = [RelationType, string];

export interface SchemaDefinition {
  fields: z.ZodObject<any>;
  relations: Record<string, RelationDefinition>;
}

export type Schema = Record<string, SchemaDefinition>;

/**
 * Identifies many-to-many relationships in the schema and defines the
 * necessary edge tables to connect them.
 * @param schema The graph schema definition.
 * @returns A map of edge table names to their source and target nodes.
 */
export function getEdgeTables(
  schema: Schema
): Map<string, { from: string; to: string }> {
  const edgeTables = new Map<string, { from: string; to: string }>();

  for (const [tableName, tableDef] of Object.entries(schema)) {
    for (const [relationName, [relationType, targetTable]] of Object.entries(
      tableDef.relations
    )) {
      if (relationType === "many") {
        const targetRelations = schema[targetTable]?.relations || {};
        const hasReverseMany = Object.values(targetRelations).some(
          ([type, target]) => type === "many" && target === tableName
        );

        if (hasReverseMany) {
          const [from, to] = [tableName, targetTable].sort();
          const edgeTableName = `${from}_${to}_edge`;
          if (!edgeTables.has(edgeTableName)) {
            edgeTables.set(edgeTableName, { from, to });
          }
        }
      }
    }
  }
  return edgeTables;
}
