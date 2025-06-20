/**
 * @file src/codegen/serializer-generator.ts
 * @description Generates type-safe serializers and deserializers for the graph schema.
 */
// Helper to convert camelCase to kebab-case for filenames
function toKebabCase(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
}
// Helper to convert camelCase to the snake_case used in FBS files
function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
// Helper to convert a flatbuffer field name (snake_case) to the camelCase method name generated by flatc
function fbsFieldToTsMethod(s) {
    // The flatc TypeScript generator creates camelCase method names.
    // e.g., 'loyalty_points' becomes 'loyaltyPoints'
    return s.replace(/(_\w)/g, (m) => m[1].toUpperCase());
}
// Helper to capitalize the first letter of a string
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function generateSerializer(schema) {
    const lines = [];
    const nodeTypes = Object.keys(schema);
    // --- Imports ---
    lines.push(`import { Builder, ByteBuffer } from '@zgdb/runtime';`);
    lines.push(`import { z } from 'zod';`);
    lines.push(...nodeTypes.map((t) => `import { ${capitalize(t)} } from './graph-db/${toKebabCase(t)}.js';`));
    lines.push(`import GraphSchema from './graph-schema.js';`);
    // ============================================
    //  Node Data Types (Reinstated)
    // ============================================
    lines.push("\n// ============================================");
    lines.push("//  Node Data Types");
    lines.push("// ============================================");
    for (const nodeType of nodeTypes) {
        const nodeSchema = schema[nodeType];
        const capNodeType = capitalize(nodeType);
        lines.push(`export type ${capNodeType}Data = {`);
        lines.push(`  id: string;`);
        lines.push(`  type: '${nodeType}';`);
        lines.push(`  createdAt: number;`);
        lines.push(`  updatedAt: number;`);
        lines.push(`  fields: z.infer<typeof GraphSchema.${nodeType}['fields']>;`);
        lines.push(`  relationIds: {`);
        for (const [relationName, relationDef] of Object.entries(nodeSchema.relations)) {
            const relationType = relationDef[0];
            lines.push(`    ${relationName}: ${relationType === "one" ? "string" : "string[]"};`);
        }
        lines.push(`  };`);
        lines.push(`};\n`);
    }
    // ============================================
    //  Supported Node Types
    // ============================================
    lines.push("\n// ============================================");
    lines.push("//  Supported Node Types");
    lines.push("// ============================================");
    lines.push(`export const supportedNodeTypes = [${nodeTypes
        .map((t) => `'${t}'`)
        .join(", ")}] as const;`);
    // ============================================
    //  Serialize Logic
    // ============================================
    lines.push("\n// ============================================");
    lines.push("//  Serialize Logic");
    lines.push("// ============================================");
    lines.push(`export const serializeNode = {`);
    for (const nodeType of nodeTypes) {
        const nodeSchema = schema[nodeType];
        const capNodeType = capitalize(nodeType);
        lines.push(`  ${nodeType}: (node: ${capNodeType}Data): Uint8Array => {`);
        lines.push(`    const builder = new Builder(1024);`);
        // --- Pre-create Offsets for Strings and Vectors ---
        const offsetVariables = [];
        // ID
        offsetVariables.push(`    const idOffset = builder.createString(node.id);`);
        // Fields
        for (const [fieldName, field] of Object.entries(nodeSchema.fields.shape)) {
            const zodType = field._def.typeName;
            if (zodType === "ZodString" || zodType === "ZodEnum") {
                offsetVariables.push(`    const ${fieldName}Offset = builder.createString(node.fields.${fieldName} || '');`);
            }
        }
        // Relations (all are vectors of strings in FBS)
        for (const [relationName, relationDef] of Object.entries(nodeSchema.relations)) {
            const fbsFieldName = toSnakeCase(relationName) + "_ids";
            const tsMethodName = fbsFieldToTsMethod(fbsFieldName);
            const tsMethodStem = capitalize(tsMethodName);
            const relationType = relationDef[0];
            const ids = relationType === "one"
                ? `node.relationIds.${relationName} ? [node.relationIds.${relationName}] : []`
                : `node.relationIds.${relationName} || []`;
            offsetVariables.push(`    const ${relationName}IdOffsets = (${ids}).map(id => builder.createString(id));`);
            offsetVariables.push(`    const ${tsMethodName}VectorOffset = ${capNodeType}.create${tsMethodStem}Vector(builder, ${relationName}IdOffsets);`);
        }
        lines.push(...offsetVariables);
        // --- Start Building Table ---
        lines.push(`\n    ${capNodeType}.start${capNodeType}(builder);`);
        // Base fields (these are not in the Zod 'fields' object)
        lines.push(`    ${capNodeType}.addId(builder, idOffset);`);
        lines.push(`    ${capNodeType}.addCreatedAt(builder, BigInt(node.createdAt));`);
        lines.push(`    ${capNodeType}.addUpdatedAt(builder, BigInt(node.updatedAt));`);
        // Schema fields
        for (const [fieldName, field] of Object.entries(nodeSchema.fields.shape)) {
            const zodType = field._def.typeName;
            const fbsMethodName = fbsFieldToTsMethod(toSnakeCase(fieldName));
            const tsMethodStem = capitalize(fbsMethodName);
            if (zodType === "ZodString" || zodType === "ZodEnum") {
                lines.push(`    ${capNodeType}.add${tsMethodStem}(builder, ${fieldName}Offset);`);
            }
            else if (zodType === "ZodNumber") {
                lines.push(`    ${capNodeType}.add${tsMethodStem}(builder, node.fields.${fieldName});`);
            }
            else if (zodType === "ZodBoolean") {
                lines.push(`    ${capNodeType}.add${tsMethodStem}(builder, node.fields.${fieldName});`);
            }
        }
        // Relations
        for (const [relationName] of Object.entries(nodeSchema.relations)) {
            const fbsFieldName = toSnakeCase(relationName) + "_ids";
            const tsMethodName = fbsFieldToTsMethod(fbsFieldName);
            const tsMethodStem = capitalize(tsMethodName);
            lines.push(`    ${capNodeType}.add${tsMethodStem}(builder, ${tsMethodName}VectorOffset);`);
        }
        // --- Finish Building Table ---
        lines.push(`    const ${nodeType}Offset = ${capNodeType}.end${capNodeType}(builder);`);
        lines.push(`    builder.finish(${nodeType}Offset);`);
        lines.push(`    return builder.asUint8Array();`);
        lines.push(`  },`);
    }
    lines.push(`};`);
    // ============================================
    //  Deserialize Logic
    // ============================================
    lines.push("\n// ============================================");
    lines.push("//  Deserialize Logic");
    lines.push("// ============================================");
    lines.push(`export const deserializeNode = {`);
    for (const nodeType of nodeTypes) {
        const nodeSchema = schema[nodeType];
        const capNodeType = capitalize(nodeType);
        lines.push(`  ${nodeType}: (buffer: Uint8Array): ${capNodeType}Data => {`);
        lines.push(`    const byteBuffer = new ByteBuffer(buffer);`);
        lines.push(`    const node = ${capNodeType}.getRootAs${capNodeType}(byteBuffer);`);
        // Reconstruct fields
        lines.push(`    const fields: any = {};`);
        for (const [fieldName] of Object.entries(nodeSchema.fields.shape)) {
            const tsMethodName = fbsFieldToTsMethod(toSnakeCase(fieldName));
            lines.push(`    fields.${fieldName} = node.${tsMethodName}();`);
        }
        // Reconstruct relationIds
        lines.push(`    const relationIds: any = {};`);
        for (const [relationName, relationDef] of Object.entries(nodeSchema.relations)) {
            const fbsFieldName = toSnakeCase(relationName) + "_ids";
            const tsMethodName = fbsFieldToTsMethod(fbsFieldName);
            const relationType = relationDef[0];
            lines.push(`    const ${relationName}Ids = Array.from({ length: node.${tsMethodName}Length() }, (_, i) => node.${tsMethodName}(i));`);
            if (relationType === "one") {
                lines.push(`    relationIds.${relationName} = ${relationName}Ids[0] || '';`);
            }
            else {
                lines.push(`    relationIds.${relationName} = ${relationName}Ids;`);
            }
        }
        lines.push(`    return {`);
        lines.push(`      id: node.id()!,`);
        lines.push(`      type: '${nodeType}',`);
        lines.push(`      createdAt: Number(node.createdAt()),`);
        lines.push(`      updatedAt: Number(node.updatedAt()),`);
        lines.push(`      fields: fields as ${capNodeType}Data['fields'],`);
        lines.push(`      relationIds: relationIds as ${capNodeType}Data['relationIds'],`);
        lines.push(`    };`);
        lines.push(`  },`);
    }
    lines.push(`};`);
    return lines.join("\n");
}
