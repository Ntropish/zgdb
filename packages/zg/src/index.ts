import {
  RawSchema,
  SchemaConfig,
  EntityDef,
  AuthContext,
} from "./parser/types.js";

import { parseSchemas } from "./parser/index.js";
import { generateFbs } from "./generator/generator.js";
import { generateZgFile } from "./generator/zg-file-generator.js";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

/**
 * Factory function to define the entire application schema.
 * This is the main entry point for a ZG project.
 * @param config - The schema configuration object.
 * @returns The configuration object, which will be consumed by the ZG build process.
 */
export function createSchema<
  TActor,
  const TEntities extends Record<string, EntityDef<TActor>>
>(config: SchemaConfig<TActor, TEntities>) {
  return config;
}

export interface ZgRunLogger {
  log: (message: string) => void;
  error: (message: string) => void;
}

export interface ZgRunOptions {
  /** The schema configuration object from createSchema. */
  config: SchemaConfig<any, any>;
  /** The absolute path to the output directory. */
  outputDir: string;
  /** An optional logger for capturing build output. */
  logger?: ZgRunLogger;
  /** An optional path to the flatc compiler. Defaults to searching the system PATH. */
  flatcPath?: string;
}

/**
 * The main build script for ZG. It orchestrates the entire process
 * from parsing raw schemas to generating the final client code.
 *
 * @param options - The configuration options for the run.
 */
export async function run(options: ZgRunOptions) {
  const {
    config,
    outputDir,
    logger = { log: () => {}, error: () => {} },
    flatcPath = "flatc",
  } = options;

  // --- 1. Ensure output directory exists ---
  await fs.mkdir(outputDir, { recursive: true });

  // --- 2. Parse and Generate FBS content ---
  const normalizedSchemas = parseSchemas(config);
  const fbsContent = await generateFbs(normalizedSchemas);
  const fbsFilePath = path.join(outputDir, "schema.fbs");
  await fs.writeFile(fbsFilePath, fbsContent);
  logger.log(`✅ Successfully generated ${fbsFilePath}`);

  // --- 3. Run flatc to generate low-level accessors ---
  const flatcCommand = `${flatcPath} --ts --gen-onefile -o "${outputDir}" "${fbsFilePath}"`;
  try {
    const { stdout, stderr } = await execPromise(flatcCommand);
    if (stderr) {
      // flatc can write to stderr even on success, so we check for "error"
      if (stderr.toLowerCase().includes("error")) {
        throw new Error(`flatc error: ${stderr}`);
      }
      logger.log(`flatc output:\n${stderr}`);
    }
    if (stdout) {
      logger.log(`flatc output:\n${stdout}`);
    }

    // After running, explicitly check if the file was created.
    const generatedTsPath = path.join(outputDir, "schema_generated.ts");
    const flatcOutputPath = path.join(outputDir, "schema.ts");

    try {
      // flatc generates `schema.ts`, so we check for that and rename it.
      await fs.access(flatcOutputPath);
      await fs.rename(flatcOutputPath, generatedTsPath);
      logger.log(`✅ Successfully compiled FBS to ${generatedTsPath}`);
    } catch {
      const dirContents = await fs.readdir(outputDir);
      logger.error(`Directory contents: [${dirContents.join(", ")}]`);
      throw new Error(
        `flatc ran without throwing but did not produce the expected output file: ${generatedTsPath}`
      );
    }
  } catch (err) {
    let errorMessage = "An unknown error occurred.";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    logger.error(`❌ Error executing flatc.
    Command: ${flatcCommand}
    Error: ${errorMessage}
    Is 'flatc' installed and in your system's PATH?`);
    throw err;
  }

  // --- 4. Generate and write the high-level ZG client file ---
  const zgClientContent = generateZgFile(normalizedSchemas);
  const zgFilePath = path.join(outputDir, "schema.zg.ts");
  await fs.writeFile(zgFilePath, zgClientContent);
  logger.log(`✅ Successfully generated high-level client at ${zgFilePath}`);

  logger.log("\n🎉 ZG build process complete!");
}

export type { RawSchema, SchemaConfig, EntityDef, AuthContext };
