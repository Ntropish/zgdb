import { generate } from "@zgdb/generate";
import path from "path";
import { Plugin } from "vite";

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
      await generate({
        schema: {
          // @ts-ignore
          entities: (await import(schema)).entities,
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
