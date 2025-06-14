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
import { generateSerializer } from "./codegen/serializer-generator.js"; // New import

const __dirname = import.meta.dirname;
console.log("__dirname", __dirname);

const cliDir = path.resolve(__dirname, "..");
console.log("cliDir", cliDir);

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
    "./src/dist/graph" // Matching your original output directory
  )
  .action(async (options) => {
    console.log(`Starting build from ${options.config}...`);
    const outputDir = path.resolve(process.cwd(), options.output);
    const fbsPath = path.join(outputDir, "_schema.fbs");
    const serializerPath = path.join(outputDir, "generated-serializers.ts");
    const interfacesPath = path.join(outputDir, "interfaces.ts");

    const srcDir = path.resolve(cliDir, "./src");

    console.log("SOURCE", srcDir);

    try {
      const config = await loadConfig(options.config);

      const fbsSchema = generateFbsSchema(config);
      console.log("✅ FlatBuffers schema generated in memory.");

      await fs.mkdir(outputDir, { recursive: true });

      const userConfigDestPath = path.join(outputDir, "graph.config.ts");
      await fs.copyFile(
        path.resolve(process.cwd(), options.config),
        userConfigDestPath
      );
      console.log(`✅ Graph config copied to ${userConfigDestPath}`);

      await fs.copyFile(path.join(srcDir, "interfaces.ts"), interfacesPath);
      console.log(`✅ Interfaces copied to ${interfacesPath}`);

      await fs.writeFile(fbsPath, fbsSchema, "utf8");
      await runFlatc(outputDir, fbsPath);
      console.log("✅ flatc compiler executed successfully.");

      // --- New Step: Generate Serializer ---
      const serializerCode = generateSerializer(config);
      await fs.writeFile(serializerPath, serializerCode, "utf8");
      console.log(`✅ Serializer class generated at ${serializerPath}`);
      // ------------------------------------

      console.log(
        `\n🎉 Build complete! Your graph client is ready at ${outputDir}`
      );
    } catch (error) {
      console.error("\n❌ Build failed:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
