#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { run } from "@tsmk/zg";
import path from "path";
import { ZodObject } from "zod";

interface RawSchema {
  name: string;
  schema: ZodObject<any, any, any>;
}

export function parseArgs(argv: string[]) {
  return yargs(argv)
    .option("schemas", {
      alias: "s",
      type: "string",
      description: "Path to the schema definition file",
      demandOption: true,
    })
    .option("output", {
      alias: "o",
      type: "string",
      description: "Directory to write the generated files",
      demandOption: true,
    })
    .help()
    .parse();
}

export async function main_for_testing() {
  const argv = await parseArgs(hideBin(process.argv));

  try {
    const schemasPath = path.resolve(process.cwd(), argv.schemas);
    const outputDir = path.resolve(process.cwd(), argv.output);

    console.log(`🔎 Loading schemas from: ${schemasPath}`);

    // Dynamically import the user's schema file
    const schemaModule = await import(schemasPath);

    // Discover exported schemas in the module
    const rawSchemas: RawSchema[] = Object.entries(schemaModule)
      .filter(([, value]) => value instanceof ZodObject)
      .map(([name, schema]) => ({
        name,
        schema: schema as ZodObject<any, any, any>,
      }));

    if (rawSchemas.length === 0) {
      console.error(`❌ No Zod schemas found in ${schemasPath}`);
      process.exit(1);
    }

    console.log(`Found ${rawSchemas.length} schemas to process...`);

    const logger = {
      log: console.log,
      error: console.error,
    };

    await run(rawSchemas, outputDir, logger);
  } catch (error) {
    console.error("❌ An unexpected error occurred:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// This allows the script to be run directly and also be imported for testing.
if (process.env.VITEST === undefined) {
  main_for_testing();
}
