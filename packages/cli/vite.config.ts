import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: "src/index.ts",
      name: "zg-cli",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    outDir: "dist",
    rollupOptions: {
      // Don't bundle dependencies
      external: [
        "path",
        "fs",
        "child_process",
        "util",
        "yargs/helpers",
        "yargs/yargs",
        "@tsmk/zg",
        "glob",
      ],
    },
  },
  plugins: [dts()],
  // Vitest configuration will go here later
  test: {},
});
