#!/usr/bin/env node --experimental-wasm-modules
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const generator_1 = require("./generator");
// --- Main CLI Program ---
const program = new commander_1.Command();
program
    .name("zg")
    .description("CLI tool to generate a synchronous graph client from a Zod schema.")
    .version("0.1.0");
program
    .command("build")
    .description("Build the graph client from a configuration file.")
    .option("-c, --config <path>", "Path to the graph configuration file", "graph.config.ts")
    .option("-o, --output <path>", "Path to the output directory for generated files", "./src/generated/graph")
    .action((options) => {
    console.log("Starting zg build...");
    const configPath = path_1.default.resolve(process.cwd(), options.config);
    const outputPath = path_1.default.resolve(process.cwd(), options.output);
    if (!fs_1.default.existsSync(configPath)) {
        console.error(`Error: Configuration file not found at ${configPath}`);
        process.exit(1);
    }
    console.log(`Found config file: ${configPath}`);
    console.log(`Output directory: ${outputPath}`);
    try {
        (0, generator_1.generate)(configPath, outputPath);
        console.log("✅ Build successful!");
    }
    catch (error) {
        console.error("❌ Build failed:");
        console.error(error);
        process.exit(1);
    }
});
program.parse(process.argv);
