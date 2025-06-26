#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { run, ZgRunOptions, RawSchema } from "@tsmk/zg";
import path from "path";
import { glob } from "glob";
import { pathToFileURL } from "node:url";

export function parseArgs(argv: string[]) {
  return yargs(argv)
    .option("schemas", {
      alias: "s",
      type: "string",
      description: "A glob pattern to find schema definition files.",
      demandOption: true,
    })
    .option("output", {
      alias: "o",
      type: "string",
      description: "Directory to write the generated files.",
      demandOption: true,
    })
    .option("flatc", {
      type: "string",
      description:
        "Path to the flatc compiler. Defaults to searching the system PATH.",
    })
    .help()
    .parse();
}

export async function main() {
  const argv = await parseArgs(hideBin(process.argv));

  try {
    const outputDir = path.resolve(process.cwd(), argv.output);
    const schemaFiles = await glob(argv.schemas, {
      absolute: true,
      cwd: process.cwd(),
    });

    if (schemaFiles.length === 0) {
      console.error(`❌ No schema files found matching glob: ${argv.schemas}`);
      process.exit(1);
    }

    console.log(`🔎 Found ${schemaFiles.length} schema files...`);

    const allSchemas: RawSchema[] = [];
    for (const file of schemaFiles) {
      // On Windows, dynamic import needs a file:// URL.
      const fileUrl = pathToFileURL(file).href;
      const module = await import(fileUrl);
      // We expect a named export 'schemas' which is an array of RawSchema
      if (Array.isArray(module.schemas)) {
        // TODO: Add validation to ensure the objects in the array match RawSchema structure
        allSchemas.push(...module.schemas);
      } else {
        console.warn(
          `⚠️ No 'schemas' array export found in ${file}. Skipping.`
        );
      }
    }

    if (allSchemas.length === 0) {
      console.error(`❌ No schemas discovered in the found files.`);
      process.exit(1);
    }

    console.log(`Found ${allSchemas.length} schemas to process...`);

    const logger = {
      log: console.log,
      error: console.error,
    };

    await run({
      schemas: allSchemas,
      outputDir,
      logger,
      flatcPath: argv.flatc,
    });
  } catch (error) {
    console.error("❌ An unexpected error occurred:");
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// This allows the script to be run directly and also be imported for testing.
if (process.env.VITEST === undefined) {
  main();
}
