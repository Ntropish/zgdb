import { defineConfig } from "vite";
import { resolve } from "path";
import { glob } from "glob";
import { fileURLToPath } from "node:url";

// Recreate __dirname for ES module scope
const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    lib: {
      entry: resolve(__dirname, "src/schema/index.ts"),
      name: "zg-playground",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["zod", "@tsmk/zg"],
    },
    manifest: false,
  },
});
