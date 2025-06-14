import { ProcessedSchema } from "../schema-processor.js";
/**
 * Orchestrates the generation of all user-facing TypeScript files.
 * @param outputDir The directory to write the files to.
 * @param schema The processed schema from the config.
 * @param configPath The original path to the user's config file.
 */
export declare function generateTsClient(outputDir: string, schema: ProcessedSchema, configPath: string): Promise<void>;
