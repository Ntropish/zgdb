import { ProcessedSchema } from "../schema-processor.js";
/**
 * Orchestrates the generation of all user-facing TypeScript files.
 * @param outputDir The directory to write the files to.
 * @param schema The processed schema from the config.
 */
export declare function generateTsClient(outputDir: string, schema: ProcessedSchema): Promise<void>;
