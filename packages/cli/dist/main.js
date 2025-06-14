#!/usr/bin/env node
// --- src/main.ts ---
import { program } from "commander";
import path from "path";
import { loadConfig } from "./config-loader.js";
import { processSchema } from "./schema-processor.js";
import { generateFbs } from "./codegen/fbs-generator.js";
// We will uncomment these as we build them
// import { runFlatc } from './codegen/flatc-runner.js';
// import { generateClient } from './codegen/ts-generator.js';
program
    .command("build")
    .description("Build the graph client from your schema file.")
    .option("-c, --config <path>", "Path to the graph config file", "graph.config.ts")
    .option("-o, --output <path>", "Path to the output directory for the generated client", "./src/generated/graph")
    .action(async (options) => {
    console.log(`Starting build from ${options.config}...`);
    try {
        // 1. Load the user's graph configuration
        const config = await loadConfig(options.config);
        console.log("✅ Config loaded successfully.");
        // 2. Process schema to add canonical names
        const processedSchema = processSchema(config.schema);
        console.log("✅ Schema processed with canonical edge names.");
        // Let's print the processed schema to verify the new names
        console.log("\n--- Processed Schema Edges ---");
        console.log(JSON.stringify(processedSchema.edges, null, 2));
        console.log("--- End Processed Schema Edges ---\n");
        // 3. Generate the FlatBuffers schema (.fbs) from the processed schema
        const fbsSchema = generateFbs(processedSchema);
        console.log("✅ FlatBuffers schema generated.");
        console.log("\n--- Generated FBS ---");
        console.log(fbsSchema);
        console.log("--- End Generated FBS ---\n");
        const outputDir = path.resolve(process.cwd(), options.output);
        // await fs.mkdir(outputDir, { recursive: true });
        // TODO: Add steps for flatc and ts generation here
        console.log("Build process initiated. Next step: run flatc and generate client.");
    }
    catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
});
program.parse(process.argv);
