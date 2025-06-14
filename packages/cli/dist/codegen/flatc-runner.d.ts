/**
 * Executes the `flatc` compiler as a child process.
 * @param outputDir The directory where the generated TS file will be placed.
 * @param fbsPath The path to the temporary .fbs schema file.
 */
export declare function runFlatc(outputDir: string, fbsPath: string): Promise<void>;
