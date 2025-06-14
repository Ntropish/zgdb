import { z } from "zod";
import { getEdgeTables } from "./utils.js";
/**
 * Maps Zod types to FlatBuffers types
 */
function zodToFbsType(zodType) {
    if (zodType instanceof z.ZodString) {
        return "string";
    }
    else if (zodType instanceof z.ZodNumber) {
        const zodNumber = zodType;
        // Check if it's an integer
        if (zodNumber._def.checks?.some((check) => check.kind === "int")) {
            return "int32";
        }
        return "float";
    }
    else if (zodType instanceof z.ZodBoolean) {
        return "bool";
    }
    else if (zodType instanceof z.ZodOptional) {
        return zodToFbsType(zodType._def.innerType);
    }
    else if (zodType instanceof z.ZodArray) {
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
export function generateFbsSchema(schema, namespace = "GraphDB") {
    const lines = [];
    lines.push(`namespace ${namespace};`);
    lines.push("");
    const tableNames = Object.keys(schema);
    const edgeTables = getEdgeTables(schema); // Using the utility function
    // Generate node tables
    for (const [tableName, tableDef] of Object.entries(schema)) {
        const capitalizedName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
        lines.push(`table ${capitalizedName} {`);
        lines.push(`  id: string (key);`); // Add key for potential indexing
        const shape = tableDef.fields.shape;
        for (const [fieldName, fieldType] of Object.entries(shape)) {
            const fbsType = zodToFbsType(fieldType);
            lines.push(`  ${fieldName}: ${fbsType};`);
        }
        for (const [relationName, [relationType, targetTable]] of Object.entries(tableDef.relations)) {
            // In our design, all relations are represented by ID arrays on the node tables.
            // One-to-one is an array with a single ID.
            lines.push(`  ${relationName}_ids: [string];`);
        }
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
        lines.push(`  id: string (key);`);
        lines.push(`  ${from}_id: string;`);
        lines.push(`  ${to}_id: string;`);
        lines.push(`  created_at: int64;`);
        lines.push(`}`);
        lines.push("");
    }
    lines.push(`root_type ${tableNames[0].charAt(0).toUpperCase() + tableNames[0].slice(1)};`);
    lines.push("");
    return lines.join("\n");
}
