#!/usr/bin/env node
import { program } from "commander";
import path from "path";
import fs from "fs/promises";
import { loadConfig } from "./config-loader.js";
import { generateFbs } from "./codegen/fbs-generator.js";
// We will uncomment these as we build them
// import { runFlatc } from './codegen/flatc-runner.js';
// import { generateClient } from './codegen/ts-generator.js';

program
  .command("build")
  .description("Build the graph client from your schema file.")
  .option(
    "-c, --config <path>",
    "Path to the graph config file",
    "graph.config.ts"
  )
  .option(
    "-o, --output <path>",
    "Path to the output directory for the generated client",
    "./src/generated/graph"
  )
  .action(async (options) => {
    console.log(`Starting build from ${options.config}...`);

    try {
      // 1. Load the user's graph configuration
      const config = await loadConfig(options.config);
      console.log("✅ Config loaded successfully.");

      // 2. Generate the FlatBuffers schema (.fbs) from the config
      const fbsSchema = generateFbs(config.schema);
      console.log("✅ FlatBuffers schema generated.");

      // For now, let's just print the generated schema to see our progress.
      // In the next step, we'll write this to a file and run flatc.
      console.log("\n--- Generated FBS ---");
      console.log(fbsSchema);
      console.log("--- End Generated FBS ---\n");

      const outputDir = path.resolve(process.cwd(), options.output);
      // await fs.mkdir(outputDir, { recursive: true });
      // TODO: Add steps for flatc and ts generation here

      console.log(
        "Build process initiated. Next step: run flatc and generate client."
      );
    } catch (error) {
      console.error("Build failed:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
