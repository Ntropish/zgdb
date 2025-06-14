#!/usr/bin/env node
// --- src/main.ts ---
import { program } from "commander";
import path from "path";
import fs from "fs/promises";
import { loadConfig } from "./config-loader.js";
import { processSchema } from "./schema-processor.js";
import { generateFbs } from "./codegen/fbs-generator.js";
import { runFlatc } from "./codegen/flatc-runner.js";
import { generateClient } from "./codegen/ts-generator.js";

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
    const outputDir = path.resolve(process.cwd(), options.output);
    const tempFbsPath = path.join(outputDir, "_schema.fbs");

    try {
      // 1. Load and process the user's graph configuration
      const config = await loadConfig(options.config);
      const processedSchema = processSchema(config.schema);
      console.log("✅ Schema loaded and processed.");

      // 2. Generate the FlatBuffers schema (.fbs) string
      const fbsSchema = generateFbs(processedSchema);
      console.log("✅ FlatBuffers schema generated in memory.");

      // 3. Ensure output directory exists and write temporary .fbs file
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(tempFbsPath, fbsSchema, "utf8");
      console.log(`✅ Temporary FBS schema written to ${tempFbsPath}`);

      // 4. Run the flatc compiler on the .fbs file
      await runFlatc(outputDir, tempFbsPath);
      console.log("✅ flatc compiler executed successfully.");

      // 5. Generate the final TypeScript client
      await generateClient(outputDir, processedSchema);
      console.log("✅ TypeScript client generated.");

      console.log(
        `\n🎉 Build complete! Your graph client is ready at ${outputDir}`
      );
    } catch (error) {
      console.error("\n❌ Build failed:", error);
      process.exit(1);
    } finally {
      // 6. Clean up the temporary FBS file
      try {
        await fs.unlink(tempFbsPath);
        console.log("✅ Temporary files cleaned up.");
      } catch (cleanupError) {
        // This is not a fatal error
      }
    }
  });

program.parse(process.argv);
