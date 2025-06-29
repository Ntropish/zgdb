import { resolve } from "path";
import { defineConfig, ViteDevServer } from "vite";
import dts from "vite-plugin-dts";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

// Define paths for FlatBuffers
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fbsDir = resolve(__dirname, "schema");
const generatedDir = resolve(__dirname, "src", "generated");
const schemaFile = resolve(fbsDir, "node.fbs");

const compileFlatBuffers = () => {
  try {
    const command = `flatc --ts -o ${generatedDir} --gen-all ${schemaFile}`;
    execSync(command, { stdio: "inherit" });
    console.log("FlatBuffers compilation successful.");
  } catch (error) {
    console.error("Error compiling FlatBuffers:", error);
    // We don't throw here in watch mode to avoid stopping the dev server.
  }
};

// Custom plugin to run flatc
const flatcPlugin = {
  name: "flatc",
  buildStart: () => {
    compileFlatBuffers();
  },
  configureServer: (server: ViteDevServer) => {
    server.watcher.add(schemaFile);
    server.watcher.on("change", (path: string) => {
      if (path === schemaFile) {
        console.log("FlatBuffer schema changed. Recompiling...");
        compileFlatBuffers();
      }
    });
  },
};

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "@zgdb/prolly-tree",
      fileName: "index",
      formats: ["es", "cjs"],
    },
  },
  plugins: [dts(), flatcPlugin],
});
