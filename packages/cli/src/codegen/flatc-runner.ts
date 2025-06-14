// --- src/codegen/flatc-runner.ts ---
import { spawn } from "child_process";
import path from "path";

/**
 * Executes the `flatc` compiler as a child process.
 * @param outputDir The directory where the generated TS file will be placed.
 * @param fbsPath The path to the temporary .fbs schema file.
 */
export function runFlatc(outputDir: string, fbsPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Arguments for the flatc command
    const args = [
      "-T", // Generate TypeScript
      "-o",
      outputDir, // Output directory
      "--gen-all", // Generate all necessary files
      fbsPath, // The input schema file
    ];

    const flatcProcess = spawn("flatc", args, { stdio: "pipe" });

    let stderr = "";
    flatcProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    flatcProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const errorMsg = `flatc compiler failed with exit code ${code}.
        Please ensure 'flatc' is installed and available in your system's PATH.
        You can download it from the official FlatBuffers repository:
        https://github.com/google/flatbuffers/releases

        Stderr:
        ${stderr}`;
        reject(new Error(errorMsg));
      }
    });

    flatcProcess.on("error", (err) => {
      const errorMsg = `Failed to spawn 'flatc' process.
        Please ensure 'flatc' is installed and available in your system's PATH.
        Error: ${err.message}`;
      reject(new Error(errorMsg));
    });
  });
}
