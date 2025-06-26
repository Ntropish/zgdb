import { run } from "../index.js";
import { RawSchema } from "../parser/types.js";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { toMatchSpecificSnapshot } from "jest-specific-snapshot";

expect.extend({ toMatchSpecificSnapshot: toMatchSpecificSnapshot as any });

const TEST_OUTPUT_DIR = path.join(__dirname, "zg-output");

describe("ZG End-to-End Test", () => {
  beforeAll(async () => {
    // Clean up previous runs
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    // Clean up test files
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it("should run the full pipeline and generate all contract files correctly", async () => {
    const TestSchema: RawSchema = {
      name: "TestEntity",
      schema: z.object({
        id: z.string(),
        value: z.number(),
      }),
    };

    await run([TestSchema], TEST_OUTPUT_DIR);

    // 1. Check that all files were created
    const fbsPath = path.join(TEST_OUTPUT_DIR, "schema.fbs");
    const generatedTsPath = path.join(TEST_OUTPUT_DIR, "schema_generated.ts");
    const zgTsPath = path.join(TEST_OUTPUT_DIR, "schema.zg.ts");

    await expect(fs.access(fbsPath)).resolves.toBeUndefined();
    await expect(fs.access(generatedTsPath)).resolves.toBeUndefined();
    await expect(fs.access(zgTsPath)).resolves.toBeUndefined();

    // 2. Check the content of the high-level client file
    const zgFileContent = await fs.readFile(zgTsPath, "utf-8");
    const snapshotPath = path.join(
      __dirname,
      "__snapshots__",
      "e2e.zg.ts.snap"
    );
    expect(zgFileContent).toMatchSpecificSnapshot(snapshotPath);
  });
});
