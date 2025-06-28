import { defineConfig } from "vite";
import { resolve } from "path";
import { glob } from "glob";
import { fileURLToPath } from "node:url";
import { zgdb } from "@zgdb/vite-plugin";

// Recreate __dirname for ES module scope
const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    zgdb({
      schema: resolve(__dirname, "src/schema/index.ts"),
      output: resolve(__dirname, "src/schema/__generated__/createDB.js"),
    }),
  ],
  build: {
    outDir: "dist",
    lib: {
      entry: resolve(__dirname, "src/schema/index.ts"),
      name: "zg-playground",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["zod", "@zgdb/generate"],
    },
    manifest: false,
  },
  test: {
    // Vitest configuration options go here
  },
});
