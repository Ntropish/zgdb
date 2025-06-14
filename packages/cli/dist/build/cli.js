#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
// This script is a wrapper. Its only job is to re-spawn the main
// application logic with the correct experimental Node.js flags.
// Construct the path to the actual main script.
// __dirname is the directory where this script (cli.js) is located.
const mainScriptPath = (0, path_1.join)(__dirname, "build/main.js");
// Get all the arguments passed to this script (e.g., 'build', '--config', ...),
// skipping the first two (which are 'node' and 'cli.js').
const args = process.argv.slice(2);
// Spawn the new Node.js process.
const child = (0, child_process_1.spawn)("node", [
    "--experimental-wasm-modules", // The flag we need
    mainScriptPath, // The script to run
    ...args, // Pass along all original arguments
], {
    // This ensures that the output (stdout, stderr) of the child process
    // is piped to our current terminal.
    stdio: "inherit",
});
// Listen for the child process to exit and exit with the same code.
child.on("exit", (code) => {
    process.exit(code === null ? 1 : code);
});
