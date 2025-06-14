#!/usr/bin/env node --experimental-wasm-modules

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { generate } from "./generator";

// --- Main CLI Program ---

const program = new Command();

program
  .name("zg")
  .description(
    "CLI tool to generate a synchronous graph client from a Zod schema."
  )
  .version("0.1.0");

program
  .command("build")
  .description("Build the graph client from a configuration file.")
  .option(
    "-c, --config <path>",
    "Path to the graph configuration file",
    "graph.config.ts"
  )
  .option(
    "-o, --output <path>",
    "Path to the output directory for generated files",
    "./src/generated/graph"
  )
  .action((options) => {
    console.log("Starting zg build...");

    const configPath = path.resolve(process.cwd(), options.config);
    const outputPath = path.resolve(process.cwd(), options.output);

    if (!fs.existsSync(configPath)) {
      console.error(`Error: Configuration file not found at ${configPath}`);
      process.exit(1);
    }

    console.log(`Found config file: ${configPath}`);
    console.log(`Output directory: ${outputPath}`);

    try {
      generate(configPath, outputPath);
      console.log("✅ Build successful!");
    } catch (error) {
      console.error("❌ Build failed:");
      console.error(error);
      process.exit(1);
    }
  });

program.parse(process.argv);
