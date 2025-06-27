#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { run } from "@tsmk/zg";
import path from "path";
import { pathToFileURL } from "node:url";
import { promises as fs } from "fs";

export function parseArgs(argv: string[]) {
  return yargs(argv)
    .option("schema", {
      alias: "s",
      type: "string",
      description: "Path to the schema configuration file.",
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
    const schemaConfigFile = path.resolve(process.cwd(), argv.schema);

    try {
      await fs.access(schemaConfigFile);
    } catch {
      console.error(`❌ Schema config file not found at: ${schemaConfigFile}`);
      process.exit(1);
    }

    console.log(`🔎 Loading schema config from ${schemaConfigFile}...`);

    // On Windows, dynamic import needs a file:// URL.
    const fileUrl = pathToFileURL(schemaConfigFile).href;
    const module = await import(fileUrl);

    if (!module.default) {
      console.error(
        `❌ No default export found in ${schemaConfigFile}. Please export your schema configuration as the default export.`
      );
      process.exit(1);
    }

    const schemaConfig = module.default;

    console.log(`Schema config loaded successfully.`);

    const logger = {
      log: console.log,
      error: console.error,
    };

    await run({
      config: schemaConfig,
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
