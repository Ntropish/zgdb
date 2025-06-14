import { ProcessedSchema } from "../schema-processor.js";
/**
 * Generates the final user-facing client.ts file.
 * @param outputDir The directory to write the file to.
 * @param schema The processed schema from the config.
 */
export declare function generateClient(outputDir: string, schema: ProcessedSchema): Promise<void>;
