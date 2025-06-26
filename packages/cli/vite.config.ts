import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "zg-cli",
      fileName: "index",
      formats: ["es"],
    },
    outDir: "dist",
    rollupOptions: {
      // Don't bundle dependencies
      external: ["yargs/yargs", "yargs/helpers", "@tsmk/zg", "path", "zod"],
    },
  },
  // Vitest configuration will go here later
  test: {},
});
