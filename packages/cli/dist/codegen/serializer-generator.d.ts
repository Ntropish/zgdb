/**
 * @file src/codegen/serializer-generator.ts
 * @description Generates the FlatBuffers serializer/deserializer class.
 */
import { Schema } from "./utils.js";
export declare function generateSerializer(schema: Schema): string;
