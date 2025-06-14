/**
 * @file src/codegen/serializer-generator.ts
 * @description Generates the type-safe FlatBuffers serializers and data interfaces.
 */
import { Schema } from "./utils.js";
export declare function generateSerializer(schema: Schema): string;
