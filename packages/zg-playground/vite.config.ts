import { defineConfig } from "vite";
import { resolve } from "path";
import { glob } from "glob";

// Find all .ts files in the src/schema directory, which will be our entry points
const entryPoints = glob
  .sync("src/schema/**/*.ts")
  .map((file) => resolve(__dirname, file));

export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: entryPoints,
      preserveEntrySignatures: "strict",
      output: {
        // preserveModules will ensure the directory structure is kept
        preserveModules: true,
        // dir is the output directory
        dir: "dist",
        // format is es module
        format: "es",
      },
      external: ["zod", "@tsmk/zg"],
    },
  },
});
