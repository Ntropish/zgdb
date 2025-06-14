import { z } from "zod";
// ============================================
//  Utility Functions
// ============================================
/**
 * Converts a Zod type to its corresponding TypeScript type as a string.
 */
export function ZodToTsType(type) {
    if (type instanceof z.ZodString)
        return "string";
    if (type instanceof z.ZodNumber)
        return "number";
    if (type instanceof z.ZodBoolean)
        return "boolean";
    if (type instanceof z.ZodDate)
        return "Date";
    if (type instanceof z.ZodArray) {
        return `${ZodToTsType(type.element)}[]`;
    }
    // Add other Zod types as needed for your schemas
    return "any";
}
/**
 * Scans the schema to find all many-to-many relationships, which require
 * a dedicated edge table for storage.
 *
 * @param schema The user-defined graph schema.
 * @returns A map where keys are edge table names (e.g., "post_tag_edge")
 * and values are objects specifying the 'from' and 'to' node types.
 */
export function getEdgeTables(schema) {
    const edgeTables = new Map();
    // Iterate over all node types in the schema (we'll call it typeA)
    for (const typeA in schema) {
        // Iterate over the relations of the current node type
        for (const relNameA in schema[typeA].relations) {
            const [relationTypeA, typeB] = schema[typeA].relations[relNameA];
            // A many-to-many relationship is a candidate for an edge table.
            // We need to find the corresponding 'many' relation on the other side (typeB).
            if (relationTypeA === "many" && schema[typeB]) {
                const relationsB = schema[typeB].relations;
                // Look for a matching relation on typeB that points back to typeA
                for (const relNameB in relationsB) {
                    const [relationTypeB, backRefType] = relationsB[relNameB];
                    // Check if it's also a 'many' relation and if it points back to the original type
                    if (relationTypeB === "many" && backRefType === typeA) {
                        // To avoid duplicates and have a canonical name, we sort the type names alphabetically.
                        const sortedTypes = [typeA, typeB].sort();
                        const edgeName = `${sortedTypes[0]}_${sortedTypes[1]}_edge`;
                        // Add the new edge table to our map if it doesn't already exist.
                        if (!edgeTables.has(edgeName)) {
                            edgeTables.set(edgeName, {
                                from: sortedTypes[0],
                                to: sortedTypes[1],
                            });
                        }
                    }
                }
            }
        }
    }
    return edgeTables;
}
