import { NormalizedSchema } from "../parser/types.js";

export interface GeneratorConfig {
  schemas: NormalizedSchema[];
  outputDirectory: string;
  options: {
    /**
     * The file extension to use for the generated import of the FlatBuffers schema.
     * E.g., '.js', '.mjs', or an empty string.
     * @default ".js"
     */
    importExtension?: string;
  };
}
