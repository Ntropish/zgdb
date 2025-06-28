#!/usr/bin/env node
import { program } from "commander";
import path from "path";
import { pathToFileURL } from "node:url";
import { promises as fs } from "fs";
import ora from "ora";
import zg from "@tsmk/zg";

export function parseArgs(argv: string[]) {
  program
    .name("zg")
    .description("The ZG Command Line Interface")
    .version("1.0.0");

  program
    .command("build")
    .description("Builds the ZG schema and generates the client.")
    .option(
      "-s, --schema <path>",
      "Path to the ZG schema entry file.",
      "./src/index.ts"
    )
    .option(
      "-o, --output <path>",
      "Path to the output directory.",
      "./zg-output"
    )
    .option("--flatc <path>", "Optional path to the flatc compiler.")
    .action(
      async (options: { schema: string; output: string; flatc?: string }) => {
        console.log("🚀 Starting ZG build process...");

        try {
          const schemaPath = path.resolve(process.cwd(), options.schema);
          const outputDir = path.resolve(process.cwd(), options.output);

          const loadingSpinner = ora(
            `Loading schema from ${schemaPath}...`
          ).start();

          let schemaConfig;
          try {
            // Check if the file exists before trying to import it.
            await fs.access(schemaPath);
            const schemaPathWithProtocol = pathToFileURL(schemaPath).toString();
            const module = await import(schemaPathWithProtocol);
            schemaConfig = module.default;
            if (!schemaConfig || !schemaConfig.entities) {
              throw new Error(
                "Schema file loaded, but it does not have a valid default export."
              );
            }
            loadingSpinner.succeed("Schema loaded successfully.");
          } catch (e: any) {
            loadingSpinner.fail("Failed to load schema.");
            console.error(e.message);
            process.exit(1);
          }

          const buildSpinner = ora("Building schema and client...").start();
          try {
            await zg.generate({ schema: schemaConfig, outputDir });
            buildSpinner.succeed("Build complete!");
          } catch (e: any) {
            // The logger inside buildSchema should have already failed the spinner.
            if (buildSpinner.isSpinning) {
              buildSpinner.fail("Build failed.");
            }
            console.error(e.message);
            process.exit(1);
          }
        } catch (e: any) {
          console.error(`❌ An unexpected error occurred: ${e.message}`);
          process.exit(1);
        }
      }
    );

  program.parse(argv);
}

// This allows the script to be run directly and also be imported for testing.
if (process.env.VITEST === undefined) {
  parseArgs(process.argv);
}
