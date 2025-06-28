import { generate } from "@zgdb/generate";
import path from "path";
import { pathToFileURL } from "url";
import { Plugin } from "vite";
import { build } from "esbuild";

export interface ZgVitePluginOptions {
  schema: string;
  output: string;
}

export function zgdb(options: ZgVitePluginOptions): Plugin {
  const { schema, output } = options;
  const outputDir = path.dirname(output);

  async function runGenerator() {
    try {
      console.log("Running ZGDB generator...");

      const buildResult = await build({
        entryPoints: [schema],
        bundle: true,
        write: false,
        platform: "node",
        format: "esm",
      });

      const [outputFile] = buildResult.outputFiles;
      const dataUri = `data:text/javascript;base64,${Buffer.from(
        outputFile.contents
      ).toString("base64")}`;

      await generate({
        schema: {
          entities: (await import(dataUri)).entities,
        },
        outputDir,
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
      this.addWatchFile(schema);
    },
  };
}
