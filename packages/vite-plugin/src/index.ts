import { generate } from "@zgdb/generate";
import path from "path";
import { Plugin, normalizePath } from "vite";
import { build } from "esbuild";

export interface ZgVitePluginOptions {
  schema: string;
  output: string;
}

export function zgdb(options: ZgVitePluginOptions): Plugin {
  const { schema, output } = options;
  const outputDir = path.dirname(output);
  const schemaFiles = new Set<string>();

  async function runGenerator() {
    try {
      console.log("Running ZGDB generator...");

      const buildResult = await build({
        entryPoints: [schema],
        bundle: true,
        write: false,
        platform: "node",
        format: "esm",
        metafile: true,
      });

      schemaFiles.clear();
      Object.keys(buildResult.metafile.inputs).forEach((file) => {
        schemaFiles.add(normalizePath(path.resolve(file)));
      });

      const [outputFile] = buildResult.outputFiles;
      const dataUri = `data:text/javascript;base64,${Buffer.from(
        outputFile.contents
      ).toString("base64")}`;

      const { entities } = await import(dataUri);

      await generate({
        schema: { entities },
        outputDir: outputDir,
        options: { importExtension: ".js" },
      });
      console.log("ZGDB generator finished.");
    } catch (error) {
      console.error("ZGDB generator error:", error);
    }
  }

  return {
    name: "vite-plugin-zgdb",
    async buildStart() {
      await runGenerator();
      for (const file of schemaFiles) {
        this.addWatchFile(file);
      }
    },
    async handleHotUpdate({ file, server }) {
      if (schemaFiles.has(normalizePath(file))) {
        console.log(`Schema file changed: ${file}. Regenerating...`);
        await runGenerator();
        server.ws.send({
          type: "full-reload",
          path: "*",
        });
        return [];
      }
    },
  };
}
