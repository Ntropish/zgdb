// --- src/codegen/flatc-runner.ts ---
import { spawn } from "child_process";

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
      "--gen-all", // Generate all necessary files and helpers
      "--ts-entry-points", // Create a single entry point file
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
        const errorMsg = `flatc compiler failed with exit code ${code}.\nDetails:\n${stderr}`;
        reject(new Error(errorMsg));
      }
    });

    flatcProcess.on("error", (err) => {
      reject(
        new Error(
          `Failed to spawn 'flatc' process. Make sure 'flatc' is installed and in your PATH. Error: ${err.message}`
        )
      );
    });
  });
}
