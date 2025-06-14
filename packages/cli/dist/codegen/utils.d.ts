import { z } from "zod";
export interface Schema {
    [nodeType: string]: {
        fields: z.ZodObject<any, any>;
        relations: Record<string, [RelationType, string]>;
    };
}
type RelationType = "one" | "many";
/**
 * Converts a Zod type to its corresponding TypeScript type as a string.
 */
export declare function ZodToTsType(type: z.ZodTypeAny): string;
/**
 * Scans the schema to find all many-to-many relationships, which require
 * a dedicated edge table for storage.
 *
 * @param schema The user-defined graph schema.
 * @returns A map where keys are edge table names (e.g., "post_tag_edge")
 * and values are objects specifying the 'from' and 'to' node types.
 */
export declare function getEdgeTables(schema: Schema): Map<string, {
    from: string;
    to: string;
}>;
export {};
