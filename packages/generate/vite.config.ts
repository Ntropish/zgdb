/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "@zgdb/generate",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["fs", "path", "child_process", "util"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          fs: "fs",
          path: "path",
          child_process: "child_process",
          util: "util",
          ejs: "ejs",
          zod: "zod",
          "zod-to-json-schema": "zod-to-json-schema",
        },
      },
    },
  },
  plugins: [dts()],
  test: {
    globals: true,
    environment: "node",
    ui: true,
  },
});
