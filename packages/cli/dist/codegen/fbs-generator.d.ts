import { ProcessedSchema } from "../schema-processor.js";
/**
 * Generates the full FlatBuffers schema (.fbs) file content as a string.
 * @param schema The processed schema object.
 * @returns The .fbs schema as a string.
 */
export declare function generateFbs(schema: ProcessedSchema): string;
