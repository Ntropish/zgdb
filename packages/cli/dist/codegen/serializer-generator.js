/**
 * @file src/codegen/serializer-generator.ts
 * @description Generates the FlatBuffers serializer/deserializer class.
 */
import { getEdgeTables } from "./utils.js";
function capitalize(str) {
    return str
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}
export function generateSerializer(schema) {
    const lines = [];
    const nodeTypes = Object.keys(schema);
    const edgeTables = getEdgeTables(schema);
    const edgeTypes = Array.from(edgeTables.keys());
    // --- Imports ---
    lines.push(`import * as flatbuffers from 'flatbuffers';`);
    lines.push(`import { NodeData, Edge, FlatBufferSerializers } from './interfaces';`);
    const allTypeNames = [...nodeTypes, ...edgeTypes].map(capitalize);
    lines.push(`import { ${allTypeNames.join(", ")} } from './graph-db';`);
    lines.push("");
    // --- Class Definition ---
    lines.push("export class GeneratedFlatBufferSerializers implements FlatBufferSerializers {");
    lines.push("");
    // --- serializeNode Method ---
    lines.push("  serializeNode(type: string, data: NodeData): Uint8Array {");
    lines.push("    const builder = new flatbuffers.Builder(1024);");
    lines.push("    let root: number;");
    lines.push("");
    lines.push("    switch (type) {");
    for (const nodeType of nodeTypes) {
        const tableDef = schema[nodeType];
        const capitalizedName = capitalize(nodeType);
        lines.push(`      case '${nodeType}': {`);
        lines.push(`        const id = builder.createString(data.id);`);
        // Create strings for all string fields first
        for (const [fieldName, fieldType] of Object.entries(tableDef.fields.shape)) {
            if (fieldType._def.typeName === "ZodString") {
                lines.push(`        const ${fieldName} = builder.createString(data.fields.${fieldName});`);
            }
        }
        // Create vectors for relation IDs
        for (const [relationName] of Object.entries(tableDef.relations)) {
            lines.push(`        let ${relationName}Vector: number | undefined;`);
            lines.push(`        if (data.relationIds.${relationName}) {`);
            lines.push(`          const relationIds = (data.relationIds.${relationName} as string[]).map(id => builder.createString(id));`);
            lines.push(`          ${relationName}Vector = ${capitalizedName}.create${capitalize(relationName)}IdsVector(builder, relationIds);`);
            lines.push(`        }`);
        }
        lines.push("");
        // Start table and add fields
        lines.push(`        ${capitalizedName}.start${capitalizedName}(builder);`);
        lines.push(`        ${capitalizedName}.addId(builder, id);`);
        for (const [fieldName, fieldType] of Object.entries(tableDef.fields.shape)) {
            if (fieldType._def.typeName === "ZodString") {
                lines.push(`        ${capitalizedName}.add${capitalize(fieldName)}(builder, ${fieldName});`);
            }
            else {
                lines.push(`        ${capitalizedName}.add${capitalize(fieldName)}(builder, data.fields.${fieldName});`);
            }
        }
        lines.push(`        ${capitalizedName}.addCreatedAt(builder, BigInt(data.createdAt));`);
        lines.push(`        ${capitalizedName}.addUpdatedAt(builder, BigInt(data.updatedAt));`);
        // Add relations
        for (const [relationName] of Object.entries(tableDef.relations)) {
            lines.push(`        if (${relationName}Vector) {`);
            lines.push(`            ${capitalizedName}.add${capitalize(relationName)}Ids(builder, ${relationName}Vector);`);
            lines.push(`        }`);
        }
        lines.push(`        root = ${capitalizedName}.end${capitalizedName}(builder);`);
        lines.push(`        break;`);
        lines.push(`      }`);
    }
    lines.push(`      default:`);
    lines.push("        throw new Error(`Unknown node type: ${type}`);");
    lines.push("    }");
    lines.push("");
    lines.push("    builder.finish(root);");
    lines.push("    return builder.asUint8Array();");
    lines.push("  }");
    lines.push("");
    // --- deserializeNode Method ---
    lines.push("  deserializeNode(type: string, buffer: Uint8Array): NodeData {");
    lines.push("    const buf = new flatbuffers.ByteBuffer(buffer);");
    lines.push("");
    lines.push("    switch (type) {");
    for (const nodeType of nodeTypes) {
        const tableDef = schema[nodeType];
        const capitalizedName = capitalize(nodeType);
        lines.push(`      case '${nodeType}': {`);
        lines.push(`        const table = ${capitalizedName}.getRootAs${capitalizedName}(buf);`);
        lines.push(`        const relationIds: Record<string, string | string[]> = {};`);
        for (const [relationName] of Object.entries(tableDef.relations)) {
            lines.push(`        const ${relationName}Length = table.${relationName}IdsLength();`);
            lines.push(`        if(${relationName}Length > 0) {`);
            lines.push(`          relationIds.${relationName} = Array.from({ length: ${relationName}Length }, (_, i) => table.${relationName}Ids(i)!);`);
            lines.push(`        }`);
        }
        lines.push("        return {");
        lines.push(`          id: table.id()!,`);
        lines.push(`          type: '${nodeType}',`);
        lines.push("          createdAt: Number(table.createdAt()),");
        lines.push("          updatedAt: Number(table.updatedAt()),");
        lines.push("          fields: {");
        const numFields = Object.keys(tableDef.fields.shape).length;
        let i = 0;
        for (const [fieldName] of Object.entries(tableDef.fields.shape)) {
            const accessor = fieldName === "id" ||
                fieldName === "createdAt" ||
                fieldName === "updatedAt"
                ? `table.${fieldName}()`
                : `table.${fieldName}()!`;
            lines.push(`            ${fieldName}: ${accessor}${i < numFields - 1 ? "," : ""}`);
            i++;
        }
        lines.push("          },");
        lines.push("          relationIds");
        lines.push("        };");
        lines.push("      }");
    }
    lines.push(`      default:`);
    lines.push("        throw new Error(`Unknown node type: ${type}`);");
    lines.push("    }");
    lines.push("  }");
    lines.push("");
    // --- serializeEdge Method ---
    lines.push("  serializeEdge(edge: Edge): Uint8Array { throw new Error('Not implemented'); }");
    lines.push("");
    // --- deserializeEdge Method ---
    lines.push("  deserializeEdge(buffer: Uint8Array): Edge { throw new Error('Not implemented'); }");
    lines.push("");
    // --- getType Methods ---
    lines.push("  getSupportedNodeTypes(): string[] {");
    lines.push(`    return [${nodeTypes.map((t) => `'${t}'`).join(", ")}];`);
    lines.push("  }");
    lines.push("");
    lines.push("  getSupportedEdgeTypes(): string[] {");
    lines.push(`    return [${edgeTypes.map((t) => `'${t}'`).join(", ")}];`);
    lines.push("  }");
    lines.push("}");
    lines.push("");
    return lines.join("\n");
}
