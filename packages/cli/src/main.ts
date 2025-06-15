#!/usr/bin/env node
// ===================================================================
// src/main.ts
// ===================================================================
import { program } from "commander";
import path from "path";
import fs from "fs/promises";
import { loadConfig } from "./config-loader.js";
import { generateFbsSchema } from "./codegen/fbs-generator.js";
import { runFlatc } from "./codegen/flatc-runner.js";
import { generateSerializer } from "./codegen/serializer-generator.js";
import { generateIndex } from "./codegen/index-generator.js"; // New import

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
    "Path to the output directory for the generated client",
    "./src/dist/graph"
  )
  .action(async (options) => {
    console.log(`Starting build from ${options.config}...`);
    const outputDir = path.resolve(process.cwd(), options.output);

    // Define paths for all generated files
    const fbsPath = path.join(outputDir, "_schema.fbs");
    const serializerPath = path.join(outputDir, "generated-serializers.ts");
    const schemaDestPath = path.join(outputDir, "graph-schema.ts"); // Renamed
    const indexPath = path.join(outputDir, "index.ts"); // New

    try {
      // 1. Load the user's graph configuration
      const config = await loadConfig(options.config);

      // 2. Ensure the output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // 3. Copy the user's config to the output dir, renaming it for clarity
      await fs.copyFile(
        path.resolve(process.cwd(), options.config),
        schemaDestPath
      );
      console.log(`✅ Graph schema copied to ${schemaDestPath}`);

      // 4. Generate and write the FlatBuffers schema (.fbs) file
      const fbsSchema = generateFbsSchema(config);
      await fs.writeFile(fbsPath, fbsSchema, "utf8");
      console.log("✅ FlatBuffers schema (.fbs) generated.");

      // 5. Run the flatc compiler to generate TS files from the .fbs schema
      await runFlatc(outputDir, fbsPath);
      console.log("✅ flatc compiler executed successfully.");

      // 6. Generate and write the type-safe serializer/deserializer code
      const serializerCode = generateSerializer(config);
      await fs.writeFile(serializerPath, serializerCode, "utf8");
      console.log(`✅ Type-safe serializers generated at ${serializerPath}`);

      // 7. Generate and write the main index.ts file for re-exports
      const indexCode = generateIndex();
      await fs.writeFile(indexPath, indexCode, "utf8");
      console.log(`✅ Main index file generated at ${indexPath}`);

      console.log(
        `\n🎉 Build complete! Your graph client is ready at ${outputDir}`
      );
    } catch (error) {
      console.error("\n❌ Build failed:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
