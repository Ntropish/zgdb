import { readFile } from "fs/promises";
import { fileURLToPath } from "url";

export async function load(url, context, defaultLoad) {
  if (url.endsWith(".wasm")) {
    const wasmPath = fileURLToPath(url);
    const wasmSource = await readFile(wasmPath);
    return {
      format: "wasm",
      source: wasmSource,
    };
  }

  // Let tsx handle all other file types
  return defaultLoad(url, context, defaultLoad);
}
