/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "@tsmk/zg",
      fileName: "index",
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["fs", "path", "child_process", "util"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {},
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
