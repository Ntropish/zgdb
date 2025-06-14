import { z } from "zod";
type RelationType = "one" | "many";
type RelationDefinition = [RelationType, string];
interface SchemaDefinition {
    fields: z.ZodObject<any>;
    relations: Record<string, RelationDefinition>;
}
type Schema = Record<string, SchemaDefinition>;
/**
 * Generates FlatBuffers schema from a Zod-based schema definition
 * following graph database design principles
 */
export declare function generateFbsSchema(schema: Schema, namespace?: string): string;
export {};
