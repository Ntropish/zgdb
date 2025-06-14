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
export declare function getEdgeTables(schema: Schema): Map<string, {
    from: string;
    to: string;
}>;
