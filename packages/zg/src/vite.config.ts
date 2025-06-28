import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    target: "node18",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["esbuild", "flatbuffers", "glob"],
    },
  },
  plugins: [dts()],
});
