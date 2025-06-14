import { z } from "zod";
declare const EdgeSchema: z.ZodObject<{
    source: z.ZodString;
    target: z.ZodString;
    cardinality: z.ZodEnum<["one-to-one", "one-to-many", "many-to-many"]>;
    name: z.ZodObject<{
        forward: z.ZodString;
        backward: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        forward: string;
        backward: string;
    }, {
        forward: string;
        backward: string;
    }>;
}, "strip", z.ZodTypeAny, {
    source: string;
    target: string;
    cardinality: "one-to-one" | "one-to-many" | "many-to-many";
    name: {
        forward: string;
        backward: string;
    };
}, {
    source: string;
    target: string;
    cardinality: "one-to-one" | "one-to-many" | "many-to-many";
    name: {
        forward: string;
        backward: string;
    };
}>;
type Edge = z.infer<typeof EdgeSchema>;
export interface ProcessedEdge extends Edge {
    canonicalName: {
        forward: string;
        backward: string;
    };
}
export interface ProcessedSchema {
    nodes: any;
    edges: ProcessedEdge[];
}
/**
 * Processes the raw schema from the user config, adding canonical names
 * and other useful metadata for the codegen pipeline.
 * @param schema The raw schema object.
 * @returns A processed schema ready for code generation.
 */
export declare function processSchema(schema: any): ProcessedSchema;
export {};
