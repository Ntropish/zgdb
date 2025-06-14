// --- src/config-loader.ts ---
import path from "path";
import fs from "fs/promises";
import { transpile, ModuleKind } from "typescript";

/**
 * Dynamically imports a module by its path, bypassing the require cache.
 * @param modulePath The absolute path to the module.
 * @returns The default export of the module.
 */
async function importFresh(modulePath: string) {
  const cacheBuster = `?update=${Date.now()}`;
  // Use file:// protocol for ESM dynamic import
  const fileUrl = "file:///" + modulePath.replace(/\\/g, "/");
  return (await import(fileUrl + cacheBuster)).default;
}

/**
 * Finds, transpiles, and loads the user's graph.config.ts file.
 * @param configPath The relative path to the configuration file.
 * @returns The validated configuration object.
 */
export async function loadConfig(configPath: string) {
  const absoluteConfigPath = path.resolve(process.cwd(), configPath);

  try {
    await fs.access(absoluteConfigPath);
  } catch {
    throw new Error(`Could not find config file at: ${absoluteConfigPath}`);
  }

  const fileContent = await fs.readFile(absoluteConfigPath, "utf8");

  // Transpile TS to JS in memory
  const transpiledCode = transpile(fileContent, {
    module: ModuleKind.ESNext,
  });

  // Write to a temporary .mjs file to ensure it's treated as an ES module
  const tempPath = absoluteConfigPath + `.${Date.now()}.mjs`;
  await fs.writeFile(tempPath, transpiledCode);

  try {
    const config = await importFresh(tempPath);
    // TODO: Add more robust validation logic here.
    if (
      !config ||
      !config.schema ||
      !config.schema.nodes ||
      !config.schema.edges
    ) {
      throw new Error(
        "Invalid config file: must have a default export with a `schema` property containing `nodes` and `edges`."
      );
    }
    return config;
  } finally {
    // Cleanup the temporary file
    await fs.unlink(tempPath);
  }
}
