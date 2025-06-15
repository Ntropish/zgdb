#!/usr/bin/env node
// ===================================================================
// packages/cli/src/main.ts (Updated for new architecture)
// ===================================================================
import { program } from "commander";
import path from "path";
import fs from "fs/promises";
import { loadConfig } from "./config-loader.js";
import { generateFbsSchema } from "./codegen/fbs-generator.js";
import { runFlatc } from "./codegen/flatc-runner.js";
import { generateSerializer } from "./codegen/serializer-generator.js";
import { generateMutationHelpers } from "./codegen/mutation-helpers-generator.js";
import { generateTypes } from "./codegen/type-generator.js"; // New
import { generateClient } from "./codegen/client-generator.js";
import { generateIndex } from "./codegen/index-generator.js";

const __dirname = import.meta.dirname;

program
  .command("build")
  .description("Build the graph client and serializers from your schema file.")
  .option(
    "-c, --config <path>",
    "Path to the graph config file",
    "graph.config.ts"
  )
  .option(
    "-o, --output <path>",
    "Path to the output directory",
    "./src/dist/graph"
  )
  .action(async (options) => {
    console.log(`Starting build from ${options.config}...`);
    const outputDir = path.resolve(process.cwd(), options.output);

    // Define paths for all generated files
    const serializerPath = path.join(outputDir, "generated-serializers.ts");
    const typesPath = path.join(outputDir, "generated-types.ts"); // New
    const mutationHelpersPath = path.join(outputDir, "mutation-helpers.ts");
    const clientPath = path.join(outputDir, "zgdb-client.ts");
    const schemaDestPath = path.join(outputDir, "graph-schema.ts");
    const indexPath = path.join(outputDir, "index.ts");
    const fbsPath = path.join(outputDir, "_schema.fbs");

    try {
      const config = await loadConfig(options.config);
      await fs.mkdir(outputDir, { recursive: true });

      // Copy the original schema file
      await fs.copyFile(
        path.resolve(process.cwd(), options.config),
        schemaDestPath
      );
      console.log(`✅ Graph schema copied to ${schemaDestPath}`);

      // Generate FBS from schema and run flatc to compile it
      const fbsSchema = generateFbsSchema(config);
      await fs.writeFile(fbsPath, fbsSchema, "utf8");
      await runFlatc(outputDir, fbsPath);
      console.log("✅ FlatBuffers schema compiled.");

      // Generate Serializers
      const serializerCode = generateSerializer(config);
      await fs.writeFile(serializerPath, serializerCode, "utf8");
      console.log(`✅ Type-safe serializers generated.`);

      // Generate Types (NodeDataTypeMap)
      const typesCode = generateTypes(config); // New
      await fs.writeFile(typesPath, typesCode, "utf8"); // New
      console.log(`✅ Node data types generated.`); // New

      // Generate Mutation Helpers
      const mutationHelpersCode = generateMutationHelpers(config);
      await fs.writeFile(mutationHelpersPath, mutationHelpersCode, "utf8");
      console.log(`✅ Mutation helpers generated.`);

      // Generate the thin ZGDB Client
      const clientCode = generateClient(); // Updated: no longer needs config
      await fs.writeFile(clientPath, clientCode, "utf8");
      console.log(`✅ Store-agnostic client generated.`);

      // Generate main index file to export everything
      const indexCode = generateIndex();
      await fs.writeFile(indexPath, indexCode, "utf8");
      console.log(`✅ Main index file generated.`);

      console.log(
        `\n🎉 Build complete! Your graph client is ready at ${outputDir}`
      );
    } catch (error) {
      console.error("\n❌ Build failed:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
