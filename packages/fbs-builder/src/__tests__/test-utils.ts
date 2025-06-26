import path from "node:path";
import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { expect } from "vitest";

const execAsync = promisify(exec);

/**
 * A testing utility that runs the `flatc` compiler against a generated schema.
 * It handles the creation of temporary directories, writing schema files (including dependencies),
 * executing `flatc`, and cleaning up afterwards.
 *
 * @param schema The main FlatBuffers schema content to test.
 * @param schemaFilename The filename for the main schema (e.g., "my_schema.fbs").
 * @param includeFiles A map where keys are filenames (e.g., "dependency.fbs") and
 *                     values are the content of those files.
 */
export async function runFlatc(
  schema: string,
  schemaFilename: string,
  includeFiles: Map<string, string> = new Map()
): Promise<void> {
  const uniqueId = `${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  const tempDir = path.join(__dirname, `temp_flatc_${uniqueId}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Write all dependency files
    for (const [filename, content] of includeFiles.entries()) {
      await fs.writeFile(path.join(tempDir, filename), content);
    }

    // Write the main schema file
    const schemaPath = path.join(tempDir, schemaFilename);
    await fs.writeFile(schemaPath, schema);

    // Run flatc, pointing to the temp directory for includes
    const flatcCmd = `flatc --ts --include-prefix . -o "${tempDir}" "${schemaPath}"`;
    const { stderr } = await execAsync(flatcCmd, { cwd: tempDir });

    // A valid schema should not produce any errors on stderr
    expect(stderr).toBe("");
  } catch (e: any) {
    // If the command itself fails, we print the details and fail the test.
    console.error("flatc compilation failed:", e.stdout, e.stderr);
    throw e;
  } finally {
    // Clean up the temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
