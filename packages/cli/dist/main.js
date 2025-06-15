#!/usr/bin/env node
// ===================================================================
// src/main.ts (Updated)
// ===================================================================
import { program } from "commander";
import path from "path";
import fs from "fs/promises";
import { loadConfig } from "./config-loader.js";
import { generateFbsSchema } from "./codegen/fbs-generator.js";
import { runFlatc } from "./codegen/flatc-runner.js";
import { generateSerializer } from "./codegen/serializer-generator.js";
import { generateMutationHelpers } from "./codegen/mutation-helpers-generator.js";
import { generateClient } from "./codegen/client-generator.js"; // New
import { generateIndex } from "./codegen/index-generator.js";
const __dirname = import.meta.dirname;
const cliDir = path.resolve(__dirname, "..");
program
    .command("build")
    .description("Build the graph client and serializers from your schema file.")
    .option("-c, --config <path>", "Path to the graph config file", "graph.config.ts")
    .option("-o, --output <path>", "Path to the output directory", "./src/dist/graph")
    .action(async (options) => {
    console.log(`Starting build from ${options.config}...`);
    const outputDir = path.resolve(process.cwd(), options.output);
    // Define paths
    const serializerPath = path.join(outputDir, "generated-serializers.ts");
    const mutationHelpersPath = path.join(outputDir, "mutation-helpers.ts");
    const clientPath = path.join(outputDir, "zgdb-client.ts"); // New
    const schemaDestPath = path.join(outputDir, "graph-schema.ts");
    const indexPath = path.join(outputDir, "index.ts");
    try {
        const config = await loadConfig(options.config);
        await fs.mkdir(outputDir, { recursive: true });
        // Copy schema
        await fs.copyFile(path.resolve(process.cwd(), options.config), schemaDestPath);
        console.log(`✅ Graph schema copied to ${schemaDestPath}`);
        // Generate FBS and run flatc
        const fbsSchema = generateFbsSchema(config);
        await fs.writeFile(path.join(outputDir, "_schema.fbs"), fbsSchema, "utf8");
        await runFlatc(outputDir, path.join(outputDir, "_schema.fbs"));
        console.log("✅ FlatBuffers schema compiled.");
        // Generate serializers
        const serializerCode = generateSerializer(config);
        await fs.writeFile(serializerPath, serializerCode, "utf8");
        console.log(`✅ Type-safe serializers generated.`);
        // Generate mutation helpers
        const mutationHelpersCode = generateMutationHelpers(config);
        await fs.writeFile(mutationHelpersPath, mutationHelpersCode, "utf8");
        console.log(`✅ Mutation helpers generated.`);
        // Generate Client
        const clientCode = generateClient(config); // New
        await fs.writeFile(clientPath, clientCode, "utf8"); // New
        console.log(`✅ Store-agnostic client generated.`); // New
        // Generate main index file
        const indexCode = generateIndex();
        await fs.writeFile(indexPath, indexCode, "utf8");
        console.log(`✅ Main index file generated.`);
        console.log(`\n🎉 Build complete! Your graph client is ready at ${outputDir}`);
    }
    catch (error) {
        console.error("\n❌ Build failed:", error);
        process.exit(1);
    }
});
program.parse(process.argv);
