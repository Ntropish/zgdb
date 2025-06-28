import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "fs",
        "path",
        "util",
        "child_process",
        "esbuild",
        "flatbuffers",
        "glob",
      ],
      output: {
        globals: {
          fs: "fs",
          path: "path",
          util: "util",
          child_process: "child_process",
        },
      },
    },
  },
  plugins: [dts()],
});
