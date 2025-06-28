import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "@zgdb/vite-plugin",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "zod",
        "@zgdb/generate",
        "fs",
        "path",
        "child_process",
        "util",
        "url",
        "esbuild",
      ],
    },
  },
  define: {
    __filename: JSON.stringify(import.meta.url),
    __dirname: JSON.stringify("."),
  },
  plugins: [dts()],
});
